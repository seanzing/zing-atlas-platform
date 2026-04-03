import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { getStripe } from "@/lib/stripe-client";

export interface SyncSummary {
  synced: number;
  active: number;
  pastDue: number;
  unpaid: number;
  canceled: number;
}

/**
 * Fetches all Stripe subscriptions and upserts into ArAccount table.
 * Paginate through all pages; also cross-reference open invoices.
 */
export async function syncStripeToAR(): Promise<SyncSummary> {
  const summary: SyncSummary = {
    synced: 0,
    active: 0,
    pastDue: 0,
    unpaid: 0,
    canceled: 0,
  };

  // 1. Fetch all subscriptions with pagination
  const subscriptions: Stripe.Subscription[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const params: Stripe.SubscriptionListParams = {
      limit: 100,
      expand: ["data.customer", "data.latest_invoice"],
      status: "all",
    };
    if (startingAfter) params.starting_after = startingAfter;

    const page = await getStripe().subscriptions.list(params);
    subscriptions.push(...page.data);
    hasMore = page.has_more;
    if (page.data.length > 0) {
      startingAfter = page.data[page.data.length - 1].id;
    }
  }

  // Filter to relevant statuses
  const relevantStatuses = new Set(["active", "past_due", "unpaid", "canceled"]);
  const filtered = subscriptions.filter((s) => relevantStatuses.has(s.status));

  // 2. Also fetch open invoices separately for cross-reference
  const openInvoices: Stripe.Invoice[] = [];
  let invoiceHasMore = true;
  let invoiceStartingAfter: string | undefined;

  while (invoiceHasMore) {
    const params: Stripe.InvoiceListParams = { limit: 100, status: "open" };
    if (invoiceStartingAfter) params.starting_after = invoiceStartingAfter;

    const page = await getStripe().invoices.list(params);
    openInvoices.push(...page.data);
    invoiceHasMore = page.has_more;
    if (page.data.length > 0) {
      invoiceStartingAfter = page.data[page.data.length - 1].id;
    }
  }

  // Index open invoices by customer ID for quick lookup
  const openInvoicesByCustomer = new Map<string, Stripe.Invoice[]>();
  for (const inv of openInvoices) {
    const custId =
      typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
    if (!custId) continue;
    if (!openInvoicesByCustomer.has(custId)) {
      openInvoicesByCustomer.set(custId, []);
    }
    openInvoicesByCustomer.get(custId)!.push(inv);
  }

  // 3. Upsert each subscription into ArAccount
  const now = new Date();

  for (const sub of filtered) {
    try {
      const customer = sub.customer as Stripe.Customer;
      const invoice = sub.latest_invoice as Stripe.Invoice | null;

      const customerName = customer?.name || customer?.description || "Unknown";
      const email = customer?.email || null;
      const phone = customer?.phone || null;
      const stripeCustomerId = customer?.id || null;

      // Determine product name from first item
      let productName = "Unknown";
      if (sub.items?.data?.[0]) {
        const item = sub.items.data[0];
        const price = item.price;
        productName =
          price?.nickname ||
          (typeof price?.product === "object" && price.product
            ? (price.product as Stripe.Product).name
            : null) ||
          "Subscription";
      }

      // Calculate MRR (convert from cents)
      const mrr =
        sub.items?.data?.[0]?.price?.unit_amount != null
          ? sub.items.data[0].price.unit_amount / 100
          : 0;

      // Days past due
      let daysPastDue = 0;
      if (
        (sub.status === "past_due" || sub.status === "unpaid") &&
        invoice?.due_date
      ) {
        const dueDate = new Date(invoice.due_date * 1000);
        daysPastDue = Math.max(
          0,
          Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        );
      }

      // Amount due
      const amountDue =
        invoice && invoice.status !== "paid" && invoice.amount_due != null
          ? invoice.amount_due / 100
          : 0;

      // Last payment date
      let lastPaymentDate: Date | null = null;
      if (invoice?.status_transitions?.paid_at) {
        lastPaymentDate = new Date(invoice.status_transitions.paid_at * 1000);
      }

      // Failed date
      let failedDate: Date | null = null;
      if (
        (invoice?.status === "open" || sub.status === "past_due") &&
        invoice?.status_transitions?.finalized_at
      ) {
        failedDate = new Date(invoice.status_transitions.finalized_at * 1000);
      }

      // Subscription created
      const subscriptionCreated = new Date(sub.created * 1000);

      // Map Stripe status to our status values
      const statusMap: Record<string, string> = {
        active: "active",
        past_due: "past_due",
        unpaid: "unpaid",
        canceled: "canceled",
      };
      const arStatus = statusMap[sub.status] || sub.status;

      // Upsert using stripeStatus (subscription ID) as idempotency key
      await prisma.arAccount.upsert({
        where: {
          // Find by stripe subscription ID stored in stripeStatus
          id: await findOrCreateArId(sub.id, stripeCustomerId),
        },
        update: {
          businessName: customerName,
          customerName,
          email,
          phone,
          product: productName,
          mrr,
          status: arStatus,
          stripeCustomerId,
          daysPastDue,
          amountDue,
          lastPaymentDate,
          failedDate,
          updatedAt: now,
        },
        create: {
          organizationId: ORG_ID,
          businessName: customerName,
          customerName,
          email,
          phone,
          product: productName,
          mrr,
          status: arStatus,
          stripeStatus: sub.id,
          stripeCustomerId,
          daysPastDue,
          amountDue,
          lastPaymentDate,
          failedDate,
          subscriptionCreated,
        },
      });

      summary.synced++;
      if (arStatus === "active") summary.active++;
      else if (arStatus === "past_due") summary.pastDue++;
      else if (arStatus === "unpaid") summary.unpaid++;
      else if (arStatus === "canceled") summary.canceled++;
    } catch (err) {
      logger.error(
        { err, subscriptionId: sub.id },
        "Failed to sync subscription to AR"
      );
    }
  }

  logger.info(summary, "Stripe sync complete");
  return summary;
}

/**
 * Find existing AR account by stripe subscription ID (stripeStatus),
 * or return a new UUID for creation.
 */
async function findOrCreateArId(
  subscriptionId: string,
  stripeCustomerId: string | null
): Promise<string> {
  const existing = await prisma.arAccount.findFirst({
    where: {
      stripeStatus: subscriptionId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (existing) return existing.id;

  // Also try matching by stripeCustomerId if available
  if (stripeCustomerId) {
    const byCustomer = await prisma.arAccount.findFirst({
      where: {
        stripeCustomerId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (byCustomer) return byCustomer.id;
  }

  // Generate new UUID for creation
  return crypto.randomUUID();
}
