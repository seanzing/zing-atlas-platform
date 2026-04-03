import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

type RouteContext = { params: { id: string } };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
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

    // Flatten onboarding items for frontend consumption
    const onboardingItems = contact.deals.flatMap((deal) =>
      deal.onboarding.flatMap((ob) => ob.items)
    );

    return NextResponse.json({ ...contact, onboarding: onboardingItems }, { status: 200 });
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
    const auth = await requireAuth();
    if (auth.error) return auth.error;
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

    // Whitelist allowed fields to prevent mass assignment
    const allowedFields: Record<string, unknown> = {};
    const whitelist = ["name", "email", "phone", "company", "status", "source", "notes", "campaignId"];
    for (const key of whitelist) {
      if (key in body) allowedFields[key] = body[key];
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: allowedFields,
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
    const auth = await requireAuth();
    if (auth.error) return auth.error;
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

    // 4. Find all ar_accounts matching contact name within org
    const arAccounts = await prisma.arAccount.findMany({
      where: { customerName: contact.name, organizationId: ORG_ID },
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
      // Delete ar_accounts by customer_name within org
      prisma.arAccount.deleteMany({
        where: { customerName: contact.name, organizationId: ORG_ID },
      }),
      // Delete launch_fee_payments for deals (ON DELETE RESTRICT requires explicit delete)
      ...(dealIds.length
        ? [
            prisma.launchFeePayment.deleteMany({
              where: { dealId: { in: dealIds } },
            }),
          ]
        : []),
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
