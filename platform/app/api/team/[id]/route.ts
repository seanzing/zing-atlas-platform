import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/api-auth";
import { ORG_ID } from "@/lib/constants";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const requestingMember = await prisma.teamMember.findFirst({
      where: { supabaseUserId: auth.user.id, organizationId: ORG_ID, deletedAt: null },
      select: { role: true },
    });
    if (requestingMember?.role !== "Admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.teamMember.findFirst({
      where: { id, organizationId: ORG_ID, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    // Delete from Supabase Auth so the email can be re-invited
    if (existing.supabaseUserId) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existing.supabaseUserId);
      if (deleteError) {
        logger.warn({ err: deleteError, supabaseUserId: existing.supabaseUserId }, "Supabase user delete failed — continuing with soft delete");
      }
    }

    // Soft delete in Prisma
    await prisma.teamMember.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "DELETE /api/team/[id] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const requestingMember = await prisma.teamMember.findFirst({
      where: { supabaseUserId: auth.user.id, organizationId: ORG_ID, deletedAt: null },
      select: { role: true },
    });
    if (requestingMember?.role !== "Admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.teamMember.findFirst({
      where: { id, organizationId: ORG_ID, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    // Whitelist allowed fields to prevent mass assignment
    const allowedFields: Record<string, unknown> = {};
    const whitelist = ["firstName", "lastName", "email", "phone", "role", "commissionRate", "monthlyTarget", "active", "position", "department"];
    for (const key of whitelist) {
      if (key in body) allowedFields[key] = body[key];
    }

    // Support status field: { status: "inactive" } -> { active: false }
    if (body.status === "inactive") allowedFields.active = false;
    if (body.status === "active") allowedFields.active = true;

    const updated = await prisma.teamMember.update({
      where: { id },
      data: allowedFields,
    });

    return NextResponse.json(serialize(updated));
  } catch (error) {
    logger.error({ err: error }, "PUT /api/team/[id] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
