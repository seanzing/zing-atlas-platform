import { NextRequest, NextResponse } from "next/server";
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

    // Soft delete
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
