import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getStripe } from "@/lib/stripe-client";
import { ORG_ID } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    if (!sig) {
      logger.warn("Stripe webhook: missing signature header");
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Parse and verify the event payload
    let event: {
      id: string;
      type: string;
      data: { object: Record<string, unknown> };
    };

    if (webhookSecret) {
      // Verify signature using Stripe SDK
      try {
        const stripe = getStripe();
        const verified = stripe.webhooks.constructEvent(body, sig, webhookSecret);
        event = verified as unknown as typeof event;
      } catch (err) {
        logger.warn({ err }, "Stripe webhook: signature verification failed");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 400 }
        );
      }
    } else if (process.env.NODE_ENV === "production") {
      logger.error("STRIPE_WEBHOOK_SECRET not set in production — rejecting webhook");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    } else {
      // Fallback for development only — log warning
      logger.warn("STRIPE_WEBHOOK_SECRET not set — skipping signature verification (dev only)");
      try {
        event = JSON.parse(body);
      } catch {
        logger.warn("Stripe webhook: invalid JSON payload");
        return NextResponse.json(
          { error: "Invalid payload" },
          { status: 400 }
        );
      }
    }

    // Idempotency check — skip already-processed events
    // We use a simple approach: store processed event IDs in a metadata check
    // against existing AR records that have been updated with this event
    const eventId = event.id;
    if (!eventId) {
      return NextResponse.json(
        { error: "Missing event ID" },
        { status: 400 }
      );
    }

    // Check if this event was already processed by looking for the event ID
    // in AR account records (stored in stripeStatus field as "processed:{eventId}")
    const alreadyProcessed = await prisma.arAccount.findFirst({
      where: {
        organizationId: ORG_ID,
        stripeStatus: { contains: eventId },
      },
    });

    if (alreadyProcessed) {
      logger.info({ eventId }, "Stripe webhook: duplicate event, skipping");
      return NextResponse.json({ received: true, duplicate: true });
    }

    const eventType = event.type;
    const eventObject = event.data?.object;

    // ── customer.subscription.created ──
    if (eventType === "customer.subscription.created") {
      const subscription = eventObject;
      const metadata = (subscription?.metadata as Record<string, string>) || {};
      const dealId = metadata.dealId;

      if (dealId) {
        await prisma.deal.update({
          where: { id: dealId },
          data: {
            paymentStatus: "confirmed",
            stripeSubscriptionId: subscription?.id as string,
          },
        });
        logger.info({ eventId, dealId, subscriptionId: subscription?.id }, "customer.subscription.created: deal payment confirmed");
      } else {
        logger.info({ eventId }, "customer.subscription.created: no dealId in metadata, skipping deal update");
      }

      return NextResponse.json({ received: true, processed: "subscription_created" });
    }

    // ── customer.subscription.deleted ──
    if (eventType === "customer.subscription.deleted") {
      const subscription = eventObject;
      const subscriptionId = subscription?.id as string | undefined;

      if (subscriptionId) {
        // Update deal payment status
        await prisma.deal.updateMany({
          where: {
            stripeSubscriptionId: subscriptionId,
            organizationId: ORG_ID,
            deletedAt: null,
          },
          data: { paymentStatus: "canceled" },
        });

        // Find contact via affected deal, then find AR account via contact email
        const affectedDeal = await prisma.deal.findFirst({
          where: {
            stripeSubscriptionId: subscriptionId,
            organizationId: ORG_ID,
          },
          include: { contact: true },
        });

        if (affectedDeal?.contact?.email) {
          const arAccount = await prisma.arAccount.findFirst({
            where: {
              email: affectedDeal.contact.email,
              organizationId: ORG_ID,
              deletedAt: null,
            },
          });

          if (arAccount) {
            await prisma.arAccount.update({
              where: { id: arAccount.id },
              data: {
                status: "canceled",
                mrr: 0,
              },
            });

            await prisma.arTimeline.create({
              data: {
                arId: arAccount.id,
                date: new Date(),
                type: "subscription-canceled",
                note: `Subscription canceled (Stripe event: ${eventId})`,
              },
            });
          }
        }
      }

      logger.info({ eventId, subscriptionId }, "customer.subscription.deleted processed");
      return NextResponse.json({ received: true, processed: "subscription_deleted" });
    }

    // ── invoice.paid ──
    if (eventType === "invoice.paid") {
      const invoice = eventObject;
      const customerEmail = invoice?.customer_email as string | undefined;
      const amountPaid = ((invoice?.amount_paid as number) || 0) / 100;

      if (!customerEmail) {
        logger.warn({ eventId }, "invoice.paid: no customer_email on invoice");
        return NextResponse.json({ received: true, skipped: "no_email" });
      }

      // Find AR record by customer email (scoped to org)
      const arAccount = await prisma.arAccount.findFirst({
        where: {
          email: customerEmail,
          organizationId: ORG_ID,
          deletedAt: null,
        },
      });

      if (!arAccount) {
        logger.info(
          { eventId, customerEmail },
          "invoice.paid: no matching AR account"
        );
        return NextResponse.json({ received: true, skipped: "no_ar_account" });
      }

      // Mark AR as paid
      await prisma.arAccount.update({
        where: { id: arAccount.id },
        data: {
          status: "paid",
          stripeStatus: `paid:${eventId}`,
          amountPaid,
          paidDate: new Date(),
          lastPaymentDate: new Date(),
          daysPastDue: 0,
        },
      });

      // Update related deal status if there's a matching contact
      if (arAccount.email) {
        const contact = await prisma.contact.findFirst({
          where: { email: arAccount.email, organizationId: ORG_ID, deletedAt: null },
        });

        if (contact) {
          await prisma.deal.updateMany({
            where: {
              contactId: contact.id,
              organizationId: ORG_ID,
              stage: { not: "won" },
              deletedAt: null,
            },
            data: { stage: "won" },
          });
        }
      }

      // Confirm payment on deals linked by stripeSubscriptionId
      const subscriptionId = invoice?.subscription as string | undefined;
      if (subscriptionId) {
        await prisma.deal.updateMany({
          where: {
            stripeSubscriptionId: subscriptionId,
            organizationId: ORG_ID,
            paymentStatus: { not: "confirmed" },
            deletedAt: null,
          },
          data: { paymentStatus: "confirmed" },
        });
      }

      // Add timeline entry
      await prisma.arTimeline.create({
        data: {
          arId: arAccount.id,
          date: new Date(),
          type: "payment-received",
          note: `Payment received: $${amountPaid.toFixed(2)} (Stripe event: ${eventId})`,
        },
      });

      logger.info(
        { eventId, arAccountId: arAccount.id, amountPaid },
        "invoice.paid processed"
      );

      return NextResponse.json({ received: true, processed: "invoice_paid" });
    }

    if (eventType === "invoice.payment_failed") {
      const failedInvoice = eventObject;
      const customerEmail = failedInvoice?.customer_email as string | undefined;

      if (!customerEmail) {
        logger.warn(
          { eventId },
          "invoice.payment_failed: no customer_email"
        );
        return NextResponse.json({ received: true, skipped: "no_email" });
      }

      const arAccount = await prisma.arAccount.findFirst({
        where: {
          email: customerEmail,
          organizationId: ORG_ID,
          deletedAt: null,
        },
      });

      if (!arAccount) {
        logger.info(
          { eventId, customerEmail },
          "invoice.payment_failed: no matching AR account"
        );
        return NextResponse.json({ received: true, skipped: "no_ar_account" });
      }

      // Flag AR record as failed
      await prisma.arAccount.update({
        where: { id: arAccount.id },
        data: {
          status: "unpaid",
          stripeStatus: `failed:${eventId}`,
          failedDate: new Date(),
        },
      });

      // Add timeline entry
      await prisma.arTimeline.create({
        data: {
          arId: arAccount.id,
          date: new Date(),
          type: "escalated",
          note: `Payment failed (Stripe event: ${eventId})`,
        },
      });

      logger.info(
        { eventId, arAccountId: arAccount.id },
        "invoice.payment_failed processed"
      );

      return NextResponse.json({
        received: true,
        processed: "payment_failed",
      });
    }

    // Unhandled event type — acknowledge but don't process
    logger.info({ eventId, eventType }, "Stripe webhook: unhandled event type");
    return NextResponse.json({ received: true, unhandled: eventType });
  } catch (error) {
    logger.error({ err: error }, "POST /api/webhooks/stripe error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
