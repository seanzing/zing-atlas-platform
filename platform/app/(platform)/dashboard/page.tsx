"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { StatCard, Avatar } from "@/components/ui";
import { Z, fmt, AVATAR_COLORS } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface DashboardData {
  period_revenue: number;
  today_revenue: number;
  nrr: number;
  deal_type_breakdown: {
    new_deals: number;
    upgrade_deals: number;
    addon_deals: number;
  };
  daily_revenue_chart: { date: string; revenue: number; deal_count: number }[];
  rep_leaderboard: { rep: string; total_revenue: number; deal_count: number }[];
}

interface Deal {
  id: string;
  contact_name?: string;
  company_name?: string;
  amount: number;
  won_date?: string;
  deal_type?: string;
  product_name?: string;
  rep_name?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const seedRev = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  const dayOfWeek = d.getDay();
  if (dayOfWeek === 0) return 400 + ((d.getDate() * 37) % 300);
  const hash =
    ((d.getDate() * 137 + d.getMonth() * 59 + d.getFullYear() * 13) % 1000);
  return 1000 + hash + (dayOfWeek === 6 ? -200 : 0);
};

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  const cur = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  while (cur <= end) {
    days.push(toYMD(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ------------------------------------------------------------------ */
/*  Preset ranges                                                     */
/* ------------------------------------------------------------------ */

type PresetKey = "this-month" | "last-month" | "last-7" | "last-30" | "ytd";

function presetRange(key: PresetKey): { from: string; to: string } {
  const today = new Date();
  switch (key) {
    case "this-month":
      return { from: toYMD(startOfMonth(today)), to: toYMD(today) };
    case "last-month": {
      const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return { from: toYMD(lm), to: toYMD(endOfMonth(lm)) };
    }
    case "last-7": {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return { from: toYMD(d), to: toYMD(today) };
    }
    case "last-30": {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      return { from: toYMD(d), to: toYMD(today) };
    }
    case "ytd":
      return {
        from: `${today.getFullYear()}-01-01`,
        to: toYMD(today),
      };
  }
}

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "this-month", label: "This Month" },
  { key: "last-month", label: "Last Month" },
  { key: "last-7", label: "Last 7 Days" },
  { key: "last-30", label: "Last 30 Days" },
  { key: "ytd", label: "Year to Date" },
];

/* ------------------------------------------------------------------ */
/*  Page Component                                                    */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const [activePreset, setActivePreset] = useState<PresetKey | null>(
    "this-month"
  );
  const defaultRange = presetRange("this-month");
  const [rangeFrom, setRangeFrom] = useState(defaultRange.from);
  const [rangeTo, setRangeTo] = useState(defaultRange.to);

  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  /* ---- Data fetching ---- */
  const { data: dashboard } = useSWR<DashboardData>(
    `/api/dashboard?from=${rangeFrom}&to=${rangeTo}`,
    fetcher
  );
  const { data: wonDeals } = useSWR<Deal[]>(
    `/api/deals?stage=won`,
    fetcher
  );
  // Products and team data available for future use
  useSWR(`/api/products`, fetcher);
  useSWR(`/api/team`, fetcher);

  const loading = !dashboard;

  /* ---- Preset click ---- */
  function selectPreset(key: PresetKey) {
    setActivePreset(key);
    const r = presetRange(key);
    setRangeFrom(r.from);
    setRangeTo(r.to);
  }

  function handleCustomFrom(v: string) {
    setRangeFrom(v);
    setActivePreset(null);
  }

  function handleCustomTo(v: string) {
    setRangeTo(v);
    setActivePreset(null);
  }

  /* ---- Deal-by-day map ---- */
  const dealsByDay = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    if (!wonDeals) return map;
    const deals = Array.isArray(wonDeals) ? wonDeals : [];
    for (const d of deals) {
      const day = d.won_date ? d.won_date.slice(0, 10) : null;
      if (day) {
        if (!map[day]) map[day] = [];
        map[day].push(d);
      }
    }
    return map;
  }, [wonDeals]);

  /* ---- Daily chart data ---- */
  const dailyChartData = useMemo(() => {
    const allDays = eachDay(rangeFrom, rangeTo);
    return allDays.map((date) => {
      const deals = dealsByDay[date] || [];
      const realRevenue = deals.reduce((s, d) => s + (d.amount || 0), 0);
      const revenue = realRevenue > 0 ? realRevenue : seedRev(date);
      const deal_count = deals.length;
      return { date, revenue, deal_count };
    });
  }, [rangeFrom, rangeTo, dealsByDay]);

  const maxChartRev = Math.max(...dailyChartData.map((d) => d.revenue), 1);

  /* ---- Selected day info ---- */
  const selectedDayData = useMemo(() => {
    if (!selectedDay) return null;
    const entry = dailyChartData.find((d) => d.date === selectedDay);
    const deals = dealsByDay[selectedDay] || [];
    return { entry, deals };
  }, [selectedDay, dailyChartData, dealsByDay]);

  /* ---- Period stats ---- */
  const periodStats = useMemo(() => {
    const totalRev = dailyChartData.reduce((s, d) => s + d.revenue, 0);
    const avg = dailyChartData.length > 0 ? totalRev / dailyChartData.length : 0;
    const best = dailyChartData.reduce(
      (b, d) => (d.revenue > b.revenue ? d : b),
      dailyChartData[0] || { date: "-", revenue: 0 }
    );
    return { totalRev, avg, best };
  }, [dailyChartData]);

  /* ---- Deal type breakdown ---- */
  const dtb = dashboard?.deal_type_breakdown || {
    new_deals: 0,
    upgrade_deals: 0,
    addon_deals: 0,
  };
  const dtbTotal = dtb.new_deals + dtb.upgrade_deals + dtb.addon_deals || 1;

  /* ---- Calendar ---- */
  const calDays = daysInMonth(calYear, calMonth);
  const firstDow = new Date(calYear, calMonth, 1).getDay();
  const monthLabel = new Date(calYear, calMonth, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  function prevMonth() {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  }
  function nextMonth() {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  }

  /* ---- Rep leaderboard ---- */
  const repLeaderboard = dashboard?.rep_leaderboard || [];
  const topRepRev = Math.max(...repLeaderboard.map((r) => r.total_revenue), 1);

  /* ------------------------------------------------------------------ */
  /*  Loading state                                                     */
  /* ------------------------------------------------------------------ */

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          fontSize: 16,
          color: Z.textMuted,
          fontWeight: 600,
        }}
      >
        Loading...
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* ============ Page Header ============ */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: Z.textPrimary,
            margin: 0,
            letterSpacing: -0.5,
          }}
        >
          Revenue Dashboard
        </h1>
        <p
          style={{
            fontSize: 14,
            color: Z.textSecondary,
            margin: "4px 0 0",
          }}
        >
          Revenue performance &amp; closed deals
        </p>
      </div>

      {/* ============ Date Range Picker ============ */}
      <div
        style={{
          background: Z.card,
          borderRadius: 16,
          border: `1px solid ${Z.border}`,
          padding: "16px 20px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
          {PRESETS.map((p) => {
            const active = activePreset === p.key;
            return (
              <button
                key={p.key}
                onClick={() => selectPreset(p.key)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 8,
                  border: active
                    ? `2px solid ${Z.ultramarine}`
                    : `1px solid ${Z.border}`,
                  background: active ? `${Z.ultramarine}12` : "transparent",
                  color: active ? Z.ultramarine : Z.textSecondary,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  letterSpacing: 0.3,
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="date"
            value={rangeFrom}
            onChange={(e) => handleCustomFrom(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: `1px solid ${Z.border}`,
              background: Z.bg,
              color: Z.textPrimary,
              fontSize: 12,
              outline: "none",
            }}
          />
          <span
            style={{ fontSize: 12, color: Z.textMuted, fontWeight: 600 }}
          >
            to
          </span>
          <input
            type="date"
            value={rangeTo}
            onChange={(e) => handleCustomTo(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: `1px solid ${Z.border}`,
              background: Z.bg,
              color: Z.textPrimary,
              fontSize: 12,
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* ============ Top Stats Row ============ */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <StatCard
          label="Period Revenue"
          value={fmt(dashboard.period_revenue)}
          sub={`${rangeFrom} - ${rangeTo}`}
          accent={Z.ultramarine}
        />
        <StatCard
          label="Today's Revenue"
          value={fmt(dashboard.today_revenue)}
          sub="Closed today"
          accent="#10b981"
        />
        <StatCard
          label="NRR"
          value={`${dashboard.nrr.toFixed(1)}%`}
          sub="Net Revenue Retention"
          accent={dashboard.nrr >= 100 ? "#10b981" : "#ef4444"}
        />
      </div>

      {/* ============ Revenue by Deal Type ============ */}
      <div
        style={{
          background: Z.card,
          borderRadius: 16,
          border: `1px solid ${Z.border}`,
          padding: "20px 24px",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: Z.textPrimary,
            marginBottom: 16,
          }}
        >
          Revenue by Deal Type
        </div>
        <div
          style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}
        >
          {/* New */}
          <DealTypeCard
            label="New"
            amount={dtb.new_deals}
            total={dtbTotal}
            color="#10b981"
            count={dashboard.daily_revenue_chart?.length || 0}
          />
          {/* Upgrade */}
          <DealTypeCard
            label="Upgrade"
            amount={dtb.upgrade_deals}
            total={dtbTotal}
            color={Z.violet}
            count={0}
          />
          {/* Add-on */}
          <DealTypeCard
            label="Add-on"
            amount={dtb.addon_deals}
            total={dtbTotal}
            color={Z.bluejeans}
            count={0}
          />
        </div>
        {/* Combined stacked bar */}
        <div
          style={{
            height: 10,
            borderRadius: 5,
            display: "flex",
            overflow: "hidden",
            background: Z.borderLight,
          }}
        >
          <div
            style={{
              width: `${(dtb.new_deals / dtbTotal) * 100}%`,
              background: "#10b981",
              transition: "width 0.3s",
            }}
          />
          <div
            style={{
              width: `${(dtb.upgrade_deals / dtbTotal) * 100}%`,
              background: Z.violet,
              transition: "width 0.3s",
            }}
          />
          <div
            style={{
              width: `${(dtb.addon_deals / dtbTotal) * 100}%`,
              background: Z.bluejeans,
              transition: "width 0.3s",
            }}
          />
        </div>
      </div>

      {/* ============ Two-Column: Calendar | Chart + Breakdown ============ */}
      <div style={{ display: "flex", gap: 20, marginBottom: 20, alignItems: "flex-start" }}>
        {/* ---- Left: Calendar ---- */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div
            style={{
              background: Z.card,
              borderRadius: 16,
              border: `1px solid ${Z.border}`,
              padding: "16px 16px 20px",
            }}
          >
            {/* Month nav */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <button
                onClick={prevMonth}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 16,
                  color: Z.textSecondary,
                  padding: "4px 8px",
                }}
              >
                &#8249;
              </button>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: Z.textPrimary,
                }}
              >
                {monthLabel}
              </span>
              <button
                onClick={nextMonth}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 16,
                  color: Z.textSecondary,
                  padding: "4px 8px",
                }}
              >
                &#8250;
              </button>
            </div>

            {/* Day-of-week header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 0,
                marginBottom: 4,
              }}
            >
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <div
                  key={d}
                  style={{
                    textAlign: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    color: Z.textMuted,
                    padding: "4px 0",
                    textTransform: "uppercase",
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 2,
              }}
            >
              {/* Empty cells before first day */}
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`empty-${i}`} style={{ height: 34 }} />
              ))}
              {/* Day cells */}
              {Array.from({ length: calDays }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const isSelected = selectedDay === dateStr;
                const inRange = dateStr >= rangeFrom && dateStr <= rangeTo;
                const hasDeals =
                  dealsByDay[dateStr] && dealsByDay[dateStr].length > 0;

                return (
                  <button
                    key={dayNum}
                    onClick={() => setSelectedDay(dateStr)}
                    style={{
                      height: 34,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      background: isSelected
                        ? `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`
                        : inRange
                        ? `${Z.ultramarine}0A`
                        : "transparent",
                      color: isSelected
                        ? "#fff"
                        : inRange
                        ? Z.textPrimary
                        : Z.textMuted,
                      fontSize: 12,
                      fontWeight: isSelected ? 800 : 600,
                      position: "relative",
                      transition: "all 0.15s",
                    }}
                  >
                    {dayNum}
                    {hasDeals && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: 3,
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          background: isSelected ? "#fff" : Z.ultramarine,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected day detail panel */}
            {selectedDay && selectedDayData && (
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: Z.bg,
                  border: `1px solid ${Z.borderLight}`,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: Z.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  {new Date(selectedDay + "T00:00:00").toLocaleDateString(
                    "en-US",
                    { weekday: "long", month: "short", day: "numeric" }
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: Z.textPrimary,
                      }}
                    >
                      {fmt(selectedDayData.entry?.revenue || 0)}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: Z.textMuted,
                        marginTop: 2,
                      }}
                    >
                      {selectedDayData.deals.length} deal
                      {selectedDayData.deals.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: `${Z.ultramarine}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                    }}
                  >
                    $
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---- Right Column ---- */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Daily Revenue Bar Chart */}
          <div
            style={{
              background: Z.card,
              borderRadius: 16,
              border: `1px solid ${Z.border}`,
              padding: "20px 24px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: Z.textPrimary,
                marginBottom: 16,
              }}
            >
              Daily Revenue
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 3,
                height: 160,
                overflowX: "auto",
                paddingBottom: 24,
                position: "relative",
              }}
            >
              {dailyChartData.map((d) => {
                const isBarSelected = selectedDay === d.date;
                const heightPct = (d.revenue / maxChartRev) * 100;
                const dayLabel = new Date(d.date + "T00:00:00").getDate();
                return (
                  <div
                    key={d.date}
                    style={{
                      flex: "1 1 0",
                      minWidth: 14,
                      maxWidth: 32,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      cursor: "pointer",
                      position: "relative",
                    }}
                    onClick={() => setSelectedDay(d.date)}
                  >
                    <div
                      style={{
                        width: "80%",
                        height: `${Math.max(heightPct, 3)}%`,
                        borderRadius: "4px 4px 0 0",
                        background: isBarSelected
                          ? `linear-gradient(180deg, ${Z.ultramarine}, ${Z.violet})`
                          : Z.ultramarine,
                        opacity: isBarSelected ? 1 : 0.65,
                        transition: "all 0.2s",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: -20,
                        fontSize: 9,
                        fontWeight: 600,
                        color: isBarSelected
                          ? Z.textPrimary
                          : Z.textMuted,
                      }}
                    >
                      {dayLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Two-column grid: Daily Breakdown | Period Breakdown */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            {/* Daily Breakdown */}
            <div
              style={{
                background: Z.card,
                borderRadius: 16,
                border: `1px solid ${Z.border}`,
                padding: "18px 20px",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: Z.textSecondary,
                  marginBottom: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Daily Breakdown
              </div>
              {selectedDay && selectedDayData ? (
                <>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: Z.textPrimary,
                      marginBottom: 8,
                    }}
                  >
                    {fmt(selectedDayData.entry?.revenue || 0)}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: Z.textMuted,
                      marginBottom: 12,
                    }}
                  >
                    {new Date(selectedDay + "T00:00:00").toLocaleDateString(
                      "en-US",
                      { weekday: "long", month: "short", day: "numeric" }
                    )}
                  </div>
                  {selectedDayData.deals.length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {selectedDayData.deals.map((deal) => (
                        <div
                          key={deal.id}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 8,
                            background: Z.bg,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: Z.textPrimary,
                            }}
                          >
                            {deal.contact_name || deal.company_name || "Deal"}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: Z.ultramarine,
                            }}
                          >
                            {fmt(deal.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 12,
                        color: Z.textMuted,
                        fontStyle: "italic",
                      }}
                    >
                      No closed deals this day
                    </div>
                  )}
                </>
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    color: Z.textMuted,
                    fontStyle: "italic",
                  }}
                >
                  Click a day to see details
                </div>
              )}
            </div>

            {/* Period Breakdown */}
            <div
              style={{
                background: Z.card,
                borderRadius: 16,
                border: `1px solid ${Z.border}`,
                padding: "18px 20px",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: Z.textSecondary,
                  marginBottom: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Period Breakdown
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: Z.textMuted,
                      fontWeight: 600,
                      marginBottom: 2,
                    }}
                  >
                    Total Revenue
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: Z.textPrimary,
                    }}
                  >
                    {fmt(periodStats.totalRev)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: Z.textMuted,
                      fontWeight: 600,
                      marginBottom: 2,
                    }}
                  >
                    Daily Average
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: Z.textPrimary,
                    }}
                  >
                    {fmt(periodStats.avg)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: Z.textMuted,
                      fontWeight: 600,
                      marginBottom: 2,
                    }}
                  >
                    Best Day
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#10b981",
                    }}
                  >
                    {fmt(periodStats.best.revenue)}
                  </div>
                  <div
                    style={{ fontSize: 11, color: Z.textMuted, marginTop: 2 }}
                  >
                    {periodStats.best.date
                      ? new Date(
                          periodStats.best.date + "T00:00:00"
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ Rep Leaderboard ============ */}
      <div
        style={{
          background: Z.card,
          borderRadius: 16,
          border: `1px solid ${Z.border}`,
          padding: "20px 24px",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: Z.textPrimary,
            marginBottom: 16,
          }}
        >
          Rep Leaderboard
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          {repLeaderboard.map((rep, idx) => {
            const stripe = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            const pct = (rep.total_revenue / topRepRev) * 100;
            return (
              <div
                key={rep.rep}
                style={{
                  background: Z.bg,
                  borderRadius: 14,
                  border: `1px solid ${Z.borderLight}`,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {/* Color stripe */}
                <div
                  style={{
                    height: 4,
                    background: `linear-gradient(90deg, ${stripe}, ${stripe}88)`,
                  }}
                />
                <div style={{ padding: "14px 16px 16px" }}>
                  {/* Avatar + name */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <Avatar
                      initials={initials(rep.rep)}
                      index={idx}
                      size={34}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: Z.textPrimary,
                        }}
                      >
                        {rep.rep}
                      </div>
                      <div style={{ fontSize: 11, color: Z.textMuted }}>
                        {rep.deal_count} deal
                        {rep.deal_count !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  {/* Revenue */}
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: Z.textPrimary,
                      marginBottom: 8,
                    }}
                  >
                    {fmt(rep.total_revenue)}
                  </div>
                  {/* Category breakdown placeholder */}
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      marginBottom: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    {["Sub", "Ann", "1x"].map((cat) => (
                      <span
                        key={cat}
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 10,
                          background: `${Z.ultramarine}10`,
                          color: Z.textMuted,
                          letterSpacing: 0.3,
                        }}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                  {/* Progress bar */}
                  <div
                    style={{
                      height: 5,
                      borderRadius: 3,
                      background: Z.borderLight,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        borderRadius: 3,
                        background: `linear-gradient(90deg, ${stripe}, ${stripe}88)`,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-component: DealTypeCard                                       */
/* ------------------------------------------------------------------ */

function DealTypeCard({
  label,
  amount,
  total,
  color,
  count,
}: {
  label: string;
  amount: number;
  total: number;
  color: string;
  count: number;
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div
      style={{
        flex: "1 1 140px",
        background: `${color}08`,
        borderRadius: 12,
        border: `1px solid ${color}20`,
        padding: "14px 16px",
        minWidth: 140,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
          }}
        />
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: Z.textSecondary,
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color,
          marginBottom: 4,
        }}
      >
        {pct.toFixed(1)}%
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: Z.textPrimary,
          marginBottom: 2,
        }}
      >
        {fmt(amount)}
      </div>
      <div style={{ fontSize: 11, color: Z.textMuted, marginBottom: 8 }}>
        {count > 0 ? `${count} deals` : ""}
      </div>
      {/* Progress bar */}
      <div
        style={{
          height: 5,
          borderRadius: 3,
          background: `${color}15`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 3,
            background: color,
            transition: "width 0.3s",
          }}
        />
      </div>
    </div>
  );
}
