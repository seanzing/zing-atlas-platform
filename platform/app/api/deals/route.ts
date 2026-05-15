import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID, ONBOARDING_TASK_TEMPLATES, PRODUCT_TASK_MAP, addDays } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";
import { serialize } from "@/lib/serialize";
import { computeHeatScore } from "@/lib/heat-score";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage");
    const rep = searchParams.get("rep");
    const contactId = searchParams.get("contactId");

    const where: Record<string, unknown> = {
      organizationId: ORG_ID,
      deletedAt: null,
    };

    if (stage) where.stage = stage;
    if (rep) where.rep = rep;
    if (contactId) where.contactId = contactId;

    // Permission scoping: reps see only their own pipeline
    const teamMember = await prisma.teamMember.findFirst({
      where: { supabaseUserId: auth.user.id, organizationId: ORG_ID, deletedAt: null },
    });
    if (teamMember?.role === 'rep') {
      where.rep = teamMember.firstName ?? undefined;
    }

    const deals = await prisma.deal.findMany({
      where,
      include: {
        contact: true,
        product: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const dealsWithMeta = deals.map((deal) => {
      const stageRef = deal.stageEnteredAt ?? deal.createdAt;
      const timeInStageDays = Math.floor((Date.now() - new Date(stageRef).getTime()) / 86400000);
      const heatScore = computeHeatScore(
        { stage: deal.stage ?? '', probability: deal.probability, stageEnteredAt: deal.stageEnteredAt, createdAt: deal.createdAt },
        deal.contact ? { lastContact: deal.contact.lastContact } : null
      );
      return { ...deal, timeInStageDays, heatScore };
    });

    logger.info({ count: deals.length }, "GET /api/deals");
    return NextResponse.json(serialize(dealsWithMeta));
  } catch (error) {
    logger.error({ err: error }, "GET /api/deals failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const body = await req.json();

    if (!body.title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const isWon = body.stage === "won";
    const wonDate: Date | undefined = body.wonDate
      ? new Date(body.wonDate)
      : isWon
        ? new Date()
        : undefined;

    // Whitelist allowed fields to prevent mass assignment
    const whitelist = [
      "title", "stage", "value", "rep", "contactName", "company", "dealType",
      "productId", "contactId", "lostReason", "notes",
      "designer", "designerEmail", "launchFeeAmount",
      "domainType", "domainName",
    ];
    const dealData: Record<string, unknown> = { organizationId: ORG_ID };
    for (const key of whitelist) {
      if (key in body) dealData[key] = body[key];
    }
    // Validate numeric fields
    if (dealData.value !== undefined && dealData.value !== null) {
      const numVal = Number(dealData.value);
      if (isNaN(numVal) || numVal < 0) {
        return NextResponse.json({ error: "value must be a non-negative number" }, { status: 400 });
      }
      dealData.value = numVal;
    }
    if (dealData.launchFeeAmount !== undefined && dealData.launchFeeAmount !== null) {
      const numFee = Number(dealData.launchFeeAmount);
      if (isNaN(numFee) || numFee < 0) {
        return NextResponse.json({ error: "launchFeeAmount must be a non-negative number" }, { status: 400 });
      }
      dealData.launchFeeAmount = numFee;
    }
    if (wonDate !== undefined) dealData.wonDate = wonDate;
    dealData.stageEnteredAt = new Date();

    const deal = await prisma.deal.create({ data: dealData as Parameters<typeof prisma.deal.create>[0]["data"] });

    if (isWon) {
      // Fetch contact if contactId provided
      const contact = deal.contactId
        ? await prisma.contact.findUnique({ where: { id: deal.contactId } })
        : null;

      const effectiveWonDate = wonDate ?? new Date();

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

      // Set existingUrl on onboarding if provided
      if (body.existingUrl) {
        await prisma.onboarding.update({
          where: { id: onboarding.id },
          data: { existingUrl: body.existingUrl },
        });
      }

      logger.info({ dealId: deal.id, onboardingId: onboarding.id }, "Won deal — onboarding created");

      // Pixel site creation is handled manually from the onboarding screen.
      // Auto-create on deal won is intentionally disabled.
    }

    logger.info({ dealId: deal.id }, "POST /api/deals");
    return NextResponse.json(serialize(deal), { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ err: error }, "POST /api/deals failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
