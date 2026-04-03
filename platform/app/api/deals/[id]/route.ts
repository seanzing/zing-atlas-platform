import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID, ONBOARDING_TASK_TEMPLATES, PRODUCT_TASK_MAP, addDays } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

type RouteContext = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const deal = await prisma.deal.findFirst({
      where: { id: params.id, organizationId: ORG_ID, deletedAt: null },
      include: {
        contact: true,
        product: true,
        onboarding: {
          include: { items: true },
        },
        launchFeePayments: true,
      },
    });

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    logger.info({ dealId: deal.id }, "GET /api/deals/[id]");
    return NextResponse.json(deal);
  } catch (error) {
    logger.error({ err: error }, "GET /api/deals/[id] failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const existing = await prisma.deal.findFirst({
      where: { id: params.id, organizationId: ORG_ID, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const body = await req.json();
    const stagingWon = body.stage === "won" && existing.stage !== "won";

    // Whitelist allowed fields to prevent mass assignment
    const updateData: Record<string, unknown> = {};
    const whitelist = [
      "stage", "value", "rep", "contactName", "company", "dealType",
      "productId", "contactId", "wonDate", "lostReason", "notes",
      "paymentStatus", "stripeSubscriptionId", "stripeCustomerId",
      "designer", "designerEmail",
    ];
    for (const key of whitelist) {
      if (key in body) updateData[key] = body[key];
    }
    // Validate numeric fields
    if (updateData.value !== undefined && updateData.value !== null) {
      const numVal = Number(updateData.value);
      if (isNaN(numVal) || numVal < 0) {
        return NextResponse.json({ error: "value must be a non-negative number" }, { status: 400 });
      }
      updateData.value = numVal;
    }

    if (stagingWon && !updateData.wonDate) {
      updateData.wonDate = new Date();
    } else if (updateData.wonDate) {
      updateData.wonDate = new Date(updateData.wonDate as string);
    }

    const deal = await prisma.deal.update({
      where: { id: params.id },
      data: updateData as Parameters<typeof prisma.deal.update>[0]["data"],
    });

    if (stagingWon) {
      // Only create onboarding if none exists for this deal
      const existingOnboarding = await prisma.onboarding.findFirst({
        where: { dealId: deal.id, deletedAt: null },
      });

      if (!existingOnboarding) {
        const contact = deal.contactId
          ? await prisma.contact.findUnique({ where: { id: deal.contactId } })
          : null;

        const effectiveWonDate = (deal.wonDate as Date | null) ?? new Date();

        const onboarding = await prisma.onboarding.create({
          data: {
            organizationId: ORG_ID,
            dealId: deal.id,
            customerName: contact?.name ?? deal.contactName ?? null,
            businessName: contact?.company ?? null,
            phone: contact?.phone ?? null,
            email: contact?.email ?? null,
            rep: deal.rep ?? null,
            productId: deal.productId ?? null,
            value: deal.value ?? null,
            wonDate: effectiveWonDate,
            status: "active",
          },
        });

        // Try DB-based task templates first, fall back to constants
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
              currentStatus: Array.isArray(t.statusOptions) ? (t.statusOptions as Array<{value: string}>)[0]?.value ?? "not_started" : "not_started",
              statusOptions: t.statusOptions ?? [],
              isConditional: t.isConditional,
              isActive: idx === 0,
              owner: null,
              dueDate: addDays(effectiveWonDate, t.daysOffset),
            })),
          });
        } else {
          // Fallback: constants-based templates
          const product = deal.productId
            ? await prisma.product.findUnique({ where: { id: deal.productId } })
            : null;
          const productDesc = product?.description?.toUpperCase() ?? '';
          const productKey = Object.keys(PRODUCT_TASK_MAP).find(k => productDesc.includes(k)) ?? 'DISCOVER';
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
                dueDate: addDays(effectiveWonDate, template.daysOffset),
              };
            }),
          });
        }

        logger.info({ dealId: deal.id, onboardingId: onboarding.id }, "Deal moved to won — onboarding created");
      }
    }

    logger.info({ dealId: deal.id }, "PUT /api/deals/[id]");
    return NextResponse.json(deal);
  } catch (error) {
    logger.error({ err: error }, "PUT /api/deals/[id] failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const existing = await prisma.deal.findFirst({
      where: { id: params.id, organizationId: ORG_ID, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const now = new Date();

    // Soft-delete related onboarding records and their items
    const onboardings = await prisma.onboarding.findMany({
      where: { dealId: params.id, deletedAt: null },
      select: { id: true },
    });
    const onboardingIds = onboardings.map((o) => o.id);

    await prisma.$transaction([
      // Deactivate onboarding items (OnboardingItem has no deletedAt field)
      ...(onboardingIds.length
        ? [prisma.onboardingItem.updateMany({
            where: { onboardingId: { in: onboardingIds } },
            data: { dueDate: null, isActive: false },
          })]
        : []),
      // Soft-delete onboarding records
      ...(onboardingIds.length
        ? [prisma.onboarding.updateMany({
            where: { id: { in: onboardingIds } },
            data: { deletedAt: now },
          })]
        : []),
      // Soft-delete the deal
      prisma.deal.update({
        where: { id: params.id },
        data: { deletedAt: now },
      }),
    ]);

    logger.info({ dealId: params.id, onboardingIds }, "DELETE /api/deals/[id] — soft deleted with cascade");
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "DELETE /api/deals/[id] failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
