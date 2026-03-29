import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID, ONBOARDING_ITEMS, addDays } from "@/lib/constants";

export async function GET(req: NextRequest) {
  try {
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

    const deals = await prisma.deal.findMany({
      where,
      include: {
        contact: true,
        product: true,
      },
      orderBy: { createdAt: "desc" },
    });

    logger.info({ count: deals.length }, "GET /api/deals");
    return NextResponse.json(deals);
  } catch (error) {
    logger.error({ err: error }, "GET /api/deals failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dealData: any = {
      ...body,
      organizationId: ORG_ID,
    };
    if (wonDate !== undefined) dealData.wonDate = wonDate;

    // Remove undefined keys to avoid Prisma errors
    Object.keys(dealData).forEach(
      (k: string) => dealData[k] === undefined && delete dealData[k]
    );

    const deal = await prisma.deal.create({ data: dealData });

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

      await prisma.onboardingItem.createMany({
        data: ONBOARDING_ITEMS.map((item) => ({
          onboardingId: onboarding.id,
          itemName: item.itemName,
          stage: "pending",
          owner: null,
          dueDate: addDays(effectiveWonDate, item.daysOffset),
        })),
      });

      logger.info({ dealId: deal.id, onboardingId: onboarding.id }, "Won deal — onboarding created");
    }

    logger.info({ dealId: deal.id }, "POST /api/deals");
    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/deals failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
