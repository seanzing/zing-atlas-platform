import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const onboardings = await prisma.onboarding.findMany({
      where: {
        organizationId: ORG_ID,
        deletedAt: null,
      },
      include: {
        items: true,
        product: { select: { description: true } },
        deal: { select: { contactId: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = onboardings.map((ob) => {
      const websiteItem = ob.items.find((i) => i.taskType === "website");
      return {
        onboardingId: ob.id,
        customerName: ob.customerName,
        businessName: ob.businessName,
        email: ob.email,
        contactId: ob.deal?.contactId ?? null,
        websiteStatus: ob.websiteStatus ?? "not_started",
        designer: websiteItem?.owner ?? ob.offshoreDesigner ?? ob.usDesigner ?? null,
        product: ob.product?.description ?? null,
        wonDate: ob.wonDate,
        status: ob.status,
        items: ob.items.map((i) => ({
          id: i.id,
          taskType: i.taskType,
          itemName: i.itemName,
          currentStatus: i.currentStatus,
          statusOptions: i.statusOptions,
          owner: i.owner,
          ownerRole: i.ownerRole,
          dueDate: i.dueDate,
          completedAt: i.completedAt,
          stage: i.stage,
          isActive: i.isActive,
          isConditional: i.isConditional,
          notes: i.notes,
        })),
      };
    });

    logger.info({ count: result.length }, "GET /api/onboarding/full");
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ err: error }, "GET /api/onboarding/full failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
