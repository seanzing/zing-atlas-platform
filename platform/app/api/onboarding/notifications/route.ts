import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const where: Record<string, unknown> = {
      organizationId: ORG_ID,
    };

    if (role) where.recipientRole = role;
    if (unreadOnly) where.isRead = false;

    const notifications = await prisma.onboardingNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        item: {
          select: { itemName: true, taskType: true, onboardingId: true },
        },
      },
    });

    logger.info({ count: notifications.length }, "GET /api/onboarding/notifications");
    return NextResponse.json(notifications);
  } catch (error) {
    logger.error({ err: error }, "GET /api/onboarding/notifications failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
