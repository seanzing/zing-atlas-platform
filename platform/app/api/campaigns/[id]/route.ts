import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.campaign.findFirst({
      where: { id, organizationId: ORG_ID, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Whitelist allowed fields to prevent mass assignment
    const allowedFields: Record<string, unknown> = {};
    const whitelist = ["name", "type", "status"];
    for (const key of whitelist) {
      if (key in body) allowedFields[key] = body[key];
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: allowedFields,
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ err: error }, "PUT /api/campaigns/[id] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
