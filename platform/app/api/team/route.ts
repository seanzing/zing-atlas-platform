import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/api-auth";
import { ORG_ID } from "@/lib/constants";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const position = searchParams.get("position");

    const where: Record<string, unknown> = {
      organizationId: ORG_ID,
      deletedAt: null,
    };
    if (position) {
      where.position = position;
    }
    // If not requesting a specific position (admin user management), include all active/inactive.
    // If position filter is used (e.g., sales reps for pipeline), only return active.
    if (position) {
      where.active = true;
    }

    const teamMembers = await prisma.teamMember.findMany({ where });

    return NextResponse.json(serialize(teamMembers));
  } catch (error) {
    logger.error({ err: error }, "GET /api/team error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    if (!body.firstName || !body.lastName) {
      return NextResponse.json(
        { error: "firstName and lastName are required" },
        { status: 400 }
      );
    }

    // Whitelist allowed fields to prevent mass assignment
    const allowedFields: Record<string, unknown> = {};
    const whitelist = ["firstName", "lastName", "email", "phone", "role", "commissionRate", "monthlyTarget", "active"];
    for (const key of whitelist) {
      if (key in body) allowedFields[key] = body[key];
    }

    const member = await prisma.teamMember.create({
      data: {
        ...allowedFields,
        organizationId: ORG_ID,
      },
    });

    return NextResponse.json(serialize(member), { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/team error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
