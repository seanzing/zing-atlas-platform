import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {
      organizationId: ORG_ID,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    const onboardings = await prisma.onboarding.findMany({
      where,
      include: {
        items: { orderBy: { dueDate: "asc" } },
        webOwners: true,
        product: { select: { description: true } },
      },
    });

    return NextResponse.json(onboardings);
  } catch (error) {
    logger.error({ err: error }, "GET /api/onboarding error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const body = await request.json();

    // Whitelist allowed fields to prevent mass assignment
    const allowedFields: Record<string, unknown> = {};
    const whitelist = ["dealId", "customerName", "businessName", "phone", "email", "rep", "productId", "value", "wonDate", "status"];
    for (const key of whitelist) {
      if (key in body) allowedFields[key] = body[key];
    }

    const onboarding = await prisma.onboarding.create({
      data: {
        ...allowedFields,
        organizationId: ORG_ID,
      },
    });

    return NextResponse.json(onboarding, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/onboarding error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
