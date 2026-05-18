import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe-client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { ORG_ID } from "@/lib/constants";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { name, email, priceId, dealId, productName, billingType } = body;
    const isOneTime = billingType === "payment";

    if (!priceId || !dealId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: priceId, dealId" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://atlas.zingwebsitedesign.com";

    // 1. Create Stripe Checkout Session (idempotency key prevents duplicate sessions on retry)
    const session = await stripe.checkout.sessions.create(
      {
        mode: isOneTime ? "payment" : "subscription",
        ...(email ? { customer_email: email } : {}),
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/payment-cancelled`,
        metadata: { dealId },
      },
      { idempotencyKey: `checkout_${dealId}_${priceId}` }
    );

    // 2. Log to ArTimeline — find or create AR record to attach timeline entry
    const deal = await prisma.deal.findFirst({ where: { id: dealId, organizationId: ORG_ID, deletedAt: null } });
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

    // 4. Email the payment link via SMTP2GO if requested
    if (body.sendEmail !== false) {
      try {
        const customerName = name || "there";
        const emailRes = await fetch("https://api.smtp2go.com/v3/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: process.env.SMTP2GO_API_KEY,
            sender: "ZING <noreply@zing-work.com>",
            to: [`${customerName} <${email}>`],
            subject: "Your ZING Website — Complete Your Subscription",
            html_body: `
              <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
                <div style="background: #3A5AFF; padding: 24px 32px; border-radius: 12px 12px 0 0;">
                  <h1 style="color: #fff; margin: 0; font-size: 22px;">ZING Website Design</h1>
                </div>
                <div style="padding: 32px; background: #fff; border-radius: 0 0 12px 12px; border: 1px solid #E8EBF0;">
                  <p style="font-size: 16px; margin: 0 0 16px;">Hi ${customerName.split(" ")[0]},</p>
                  <p style="margin: 0 0 24px; color: #5a5f7a;">You're one step away from getting your new website started. Click the button below to complete your subscription for <strong>${productName || "your ZING plan"}</strong>.</p>
                  <a href="${session.url}" style="display: inline-block; background: #3A5AFF; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">Complete Your Subscription</a>
                  <p style="margin: 24px 0 0; font-size: 12px; color: #8b90a8;">If the button doesn't work, copy this link: ${session.url}</p>
                </div>
              </div>
            `,
          }),
        });
        const emailData = await emailRes.json();
        logger.info({ emailData }, "Payment link email sent");
      } catch (emailErr) {
        logger.warn({ err: emailErr }, "Failed to send payment link email — returning URL anyway");
      }
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      emailSent: body.sendEmail !== false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "Failed to create Stripe payment link");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
