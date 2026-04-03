import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import type { StatusOption } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

type RouteContext = { params: { id: string } };

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const body = await req.json();
    const { status, ownerName } = body as { status: string; ownerName?: string };

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const item = await prisma.onboardingItem.findUnique({
      where: { id: params.id },
      include: {
        onboarding: { include: { product: true } },
      },
    });

    if (!item || item.onboarding?.organizationId !== ORG_ID) {
      return NextResponse.json({ error: "Onboarding item not found" }, { status: 404 });
    }

    // Parse statusOptions
    const statusOptions: StatusOption[] = Array.isArray(item.statusOptions)
      ? (item.statusOptions as unknown as StatusOption[])
      : [];

    const matchedOption = statusOptions.find((o) => o.value === status);
    const isLastOption = statusOptions.length > 0 && statusOptions[statusOptions.length - 1].value === status;
    const isComplete = status.includes("completed") || status.includes("published") || isLastOption;

    // Update the item
    const updated = await prisma.onboardingItem.update({
      where: { id: params.id },
      data: {
        currentStatus: status,
        stage: isComplete ? "complete" : "in_progress",
        completedAt: isComplete ? new Date() : null,
      },
    });

    // Handle triggerNextTask
    if (matchedOption?.triggerNextTask) {
      const allItems = await prisma.onboardingItem.findMany({
        where: { onboardingId: item.onboardingId },
        orderBy: { dueDate: "asc" },
      });

      const nextInactive = allItems.find((i) => !i.isActive && i.id !== item.id);
      if (nextInactive) {
        await prisma.onboardingItem.update({
          where: { id: nextInactive.id },
          data: { isActive: true },
        });

        const customerName = item.onboarding?.customerName ?? "Customer";
        await prisma.onboardingNotification.create({
          data: {
            organizationId: ORG_ID,
            onboardingItemId: nextInactive.id,
            recipientRole: nextInactive.ownerRole,
            recipientName: ownerName ?? null,
            message: `New task ready: ${nextInactive.itemName} for ${customerName}`,
            type: "task_ready",
          },
        });

        logger.info({ nextItemId: nextInactive.id }, "Triggered next task activation");
      }
    }

    // Handle triggerEmail / triggerSms
    if (matchedOption && (matchedOption.triggerEmail || matchedOption.triggerSms)) {
      const customerName = item.onboarding?.customerName ?? "Customer";
      await prisma.onboardingNotification.create({
        data: {
          organizationId: ORG_ID,
          onboardingItemId: item.id,
          recipientName: customerName,
          recipientRole: "customer",
          message: matchedOption.customerMessage ?? `Status updated to ${matchedOption.label}`,
          type: "status_update",
        },
      });

      logger.info(
        { itemId: item.id, triggerEmail: matchedOption.triggerEmail, triggerSms: matchedOption.triggerSms },
        "Logged customer notification trigger (email/SMS sending is Phase 2)"
      );
    }

    logger.info({ itemId: params.id, status }, "PUT /api/onboarding/items/[id]/status");
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ err: error }, "PUT /api/onboarding/items/[id]/status failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
