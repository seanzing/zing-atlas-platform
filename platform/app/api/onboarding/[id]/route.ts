import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    const onboarding = await prisma.onboarding.findFirst({
      where: {
        id,
        organizationId: ORG_ID,
        deletedAt: null,
      },
      include: {
        items: true,
        webOwners: true,
        deal: true,
        product: true,
      },
    });

    if (!onboarding) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(onboarding);
  } catch (error) {
    logger.error({ err: error }, "GET /api/onboarding/[id] error");
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
    const { id } = await params;

    const existing = await prisma.onboarding.findFirst({
      where: {
        id,
        organizationId: ORG_ID,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();

    // Whitelist allowed fields to prevent mass assignment
    const allowedFields: Record<string, unknown> = {};
    const whitelist = ["status", "customerName", "businessName", "phone", "email", "rep", "value", "wonDate", "notes"];
    for (const key of whitelist) {
      if (key in body) allowedFields[key] = body[key];
    }

    const onboarding = await prisma.onboarding.update({
      where: { id },
      data: allowedFields,
    });

    return NextResponse.json(onboarding);
  } catch (error) {
    logger.error({ err: error }, "PUT /api/onboarding/[id] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
