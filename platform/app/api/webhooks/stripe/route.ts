import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getStripe } from "@/lib/stripe-client";
import { ORG_ID, ONBOARDING_TASK_TEMPLATES, PRODUCT_TASK_MAP, addDays } from "@/lib/constants";

export const dynamic = "force-dynamic";

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

    // ── checkout.session.completed ──
    // Gated by STRIPE_AUTO_ONBOARD=true — disabled during HubSpot dual-system period
    if (eventType === "checkout.session.completed" && process.env.STRIPE_AUTO_ONBOARD === "true") {
      const session = eventObject;
      const sessionId = session?.id as string;

      // Re-fetch session with line_items expanded to get product info
      const stripe = getStripe();
      const fullSession = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items.data.price.product"],
      });

      const customerDetails = fullSession.customer_details;
      const email = customerDetails?.email;
      const customerName = customerDetails?.name ?? "";
      const phone = customerDetails?.phone ?? null;

      if (!email) {
        logger.warn({ eventId }, "checkout.session.completed: no customer email");
        return NextResponse.json({ received: true, skipped: "no_email" });
      }

      // Determine tier from product name
      const lineItem = fullSession.line_items?.data?.[0];
      const product = lineItem?.price?.product as
        | { name?: string; id?: string }
        | null;
      const productName = (product?.name ?? "").toLowerCase();

      let tierKey: "DISCOVER" | "BOOST" | "DOMINATE" = "DISCOVER";
      if (productName.includes("dominate")) {
        tierKey = "DOMINATE";
      } else if (
        productName.includes("boost") &&
        !productName.includes("gbp boost")
      ) {
        tierKey = "BOOST";
      } else if (productName.includes("discover")) {
        tierKey = "DISCOVER";
      } else {
        logger.warn(
          { eventId, productName },
          "checkout.session.completed: unrecognized product name, defaulting to DISCOVER"
        );
      }

      // Find or create Contact
      let contact = await prisma.contact.findFirst({
        where: { email, organizationId: ORG_ID, deletedAt: null },
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            organizationId: ORG_ID,
            name: customerName || email,
            email,
            phone,
            leadSource: "stripe",
          },
        });
        logger.info(
          { contactId: contact.id, email },
          "checkout.session.completed: created new contact"
        );
      }

      // Find the Atlas Product record for this tier
      const atlasProduct = await prisma.product.findFirst({
        where: {
          organizationId: ORG_ID,
          description: { contains: tierKey },
        },
      });

      // Create Deal
      const amountTotal = (fullSession.amount_total ?? 0) / 100;
      const stripeSubscriptionId =
        typeof fullSession.subscription === "string"
          ? fullSession.subscription
          : typeof fullSession.subscription === "object" &&
              fullSession.subscription !== null
            ? (fullSession.subscription as { id: string }).id
            : null;

      const deal = await prisma.deal.create({
        data: {
          organizationId: ORG_ID,
          contactId: contact.id,
          contactName: customerName || null,
          title: `${customerName || email} – ${tierKey}`,
          stage: "won",
          paymentStatus: "won",
          value: amountTotal,
          productId: atlasProduct?.id ?? null,
          stripeSubscriptionId: stripeSubscriptionId ?? null,
          wonDate: new Date(),
        },
      });

      // Create Onboarding with task items
      const wonDate = new Date();
      const onboarding = await prisma.onboarding.create({
        data: {
          organizationId: ORG_ID,
          dealId: deal.id,
          customerName: customerName || null,
          email,
          phone,
          productId: atlasProduct?.id ?? null,
          value: amountTotal,
          wonDate,
          websiteStatus: "not_started",
        },
      });

      // Build task items using the same constants as the deals route
      const taskTypes = PRODUCT_TASK_MAP[tierKey];
      if (taskTypes) {
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
              statusOptions: JSON.parse(
                JSON.stringify(template.statusOptions)
              ),
              isConditional: template.isConditional,
              isActive: idx === 0,
              owner: null,
              dueDate: addDays(wonDate, template.daysOffset),
            };
          }),
        });
      }

      // Create AR account
      await prisma.arAccount.create({
        data: {
          organizationId: ORG_ID,
          customerName: customerName || null,
          email,
          phone,
          status: "paid",
          mrr: amountTotal,
          amountPaid: amountTotal,
          paidDate: new Date(),
          lastPaymentDate: new Date(),
          stripeStatus: `paid:${eventId}`,
          daysPastDue: 0,
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          organizationId: ORG_ID,
          contactId: contact.id,
          onboardingId: onboarding.id,
          type: "note",
          subject: `New customer — ${tierKey} plan`,
          body: `Customer signed up via Stripe Checkout. Product: ${product?.name ?? "unknown"}. Amount: $${amountTotal.toFixed(2)}.`,
        },
      });

      logger.info(
        {
          eventId,
          contactId: contact.id,
          dealId: deal.id,
          onboardingId: onboarding.id,
          tierKey,
        },
        "checkout.session.completed: new customer created"
      );

      return NextResponse.json({
        received: true,
        processed: "checkout_completed",
        contactId: contact.id,
        dealId: deal.id,
        onboardingId: onboarding.id,
        tier: tierKey,
      });
    }

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
      const stripeCustomerId = invoice?.customer as string | undefined;
      const amountPaid = ((invoice?.amount_paid as number) || 0) / 100;

      // Find AR record — try stripeCustomerId first (most reliable), then fall back to email
      let arAccount = stripeCustomerId
        ? await prisma.arAccount.findFirst({
            where: {
              stripeCustomerId,
              organizationId: ORG_ID,
              deletedAt: null,
            },
          })
        : null;

      if (!arAccount && customerEmail) {
        arAccount = await prisma.arAccount.findFirst({
          where: {
            email: customerEmail,
            organizationId: ORG_ID,
            deletedAt: null,
          },
        });
      }

      if (!arAccount) {
        logger.info(
          { eventId, customerEmail, stripeCustomerId },
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

      // Update the specific deal tied to this subscription
      // IMPORTANT: do NOT use updateMany on contactId alone — a contact can have
      // multiple open deals, and we must only update the one linked to this invoice.
      const subscriptionId = invoice?.subscription as string | undefined;
      if (subscriptionId) {
        await prisma.deal.updateMany({
          where: {
            stripeSubscriptionId: subscriptionId,
            organizationId: ORG_ID,
            deletedAt: null,
          },
          data: {
            stage: "won",
            paymentStatus: "confirmed",
          },
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
