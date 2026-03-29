import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
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
        items: true,
        webOwners: true,
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
    const body = await request.json();

    const onboarding = await prisma.onboarding.create({
      data: {
        ...body,
        organizationId: ORG_ID,
      },
    });

    return NextResponse.json(onboarding, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/onboarding error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
