import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

function getDefaultRange(): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from, to };
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { searchParams } = req.nextUrl;
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const defaults = getDefaultRange();
    const from = fromParam ? new Date(fromParam) : defaults.from;
    const to = toParam ? new Date(toParam) : defaults.to;

    // Normalize to end of day for "to"
    const toEndOfDay = new Date(to);
    toEndOfDay.setHours(23, 59, 59, 999);

    const todayStr = toDateString(new Date());
    const todayStart = new Date(todayStr);
    const todayEnd = new Date(todayStr);
    todayEnd.setHours(23, 59, 59, 999);

    // 1. period_revenue (only confirmed payments count as revenue)
    const periodDeals = await prisma.deal.findMany({
      where: {
        organizationId: ORG_ID,
        deletedAt: null,
        stage: "won",
        paymentStatus: "confirmed",
        wonDate: {
          gte: from,
          lte: toEndOfDay,
        },
      },
      select: { value: true, dealType: true, rep: true, wonDate: true },
    });

    const period_revenue = periodDeals.reduce(
      (sum, d) => sum + (d.value ? Number(d.value) : 0),
      0
    );

    // 2. today_revenue
    const todayDeals = await prisma.deal.findMany({
      where: {
        organizationId: ORG_ID,
        deletedAt: null,
        stage: "won",
        paymentStatus: "confirmed",
        wonDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      select: { value: true },
    });

    const today_revenue = todayDeals.reduce(
      (sum, d) => sum + (d.value ? Number(d.value) : 0),
      0
    );

    // 3. nrr
    const priorDeals = await prisma.deal.findMany({
      where: {
        organizationId: ORG_ID,
        deletedAt: null,
        stage: "won",
        paymentStatus: "confirmed",
        wonDate: { lt: from },
      },
      select: { value: true },
    });

    const starting_mrr = priorDeals.reduce(
      (sum, d) => sum + (d.value ? Number(d.value) : 0),
      0
    );

    const expansion_mrr = periodDeals
      .filter((d) => d.dealType === "upgrade" || d.dealType === "add-on")
      .reduce((sum, d) => sum + (d.value ? Number(d.value) : 0), 0);

    const nrr =
      starting_mrr > 0
        ? Math.round(((starting_mrr + expansion_mrr) / starting_mrr) * 100 * 10) / 10
        : 100;

    // 4. deal_type_breakdown
    const dealTypeMap: Record<string, { count: number; revenue: number }> = {};
    for (const deal of periodDeals) {
      const key = deal.dealType ?? "unknown";
      if (!dealTypeMap[key]) dealTypeMap[key] = { count: 0, revenue: 0 };
      dealTypeMap[key].count += 1;
      dealTypeMap[key].revenue += deal.value ? Number(deal.value) : 0;
    }

    const deal_type_breakdown = Object.entries(dealTypeMap).map(
      ([type, { count, revenue }]) => ({ type, count, revenue })
    );

    // 5. daily_revenue_chart
    const dayMap: Record<string, { revenue: number; count: number }> = {};

    // Populate all days in range with 0
    const cursor = new Date(from);
    cursor.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(to);
    rangeEnd.setHours(0, 0, 0, 0);

    while (cursor <= rangeEnd) {
      dayMap[toDateString(cursor)] = { revenue: 0, count: 0 };
      cursor.setDate(cursor.getDate() + 1);
    }

    for (const deal of periodDeals) {
      if (!deal.wonDate) continue;
      const dayKey = toDateString(deal.wonDate);
      if (dayMap[dayKey] !== undefined) {
        dayMap[dayKey].revenue += deal.value ? Number(deal.value) : 0;
        dayMap[dayKey].count += 1;
      }
    }

    const daily_revenue_chart = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { revenue, count }]) => ({ date, revenue, deal_count: count }));

    // 6. rep_leaderboard
    const repMap: Record<string, { total: number; count: number }> = {};
    for (const deal of periodDeals) {
      const key = deal.rep ?? "Unassigned";
      if (!repMap[key]) repMap[key] = { total: 0, count: 0 };
      repMap[key].total += deal.value ? Number(deal.value) : 0;
      repMap[key].count += 1;
    }

    const rep_leaderboard = Object.entries(repMap)
      .map(([rep, { total, count }]) => ({ rep, total_revenue: total, deal_count: count }))
      .sort((a, b) => b.total_revenue - a.total_revenue);

    // ─── NEW: All-time / live metrics ───────────────────────────────────────

    // 7. Live customers — all-time won + confirmed + stripeCustomerId
    const liveDeals = await prisma.deal.findMany({
      where: {
        organizationId: ORG_ID,
        deletedAt: null,
        stage: "won",
        paymentStatus: "confirmed",
        stripeCustomerId: { not: null },
      },
      select: { value: true, productId: true },
    });

    const mrr = liveDeals.reduce(
      (sum, d) => sum + (d.value ? Number(d.value) : 0),
      0
    );
    const arr = mrr * 12;
    const live_customers = liveDeals.length;
    const arpu = live_customers > 0 ? mrr / live_customers : 0;

    // 8. Churn rate
    const cancelledCount = await prisma.contact.count({
      where: {
        organizationId: ORG_ID,
        status: "Cancelled",
      },
    });

    const churn_rate =
      live_customers + cancelledCount > 0
        ? Math.round(
            (cancelledCount / (live_customers + cancelledCount)) * 100 * 10
          ) / 10
        : 0;

    // 9. Active leads (in pipeline, not won)
    const active_leads = await prisma.deal.count({
      where: {
        organizationId: ORG_ID,
        deletedAt: null,
        stage: { not: "won" },
      },
    });

    // 10. Product tier breakdown (group by product.description for live deals)
    const liveDealsWithProduct = await prisma.deal.findMany({
      where: {
        organizationId: ORG_ID,
        deletedAt: null,
        stage: "won",
        paymentStatus: "confirmed",
        stripeCustomerId: { not: null },
      },
      select: {
        value: true,
        product: { select: { description: true } },
      },
    });

    const tierMap: Record<string, { count: number; mrr: number }> = {};
    for (const d of liveDealsWithProduct) {
      const tier = d.product?.description ?? "Unknown";
      if (!tierMap[tier]) tierMap[tier] = { count: 0, mrr: 0 };
      tierMap[tier].count += 1;
      tierMap[tier].mrr += d.value ? Number(d.value) : 0;
    }

    const product_tier_breakdown = Object.entries(tierMap).map(
      ([tier, { count, mrr: tierMrr }]) => ({ tier, count, mrr: tierMrr })
    );

    // 11. Onboarding in queue (deletedAt=null and websiteStatus != 'published')
    const onboarding_in_queue = await prisma.onboarding.count({
      where: {
        organizationId: ORG_ID,
        deletedAt: null,
        websiteStatus: { not: "published" },
      },
    });

    // 12. Open tickets
    const open_tickets = await prisma.ticket.count({
      where: {
        organizationId: ORG_ID,
        deletedAt: null,
        status: { in: ["open", "in-progress"] },
      },
    });

    // 13. AR at risk
    const ar_at_risk = await prisma.arAccount.count({
      where: {
        organizationId: ORG_ID,
        deletedAt: null,
        status: { in: ["past-due", "unpaid"] },
      },
    });

    return NextResponse.json({
      // Period metrics
      period_revenue,
      today_revenue,
      nrr,
      deal_type_breakdown,
      daily_revenue_chart,
      rep_leaderboard,
      // All-time / live metrics
      mrr,
      arr,
      live_customers,
      arpu,
      churn_rate,
      active_leads,
      product_tier_breakdown,
      // Operational
      onboarding_in_queue,
      open_tickets,
      ar_at_risk,
    });
  } catch (err) {
    logger.error({ err }, "GET /api/dashboard error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
