import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

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

    return NextResponse.json({
      period_revenue,
      today_revenue,
      nrr,
      deal_type_breakdown,
      daily_revenue_chart,
      rep_leaderboard,
    });
  } catch (err) {
    logger.error({ err }, "GET /api/dashboard error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
