import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID, ONBOARDING_ITEMS, addDays } from "@/lib/constants";

type RouteContext = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
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
    const existing = await prisma.deal.findFirst({
      where: { id: params.id, organizationId: ORG_ID, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const body = await req.json();
    const stagingWon = body.stage === "won" && existing.stage !== "won";

    const updateData: Record<string, unknown> = { ...body };

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

        await prisma.onboardingItem.createMany({
          data: ONBOARDING_ITEMS.map((item) => ({
            onboardingId: onboarding.id,
            itemName: item.itemName,
            stage: "pending",
            owner: null,
            dueDate: addDays(effectiveWonDate, item.daysOffset),
          })),
        });

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
    const existing = await prisma.deal.findFirst({
      where: { id: params.id, organizationId: ORG_ID, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const deal = await prisma.deal.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    logger.info({ dealId: deal.id }, "DELETE /api/deals/[id] — soft deleted");
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "DELETE /api/deals/[id] failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
