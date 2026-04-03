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
    const { name, email, priceId, dealId, productName } = body;

    if (!email || !priceId || !dealId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: email, priceId, dealId" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // 1. Create Stripe Checkout Session (idempotency key prevents duplicate sessions on retry)
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer_email: email,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/payment-cancelled`,
        metadata: { dealId },
      },
      { idempotencyKey: `checkout_${dealId}_${priceId}` }
    );

    // 2. Log to ArTimeline — find or create AR record to attach timeline entry
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (deal) {
      // Find existing AR account by email or create a stub
      let arAccount = await prisma.arAccount.findFirst({
        where: { email, organizationId: ORG_ID, deletedAt: null },
      });
      if (!arAccount) {
        arAccount = await prisma.arAccount.create({
          data: {
            organizationId: ORG_ID,
            customerName: name || deal.contactName || "Unknown",
            email,
            product: productName || null,
            status: "pending",
          },
        });
      }
      await prisma.arTimeline.create({
        data: {
          arId: arAccount.id,
          date: new Date(),
          type: "payment-link-sent",
          note: `Payment link sent to ${email}`,
        },
      });
    }

    logger.info({ sessionId: session.id, dealId, email }, "Stripe Checkout session created");

    // 3. Return checkout URL
    if (!session.url) {
      logger.error({ sessionId: session.id }, "Stripe session created but URL is null");
      return NextResponse.json({ success: false, error: "Checkout session URL unavailable" }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "Failed to create Stripe payment link");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
