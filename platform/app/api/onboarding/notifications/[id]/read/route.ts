import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

type RouteContext = { params: { id: string } };

export async function PUT(_req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    // Verify notification belongs to this org before updating
    const existing = await prisma.onboardingNotification.findFirst({
      where: { id: params.id, organizationId: ORG_ID },
    });
    if (!existing) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    const notification = await prisma.onboardingNotification.update({
      where: { id: params.id },
      data: { isRead: true },
    });

    logger.info({ id: params.id }, "PUT /api/onboarding/notifications/[id]/read");
    return NextResponse.json(notification);
  } catch (error) {
    logger.error({ err: error }, "PUT /api/onboarding/notifications/[id]/read failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
