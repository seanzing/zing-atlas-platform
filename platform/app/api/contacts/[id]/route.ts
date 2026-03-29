import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";

type RouteContext = { params: { id: string } };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = params;

    const contact = await prisma.contact.findFirst({
      where: {
        id,
        organizationId: ORG_ID,
        deletedAt: null,
      },
      include: {
        deals: {
          where: { deletedAt: null },
          include: {
            onboarding: {
              where: { deletedAt: null },
              include: {
                items: true,
                webOwners: true,
              },
            },
          },
        },
        tickets: {
          where: { deletedAt: null },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json(contact, { status: 200 });
  } catch (error) {
    logger.error({ err: error }, "GET /api/contacts/[id] error");
    return NextResponse.json(
      { error: "Failed to fetch contact" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = params;

    const existing = await prisma.contact.findFirst({
      where: {
        id,
        organizationId: ORG_ID,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const body = await request.json();

    const contact = await prisma.contact.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(contact, { status: 200 });
  } catch (error) {
    logger.error({ err: error }, "PUT /api/contacts/[id] error");
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = params;

    // 1. Find the contact
    const contact = await prisma.contact.findFirst({
      where: {
        id,
        organizationId: ORG_ID,
        deletedAt: null,
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // 2. Find all deals for that contact
    const deals = await prisma.deal.findMany({
      where: { contactId: id },
      select: { id: true },
    });
    const dealIds = deals.map((d) => d.id);

    // 3. Find all onboarding records for those deals
    const onboardings = dealIds.length
      ? await prisma.onboarding.findMany({
          where: { dealId: { in: dealIds } },
          select: { id: true },
        })
      : [];
    const onboardingIds = onboardings.map((o) => o.id);

    // 4. Find all ar_accounts matching contact name
    const arAccounts = await prisma.arAccount.findMany({
      where: { customerName: contact.name },
      select: { id: true },
    });
    const arAccountIds = arAccounts.map((a) => a.id);

    // 5. Execute all deletes in a transaction (CCPA hard delete)
    await prisma.$transaction([
      // Delete onboarding_web_owners
      ...(onboardingIds.length
        ? [
            prisma.onboardingWebOwner.deleteMany({
              where: { onboardingId: { in: onboardingIds } },
            }),
          ]
        : []),
      // Delete onboarding_items
      ...(onboardingIds.length
        ? [
            prisma.onboardingItem.deleteMany({
              where: { onboardingId: { in: onboardingIds } },
            }),
          ]
        : []),
      // Delete onboarding records
      ...(dealIds.length
        ? [
            prisma.onboarding.deleteMany({
              where: { dealId: { in: dealIds } },
            }),
          ]
        : []),
      // Delete tickets by contact_id
      prisma.ticket.deleteMany({
        where: { contactId: id },
      }),
      // Delete ar_timeline by ar_account IDs
      ...(arAccountIds.length
        ? [
            prisma.arTimeline.deleteMany({
              where: { arId: { in: arAccountIds } },
            }),
          ]
        : []),
      // Delete ar_accounts by customer_name
      prisma.arAccount.deleteMany({
        where: { customerName: contact.name },
      }),
      // Delete deals by contact_id
      prisma.deal.deleteMany({
        where: { contactId: id },
      }),
      // Delete the contact itself
      prisma.contact.delete({
        where: { id },
      }),
    ]);

    logger.info({ contactId: id }, "CCPA cascade delete completed");

    return NextResponse.json(
      { message: "Contact and all related data permanently deleted" },
      { status: 200 }
    );
  } catch (error) {
    logger.error({ err: error }, "DELETE /api/contacts/[id] error");
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}
