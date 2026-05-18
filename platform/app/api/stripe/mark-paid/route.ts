import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe-client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { ORG_ID } from "@/lib/constants";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// POST /api/stripe/mark-paid
// Finds an existing Stripe subscription by email, links it to a deal, marks as won, creates onboarding.
// Used for "Payment Taken" flow — payment was collected outside the system.
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { dealId, email, contactId } = body;

    if (!dealId || !email) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: dealId, email" },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // 1. Find Stripe customer by email
    const customers = await stripe.customers.list({ email: email.trim(), limit: 5 });

    if (customers.data.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No Stripe customer found for ${email}. Check the email address or create the subscription manually in Stripe.`,
      }, { status: 404 });
    }

    // Pick first customer (most recently created)
    const customer = customers.data[0];

    // 2. Find their active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 5,
    });

    let subscription = subscriptions.data[0];

    // If no active sub, try trialing or past_due
    if (!subscription) {
      const anyActive = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 5,
      });
      subscription = anyActive.data.find(
        (s) => ["active", "trialing", "past_due"].includes(s.status)
      ) ?? anyActive.data[0];
    }

    if (!subscription) {
      return NextResponse.json({
        success: false,
        error: `Stripe customer found (${customer.id}) but no subscriptions exist. Verify payment was completed in Stripe.`,
      }, { status: 404 });
    }

    const priceId = subscription.items.data[0]?.price?.id;
    const mrr = (subscription.items.data[0]?.price?.unit_amount ?? 0) / 100;

    // 3. Update deal — mark as won with Stripe IDs
    await prisma.deal.update({
      where: { id: dealId },
      data: {
        stage: "won",
        wonDate: new Date(),
        paymentStatus: "confirmed",
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customer.id,
      },
    });

    // 4. Update Stripe subscription metadata to include dealId (for future webhooks)
    try {
      await stripe.subscriptions.update(subscription.id, {
        metadata: { dealId, ...subscription.metadata },
      });
    } catch (metaErr) {
      logger.warn({ err: metaErr }, "mark-paid: could not update subscription metadata");
    }

    // 5. Create or update AR account
    let arAccount = await prisma.arAccount.findFirst({
      where: { stripeCustomerId: customer.id, organizationId: ORG_ID, deletedAt: null },
    });
    if (!arAccount) {
      arAccount = await prisma.arAccount.findFirst({
        where: { email: email.trim(), organizationId: ORG_ID, deletedAt: null },
      });
    }
    if (arAccount) {
      await prisma.arAccount.update({
        where: { id: arAccount.id },
        data: {
          status: "active",
          mrr,
          stripeCustomerId: customer.id,
          subscriptionCreated: new Date(subscription.created * 1000),
        },
      });
    } else {
      const deal = await prisma.deal.findFirst({ where: { id: dealId } });
      await prisma.arAccount.create({
        data: {
          organizationId: ORG_ID,
          customerName: deal?.contactName || customer.name || "Unknown",
          email: email.trim(),
          phone: customer.phone || null,
          mrr,
          status: "active",
          stripeCustomerId: customer.id,
          subscriptionCreated: new Date(subscription.created * 1000),
        },
      });
    }

    // 6. Link stripeCustomerId to contact if provided
    if (contactId) {
      await prisma.contact.update({
        where: { id: contactId },
        data: { notes: `Stripe Customer: ${customer.id}` },
      }).catch(() => {}); // non-fatal
    }

    // 7. Create onboarding
    const { createOnboardingForDeal } = await import("@/lib/create-onboarding");
    await createOnboardingForDeal(dealId);

    logger.info(
      { dealId, customerId: customer.id, subscriptionId: subscription.id, mrr },
      "mark-paid: deal linked to existing Stripe subscription, onboarding created"
    );

    return NextResponse.json({
      success: true,
      customerId: customer.id,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      mrr,
      priceId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "mark-paid: failed");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
