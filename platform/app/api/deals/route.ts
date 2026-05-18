import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
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
      "title", "stage", "value", "rep", "contactName", "dealType",
      "productId", "contactId", "assignedDesigner", "launchFeeAmount",
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

    // NOTE: Onboarding is NOT created here.
    // It is created by the Stripe webhook (customer.subscription.created / invoice.paid)
    // ONLY after payment is confirmed. A deal marked as won without confirmed payment
    // does NOT trigger onboarding.

    logger.info({ dealId: deal.id }, "POST /api/deals");
    return NextResponse.json(serialize(deal), { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/deals failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
