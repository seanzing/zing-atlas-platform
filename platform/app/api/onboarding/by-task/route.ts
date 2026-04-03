import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const items = await prisma.onboardingItem.findMany({
      where: {
        isActive: true,
        onboarding: {
          organizationId: ORG_ID,
          deletedAt: null,
          status: "active",
        },
      },
      include: {
        onboarding: {
          select: {
            id: true,
            customerName: true,
            businessName: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // Group by taskType
    const grouped: Record<string, {
      taskType: string;
      itemName: string;
      items: Array<{
        id: string;
        currentStatus: string | null;
        statusOptions: unknown;
        owner: string | null;
        ownerRole: string | null;
        customerName: string | null;
        businessName: string | null;
        onboardingId: string;
        dueDate: Date | null;
        isActive: boolean;
        notes: string | null;
      }>;
    }> = {};

    for (const item of items) {
      const key = item.taskType ?? "unknown";
      if (!grouped[key]) {
        grouped[key] = {
          taskType: key,
          itemName: item.itemName ?? key,
          items: [],
        };
      }
      grouped[key].items.push({
        id: item.id,
        currentStatus: item.currentStatus,
        statusOptions: item.statusOptions,
        owner: item.owner,
        ownerRole: item.ownerRole,
        customerName: item.onboarding?.customerName ?? null,
        businessName: item.onboarding?.businessName ?? null,
        onboardingId: item.onboardingId,
        dueDate: item.dueDate,
        isActive: item.isActive,
        notes: item.notes,
      });
    }

    const result = Object.values(grouped);

    logger.info({ groupCount: result.length }, "GET /api/onboarding/by-task");
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ err: error }, "GET /api/onboarding/by-task failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
