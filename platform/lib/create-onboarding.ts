/**
 * createOnboardingForDeal
 *
 * Creates an onboarding record + onboarding items for a won deal.
 * Called ONLY when payment is confirmed (from Stripe webhook).
 * Never called directly from the deal creation API.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID, ONBOARDING_TASK_TEMPLATES, PRODUCT_TASK_MAP, addDays } from "@/lib/constants";

export async function createOnboardingForDeal(dealId: string): Promise<string | null> {
  try {
    // Avoid duplicate onboarding records
    const existing = await prisma.onboarding.findFirst({
      where: { dealId, organizationId: ORG_ID, deletedAt: null },
    });
    if (existing) {
      logger.info({ dealId, onboardingId: existing.id }, "createOnboardingForDeal: onboarding already exists, skipping");
      return existing.id;
    }

    const deal = await prisma.deal.findFirst({
      where: { id: dealId, organizationId: ORG_ID, deletedAt: null },
      include: {
        contact: { select: { name: true, company: true, phone: true, email: true } },
        product: { select: { id: true, description: true } },
      },
    });

    if (!deal) {
      logger.warn({ dealId }, "createOnboardingForDeal: deal not found");
      return null;
    }

    const wonDate = deal.wonDate ?? new Date();

    const onboarding = await prisma.onboarding.create({
      data: {
        organizationId: ORG_ID,
        dealId: deal.id,
        customerName: deal.contact?.name ?? deal.contactName ?? null,
        businessName: deal.contact?.company ?? null,
        phone: deal.contact?.phone ?? null,
        email: deal.contact?.email ?? null,
        rep: deal.rep ?? null,
        productId: deal.productId ?? null,
        value: deal.value ?? null,
        wonDate,
        status: "active",
      },
    });

    // Build task items from DB templates or fall back to constants
    const dbTemplates = deal.productId
      ? await prisma.productTaskTemplate.findMany({
          where: { productId: deal.productId, deletedAt: null },
          orderBy: { taskOrder: "asc" },
        })
      : [];

    if (dbTemplates.length > 0) {
      await prisma.onboardingItem.createMany({
        data: dbTemplates.map((t, idx) => ({
          onboardingId: onboarding.id,
          itemName: t.taskName,
          taskType: t.taskType,
          ownerRole: t.ownerRole,
          stage: "pending",
          currentStatus: Array.isArray(t.statusOptions)
            ? (t.statusOptions as Array<{ value: string }>)[0]?.value ?? "not_started"
            : "not_started",
          statusOptions: t.statusOptions ?? [],
          isConditional: t.isConditional,
          isActive: idx === 0,
          owner: null,
          dueDate: addDays(wonDate, t.daysOffset),
        })),
      });
    } else {
      const productDesc = deal.product?.description?.toUpperCase() ?? "";
      const productKey = Object.keys(PRODUCT_TASK_MAP).find((k) => productDesc.includes(k)) ?? "DISCOVER";
      const taskTypes = PRODUCT_TASK_MAP[productKey];

      await prisma.onboardingItem.createMany({
        data: taskTypes.map((taskType, idx) => {
          const template = ONBOARDING_TASK_TEMPLATES[taskType];
          return {
            onboardingId: onboarding.id,
            itemName: template.itemName,
            taskType: template.taskType,
            ownerRole: template.ownerRole,
            stage: "pending",
            currentStatus: template.statusOptions[0]?.value ?? "not_started",
            statusOptions: JSON.parse(JSON.stringify(template.statusOptions)),
            isConditional: template.isConditional,
            isActive: idx === 0,
            owner: null,
            dueDate: addDays(wonDate, template.daysOffset),
          };
        }),
      });
    }

    logger.info({ dealId, onboardingId: onboarding.id }, "createOnboardingForDeal: onboarding created");
    return onboarding.id;
  } catch (err) {
    logger.error({ err, dealId }, "createOnboardingForDeal: failed");
    return null;
  }
}
