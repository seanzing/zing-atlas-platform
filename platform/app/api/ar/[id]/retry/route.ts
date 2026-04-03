import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { getStripe } from "@/lib/stripe-client";
import { requireAuth } from "@/lib/api-auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    // Look up AR account
    const account = await prisma.arAccount.findFirst({
      where: { id, organizationId: ORG_ID, deletedAt: null },
    });

    if (!account) {
      return NextResponse.json({ error: "AR account not found" }, { status: 404 });
    }

    if (!account.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer linked to this account" },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Find customer's latest open invoice
    const invoices = await stripe.invoices.list({
      customer: account.stripeCustomerId,
      status: "open",
      limit: 1,
    });

    if (!invoices.data.length) {
      return NextResponse.json(
        { error: "No open invoice found for this customer" },
        { status: 404 }
      );
    }

    const invoice = invoices.data[0];

    // Attempt to pay the invoice
    let paidInvoice;
    try {
      paidInvoice = await stripe.invoices.pay(invoice.id);
    } catch (stripePayError) {
      const stripeError = stripePayError as Stripe.errors.StripeError;

      // Add timeline entry for the failure
      await prisma.arTimeline.create({
        data: {
          arId: id,
          date: new Date(),
          type: "payment-retry-failed",
          note: `Retry failed: ${stripeError.message ?? "Unknown Stripe error"}`,
        },
      });

      if (stripeError.type) {
        logger.warn(
          { err: stripeError.message, code: stripeError.code },
          "Stripe payment retry failed"
        );
        return NextResponse.json(
          { success: false, error: stripeError.message },
          { status: 400 }
        );
      }
      throw stripePayError;
    }

    // Only update AR record AFTER successful payment
    const now = new Date();
    await prisma.arAccount.update({
      where: { id },
      data: {
        status: "active",
        amountDue: 0,
        lastPaymentDate: now,
        daysPastDue: 0,
      },
    });

    // Add timeline entry
    await prisma.arTimeline.create({
      data: {
        arId: id,
        date: now,
        type: "payment-retry",
        note: "Manual retry initiated from Atlas",
      },
    });

    logger.info(
      { arId: id, invoiceId: paidInvoice.id },
      "Payment retry successful"
    );

    return NextResponse.json({
      success: true,
      invoice: paidInvoice.id,
    });
  } catch (error) {
    logger.error({ err: error }, "POST /api/ar/[id]/retry error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
