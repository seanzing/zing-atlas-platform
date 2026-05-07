import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/api-auth";
import { ORG_ID } from "@/lib/constants";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Admin client created inside handler — SUPABASE_SERVICE_ROLE_KEY not available at build time
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await request.json();
    const { email, firstName, lastName, position } = body;

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "email, firstName, and lastName are required" },
        { status: 400 }
      );
    }

    // Invite user via Supabase Auth — redirect to /auth/reset so user can set password
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://zing-atlas-platform-production.up.railway.app";
    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { firstName, lastName },
        redirectTo: `${appUrl}/auth/reset`,
      });

    if (inviteError) {
      logger.error({ err: inviteError }, "Supabase invite error");
      return NextResponse.json(
        { error: inviteError.message },
        { status: 400 }
      );
    }

    const supabaseUserId = inviteData.user?.id ?? null;

    // Upsert TeamMember: if email exists, update; otherwise create
    const existing = await prisma.teamMember.findFirst({
      where: {
        organizationId: ORG_ID,
        email,
        deletedAt: null,
      },
    });

    let member;
    if (existing) {
      member = await prisma.teamMember.update({
        where: { id: existing.id },
        data: {
          firstName,
          lastName,
          position: position || undefined,
          supabaseUserId,
        },
      });
    } else {
      member = await prisma.teamMember.create({
        data: {
          organizationId: ORG_ID,
          firstName,
          lastName,
          email,
          position: position || undefined,
          supabaseUserId,
        },
      });
    }

    return NextResponse.json(
      { success: true, teamMemberId: member.id, ...serialize(member) },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ err: error }, "POST /api/team/invite error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
