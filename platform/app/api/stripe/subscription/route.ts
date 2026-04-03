import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe-client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { ORG_ID } from "@/lib/constants";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { name, email, phone, priceId, paymentMethodId, dealId, contactId } = body;

    if (!email || !priceId || !paymentMethodId || !dealId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: email, priceId, paymentMethodId, dealId" },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // 1. Create or retrieve Stripe customer
    const existing = await stripe.customers.list({ email, limit: 1 });
    let customerId: string;

    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
    } else {
      const customer = await stripe.customers.create(
        {
          name,
          email,
          phone: phone || undefined,
          metadata: { dealId, contactId: contactId || "" },
        },
        { idempotencyKey: `customer_${email}_${dealId}` }
      );
      customerId = customer.id;
    }

    // 2. Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });

    // 3. Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // 4. Create subscription (pass dealId in metadata for webhook linking)
    const subscription = await stripe.subscriptions.create(
      {
        customer: customerId,
        items: [{ price: priceId }],
        metadata: { dealId },
        expand: ["latest_invoice.payment_intent"],
      },
      { idempotencyKey: `subscription_${customerId}_${dealId}_${priceId}` }
    );

    // 5. Check subscription status
    if (subscription.status === "active") {
      // Update deal record with payment confirmation
      await prisma.deal.update({
        where: { id: dealId },
        data: {
          stage: "won",
          wonDate: new Date(),
          paymentStatus: "confirmed",
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: customerId,
        },
      });

      // Store stripeCustomerId on contact if provided
      if (contactId) {
        await prisma.contact.update({
          where: { id: contactId },
          data: { notes: `Stripe Customer: ${customerId}` },
        });
      }

      // 6. Determine MRR from price
      const price = await stripe.prices.retrieve(priceId);
      const mrr = (price.unit_amount || 0) / 100;

      // Create ArAccount record
      await prisma.arAccount.create({
        data: {
          organizationId: ORG_ID,
          customerName: name,
          email,
          phone: phone || null,
          mrr,
          status: "active",
          stripeCustomerId: customerId,
          subscriptionCreated: new Date(),
        },
      });

      logger.info({ subscriptionId: subscription.id, customerId, dealId }, "Stripe subscription created successfully");

      return NextResponse.json({
        success: true,
        subscriptionId: subscription.id,
        customerId,
      });
    }

    // Handle 3DS / requires_action
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const latestInvoice = subscription.latest_invoice as any;
    if (latestInvoice && typeof latestInvoice !== "string") {
      const paymentIntent = latestInvoice.payment_intent;
      if (paymentIntent && typeof paymentIntent !== "string" && paymentIntent.status === "requires_action") {
        return NextResponse.json({
          success: false,
          requiresAction: true,
          clientSecret: paymentIntent.client_secret,
          subscriptionId: subscription.id,
        });
      }
    }

    // Other failure
    logger.warn({ subscriptionId: subscription.id, status: subscription.status }, "Subscription created with non-active status");
    return NextResponse.json({
      success: false,
      error: `Subscription status: ${subscription.status}`,
      subscriptionId: subscription.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "Failed to create Stripe subscription");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
