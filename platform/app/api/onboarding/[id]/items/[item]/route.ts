import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; item: string }> }
) {
  try {
    const { id, item: itemId } = await params;

    const onboarding = await prisma.onboarding.findFirst({
      where: {
        id,
        organizationId: ORG_ID,
        deletedAt: null,
      },
    });

    if (!onboarding) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const existingItem = await prisma.onboardingItem.findFirst({
      where: {
        id: itemId,
        onboardingId: id,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { stage, owner, dueDate } = body;

    const updatedItem = await prisma.onboardingItem.update({
      where: { id: itemId },
      data: {
        ...(stage !== undefined && { stage }),
        ...(owner !== undefined && { owner }),
        ...(dueDate !== undefined && { dueDate }),
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    logger.error({ err: error }, "PUT /api/onboarding/[id]/items/[item] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
