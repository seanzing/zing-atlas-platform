import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe-client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { ORG_ID } from "@/lib/constants";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/charge-on-file
 *
 * Finds an existing Stripe customer by email, charges their saved card directly.
 * Used for "Card on File" flow — customer is a repeat buyer or was previously charged.
 *
 * Flow:
 * 1. Find Stripe customer by email
 * 2. Get their default payment method
 * 3. Create a new subscription (or PaymentIntent for one-time) using that payment method
 * 4. Mark deal as won + create onboarding
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { dealId, email, priceId, contactId, billingType } = body;

    if (!dealId || !email || !priceId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: dealId, email, priceId" },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // 1. Find Stripe customer by email
    const customers = await stripe.customers.list({ email: email.trim(), limit: 5 });

    if (customers.data.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No Stripe customer found for ${email}. This customer has no saved card. Use Take Payment or Send Link instead.`,
      }, { status: 404 });
    }

    // Pick most recently created customer
    const customer = customers.data[0];

    // 2. Determine default payment method
    let defaultPaymentMethodId: string | null = null;

    // Check customer-level default first
    if (typeof customer.invoice_settings?.default_payment_method === "string") {
      defaultPaymentMethodId = customer.invoice_settings.default_payment_method;
    } else if (
      customer.invoice_settings?.default_payment_method &&
      typeof customer.invoice_settings.default_payment_method === "object"
    ) {
      defaultPaymentMethodId = (customer.invoice_settings.default_payment_method as { id: string }).id;
    }

    // Fall back: list saved payment methods
    if (!defaultPaymentMethodId) {
      const pms = await stripe.paymentMethods.list({ customer: customer.id, type: "card", limit: 5 });
      if (pms.data.length > 0) {
        defaultPaymentMethodId = pms.data[0].id;
      }
    }

    if (!defaultPaymentMethodId) {
      return NextResponse.json({
        success: false,
        error: `Stripe customer found (${customer.id}) but no saved payment method on file. Use Take Payment or Send Link instead.`,
      }, { status: 404 });
    }

    // 3a. Subscription product — create a new subscription
    if (billingType !== "payment") {
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        default_payment_method: defaultPaymentMethodId,
        metadata: { dealId },
        expand: ["latest_invoice.payment_intent"],
      });

      const mrr = (subscription.items.data[0]?.price?.unit_amount ?? 0) / 100;
      const latestInvoice = subscription.latest_invoice as { payment_intent?: { status?: string } | null } | null;
      const piStatus = latestInvoice?.payment_intent?.status;

      if (piStatus && !["succeeded", "processing"].includes(piStatus)) {
        // Payment failed — cancel the subscription we just made
        await stripe.subscriptions.cancel(subscription.id).catch(() => {});
        return NextResponse.json({
          success: false,
          error: `Card charged but payment was declined (status: ${piStatus}). Check the card in Stripe.`,
        }, { status: 402 });
      }

      // 4. Mark deal as won
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

      // 5. Update contact status
      if (contactId) {
        await prisma.contact.update({
          where: { id: contactId },
          data: { status: "Live Customer" },
        }).catch(() => {});
      }

      // 6. Upsert AR account
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
          data: { status: "active", mrr, stripeCustomerId: customer.id, stripeStatus: `active:sub_${subscription.id}` },
        });
      } else {
        const deal = await prisma.deal.findFirst({ where: { id: dealId } });
        await prisma.arAccount.create({
          data: {
            organizationId: ORG_ID,
            customerName: deal?.contactName || customer.name || "Unknown",
            email: email.trim(),
            mrr,
            status: "active",
            stripeCustomerId: customer.id,
            stripeStatus: `active:sub_${subscription.id}`,
            subscriptionCreated: new Date(subscription.created * 1000),
          },
        });
      }

      // 7. Create onboarding
      const { createOnboardingForDeal } = await import("@/lib/create-onboarding");
      await createOnboardingForDeal(dealId);

      logger.info(
        { dealId, customerId: customer.id, subscriptionId: subscription.id, mrr },
        "charge-on-file: subscription created from saved card, deal won"
      );

      return NextResponse.json({
        success: true,
        type: "subscription",
        customerId: customer.id,
        subscriptionId: subscription.id,
        mrr,
        last4: null, // expanded PM details not needed in response
      });
    }

    // 3b. One-time product — create a PaymentIntent
    const price = await stripe.prices.retrieve(priceId);
    const amount = price.unit_amount ?? 0;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: price.currency ?? "usd",
      customer: customer.id,
      payment_method: defaultPaymentMethodId,
      confirm: true,
      off_session: true,
      metadata: { dealId },
    });

    if (!["succeeded", "processing"].includes(paymentIntent.status)) {
      return NextResponse.json({
        success: false,
        error: `Payment declined (status: ${paymentIntent.status}). Check the card in Stripe.`,
      }, { status: 402 });
    }

    const amountPaid = amount / 100;

    // Mark deal as won
    await prisma.deal.update({
      where: { id: dealId },
      data: {
        stage: "won",
        wonDate: new Date(),
        paymentStatus: "confirmed",
        stripeCustomerId: customer.id,
      },
    });

    if (contactId) {
      await prisma.contact.update({
        where: { id: contactId },
        data: { status: "Live Customer" },
      }).catch(() => {});
    }

    // AR account
    const arAccount = await prisma.arAccount.findFirst({
      where: { email: email.trim(), organizationId: ORG_ID, deletedAt: null },
    });
    if (arAccount) {
      await prisma.arAccount.update({
        where: { id: arAccount.id },
        data: { status: "paid", mrr: amountPaid, amountPaid, paidDate: new Date(), stripeCustomerId: customer.id },
      });
    } else {
      const deal = await prisma.deal.findFirst({ where: { id: dealId } });
      await prisma.arAccount.create({
        data: {
          organizationId: ORG_ID,
          customerName: deal?.contactName || customer.name || "Unknown",
          email: email.trim(),
          mrr: amountPaid,
          amountPaid,
          paidDate: new Date(),
          status: "paid",
          stripeCustomerId: customer.id,
        },
      });
    }

    const { createOnboardingForDeal } = await import("@/lib/create-onboarding");
    await createOnboardingForDeal(dealId);

    logger.info(
      { dealId, customerId: customer.id, paymentIntentId: paymentIntent.id, amountPaid },
      "charge-on-file: one-time payment charged from saved card, deal won"
    );

    return NextResponse.json({
      success: true,
      type: "one-time",
      customerId: customer.id,
      paymentIntentId: paymentIntent.id,
      amountPaid,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "charge-on-file: failed");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
