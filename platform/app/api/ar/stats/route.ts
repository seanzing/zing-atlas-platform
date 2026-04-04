import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const ACTIVE_STATUSES = ["current", "active"];
const OWED_STATUSES = ["past-due", "past_due", "unpaid"];

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    // Pull all AR account counts and MRR from DB
    const [allAccounts, mrrResult] = await Promise.all([
      prisma.arAccount.groupBy({
        by: ["status"],
        where: { organizationId: ORG_ID, deletedAt: null },
        _count: true,
        _sum: { mrr: true },
      }),
      prisma.arAccount.aggregate({
        where: {
          organizationId: ORG_ID,
          deletedAt: null,
          status: { in: [...ACTIVE_STATUSES, ...OWED_STATUSES, "trialing"] },
        },
        _sum: { mrr: true },
        _count: true,
      }),
    ]);

    const totalCustomers = allAccounts.reduce((s, g) => s + g._count, 0);
    const activeCount = allAccounts
      .filter((g) => ACTIVE_STATUSES.includes(g.status ?? ""))
      .reduce((s, g) => s + g._count, 0);
    const pastDueCount = allAccounts
      .filter((g) => ["past-due", "past_due"].includes(g.status ?? ""))
      .reduce((s, g) => s + g._count, 0);
    const unpaidCount = allAccounts
      .filter((g) => (g.status ?? "") === "unpaid")
      .reduce((s, g) => s + g._count, 0);

    const totalMRR = Number(mrrResult._sum.mrr ?? 0);
    const totalSubscriptions = mrrResult._count;

    // Pull this month's Stripe revenue (paid invoices + one-time charges)
    const now = new Date();
    const startOfMonth = Math.floor(
      new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000
    );

    let monthlyRecurring = 0;
    let monthlyOneTime = 0;

    // Paginate through all paid invoices this month
    let invoiceAfter: string | undefined;
    do {
      const invoices = await stripe.invoices.list({
        status: "paid",
        created: { gte: startOfMonth },
        limit: 100,
        ...(invoiceAfter ? { starting_after: invoiceAfter } : {}),
      });
      for (const inv of invoices.data) {
        monthlyRecurring += inv.amount_paid;
      }
      invoiceAfter = invoices.has_more ? invoices.data[invoices.data.length - 1].id : undefined;
    } while (invoiceAfter);

    // Paginate through one-time charges (no invoice) this month
    let chargeAfter: string | undefined;
    do {
      const charges = await stripe.charges.list({
        created: { gte: startOfMonth },
        limit: 100,
        ...(chargeAfter ? { starting_after: chargeAfter } : {}),
      });
      for (const c of charges.data) {
        if (c.status === "succeeded" && !(c as unknown as Record<string, unknown>).invoice) {
          monthlyOneTime += c.amount;
        }
      }
      chargeAfter = charges.has_more ? charges.data[charges.data.length - 1].id : undefined;
    } while (chargeAfter);

    const totalMonthlyRevenue = (monthlyRecurring + monthlyOneTime) / 100;

    return NextResponse.json({
      totalCustomers,
      totalSubscriptions,
      activeCount,
      pastDueCount,
      unpaidCount,
      totalMRR,
      monthlyRecurring: monthlyRecurring / 100,
      monthlyOneTime: monthlyOneTime / 100,
      totalMonthlyRevenue,
      month: now.toLocaleString("en-US", { month: "long", year: "numeric" }),
    });
  } catch (error) {
    logger.error({ err: error }, "GET /api/ar/stats error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
