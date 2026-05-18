"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useAuthContext } from "@/lib/auth-context";
import { Z, fmt } from "@/lib/constants";
import { PageLoader } from "@/components/PageLoader";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardData {
  period_revenue: number;
  today_revenue: number;
  nrr: number;
  deal_type_breakdown: { type: string; count: number; revenue: number }[];
  daily_revenue_chart: { date: string; revenue: number; deal_count: number }[];
  rep_leaderboard: { rep: string; total_revenue: number; deal_count: number }[];
  mrr: number;
  arr: number;
  live_customers: number;
  arpu: number;
  churn_rate: number;
  ltv: number | null;
  cac: number | null;
  ltv_cac_ratio: number | null;
  expansion_revenue: number;
  active_leads: number;
  product_tier_breakdown: { tier: string; count: number; mrr: number }[];
  onboarding_in_queue: number;
  open_tickets: number;
  ar_at_risk: number;
}

type Period = "this_month" | "last_month" | "ytd" | "custom";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getPeriodDates(period: Period, customFrom: string, customTo: string) {
  const now = new Date();
  if (period === "this_month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
      label: "This Month",
    };
  }
  if (period === "last_month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10),
      to: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10),
      label: "Last Month",
    };
  }
  if (period === "ytd") {
    return {
      from: new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
      label: "Year to Date",
    };
  }
  return {
    from: customFrom || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    to: customTo || now.toISOString().slice(0, 10),
    label: `${customFrom} → ${customTo}`,
  };
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AccentBar({ color }: { color: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: color,
        borderRadius: "16px 16px 0 0",
      }}
    />
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "1.2px",
        textTransform: "uppercase",
        color: Z.textMuted,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function BigNum({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 34,
        fontWeight: 700,
        letterSpacing: "-0.5px",
        color: Z.textPrimary,
        lineHeight: 1.1,
      }}
    >
      {children}
    </div>
  );
}

function SubNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        color: Z.textMuted,
        marginTop: 4,
      }}
    >
      {children}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent: string;
}) {
  return (
    <div
      style={{
        background: Z.card,
        border: `1px solid ${Z.border}`,
        borderRadius: 16,
        padding: "28px 24px 24px",
        position: "relative",
        overflow: "hidden",
        flex: 1,
        minWidth: 0,
      }}
    >
      <AccentBar color={accent} />
      <Label>{label}</Label>
      <BigNum>{value}</BigNum>
      {sub && <SubNote>{sub}</SubNote>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "1.4px",
        textTransform: "uppercase",
        color: Z.textMuted,
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthContext();
  const firstName =
    user?.teamMember?.firstName || user?.email?.split("@")[0] || "there";
  const greeting = getGreeting();

  const [period, setPeriod] = useState<Period>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { from, to, label: periodLabel } = getPeriodDates(period, customFrom, customTo);
  const apiUrl = `/api/dashboard?from=${from}&to=${to}`;

  const { data, isLoading } = useSWR<DashboardData>(apiUrl, fetcher, {
    refreshInterval: 60000,
  });

  if (isLoading || !data) return <PageLoader />;

  const todayStr = new Date().toISOString().slice(0, 10);
  const maxRevenue = Math.max(...data.daily_revenue_chart.map((d) => d.revenue), 1);
  const top5Reps = data.rep_leaderboard.slice(0, 5);
  const topRepRevenue = top5Reps[0]?.total_revenue || 1;
  const totalMrr = data.mrr || 1;

  // Deal type colors
  const dealTypeColor: Record<string, string> = {
    new: Z.ultramarine,
    upgrade: Z.violet,
    "add-on": "#22d3ee",
  };

  // Tier colors
  const tierColor: Record<string, string> = {
    DISCOVER: "#10b981",
    BOOST: "#3b82f6",
    DOMINATE: Z.violet,
  };
  function getTierColor(tier: string): string {
    const upper = tier.toUpperCase();
    for (const [key, val] of Object.entries(tierColor)) {
      if (upper.includes(key)) return val;
    }
    return Z.grey;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: Z.bg,
        padding: "32px 40px 60px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: Z.textPrimary,
            marginBottom: 4,
          }}
        >
          {greeting}, {firstName} ⚡
        </div>
        <div style={{ fontSize: 13, color: Z.textMuted }}>
          ZING Command Centre · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* ─── Period Selector ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28, alignItems: "center", flexWrap: "wrap" }}>
        {(["this_month", "last_month", "ytd", "custom"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: "7px 16px",
              borderRadius: 999,
              border: `1px solid ${period === p ? Z.ultramarine : Z.border}`,
              background: period === p ? Z.ultramarine : Z.card,
              color: period === p ? "#fff" : Z.textSecondary,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {p === "this_month" ? "This Month" : p === "last_month" ? "Last Month" : p === "ytd" ? "YTD" : "Custom"}
          </button>
        ))}
        {period === "custom" && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: `1px solid ${Z.border}`,
                fontSize: 13,
                color: Z.textPrimary,
                background: Z.card,
                outline: "none",
              }}
            />
            <span style={{ color: Z.textMuted, fontSize: 13 }}>→</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: `1px solid ${Z.border}`,
                fontSize: 13,
                color: Z.textPrimary,
                background: Z.card,
                outline: "none",
              }}
            />
          </>
        )}
      </div>

      {/* ─── Section 1: Core SaaS KPIs ───────────────────────────────────── */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <KpiCard
          label="Monthly Recurring Revenue"
          value={fmt(data.mrr)}
          sub={`×12 = ${fmt(data.arr)}`}
          accent={`linear-gradient(90deg, ${Z.ultramarine}, ${Z.ultramarineLight})`}
        />
        <KpiCard
          label="Annual Run Rate"
          value={fmt(data.arr)}
          sub="Based on current MRR"
          accent={`linear-gradient(90deg, ${Z.violet}, ${Z.violetLight})`}
        />
        <KpiCard
          label="Avg Revenue Per User"
          value={fmt(data.arpu)}
          sub="per customer / mo"
          accent="linear-gradient(90deg, #10b981, #6ee7b7)"
        />
        <KpiCard
          label="Live Customers"
          value={data.live_customers.toLocaleString()}
          sub={`${data.active_leads} leads in pipeline`}
          accent="linear-gradient(90deg, #22d3ee, #99f0e8)"
        />
        <KpiCard
          label="Net Revenue Retention"
          value={`${data.nrr}%`}
          sub={`Churn rate: ${pct(data.churn_rate)}`}
          accent="linear-gradient(90deg, #f59e0b, #fcd34d)"
        />
      </div>

      {/* ─── Section 1b: Remaining SaaS Valuation Metrics ───────────────── */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <KpiCard
          label="Churn Rate"
          value={pct(data.churn_rate)}
          sub={data.churn_rate === 0 ? "No cancellations" : `${data.live_customers} active · ${Math.round(data.live_customers * data.churn_rate / 100)} at risk`}
          accent="linear-gradient(90deg, #ef4444, #fca5a5)"
        />
        <KpiCard
          label="Lifetime Value (LTV)"
          value={data.ltv !== null ? fmt(data.ltv) : "—"}
          sub={data.ltv !== null ? `ARPU ÷ monthly churn` : "Insufficient churn data"}
          accent="linear-gradient(90deg, #8b5cf6, #c4b5fd)"
        />
        <KpiCard
          label="CAC"
          value={data.cac !== null ? fmt(data.cac) : "—"}
          sub="Requires cost tracking"
          accent="linear-gradient(90deg, #ec4899, #fbcfe8)"
        />
        <KpiCard
          label="LTV : CAC Ratio"
          value={data.ltv_cac_ratio !== null ? `${data.ltv_cac_ratio}x` : "—"}
          sub={data.ltv_cac_ratio !== null ? (data.ltv_cac_ratio >= 3 ? "✓ Healthy (3x+)" : "⚠ Below benchmark") : "Set CAC to calculate"}
          accent="linear-gradient(90deg, #06b6d4, #a5f3fc)"
        />
        <KpiCard
          label="Expansion Revenue"
          value={fmt(data.expansion_revenue)}
          sub={`Upgrades & add-ons · ${periodLabel}`}
          accent="linear-gradient(90deg, #10b981, #6ee7b7)"
        />
      </div>

      {/* ─── Period Revenue Banner ────────────────────────────────────────── */}
      <div
        style={{
          background: Z.card,
          border: `1px solid ${Z.border}`,
          borderRadius: 12,
          padding: "14px 24px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 32,
        }}
      >
        <div>
          <Label>{periodLabel} Revenue</Label>
          <span style={{ fontSize: 24, fontWeight: 700, color: Z.textPrimary }}>
            {fmt(data.period_revenue)}
          </span>
        </div>
        <div style={{ width: 1, height: 40, background: Z.border }} />
        <div>
          <Label>Today</Label>
          <span style={{ fontSize: 24, fontWeight: 700, color: Z.textPrimary }}>
            {fmt(data.today_revenue)}
          </span>
        </div>
      </div>

      {/* ─── Section 2: Chart + Leaderboard ──────────────────────────────── */}
      <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
        {/* Bar Chart */}
        <div
          style={{
            flex: "0 0 65%",
            background: Z.card,
            border: `1px solid ${Z.border}`,
            borderRadius: 16,
            padding: "24px 28px",
          }}
        >
          <SectionTitle>Daily New Revenue</SectionTitle>
          <div style={{ fontSize: 12, color: Z.textMuted, marginBottom: 16 }}>
            {periodLabel}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 4,
              height: 180,
              paddingBottom: 8,
              overflowX: "auto",
            }}
          >
            {data.daily_revenue_chart.map((day, i) => {
              const isToday = day.date === todayStr;
              const barHeight =
                day.revenue > 0
                  ? Math.max((day.revenue / maxRevenue) * 160, 4)
                  : 2;
              const dayNum = parseInt(day.date.slice(8, 10));
              const showLabel = i === 0 || dayNum % 5 === 0;
              return (
                <div
                  key={day.date}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flex: "1 0 auto",
                    minWidth: 12,
                    maxWidth: 28,
                  }}
                  title={`${day.date}: ${fmt(day.revenue)} (${day.deal_count} deals)`}
                >
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                    <div
                      style={{
                        width: "100%",
                        height: barHeight,
                        background:
                          day.revenue === 0
                            ? Z.borderLight
                            : isToday
                            ? "#6366f1"
                            : "linear-gradient(180deg, #818cf8, #4f46e5)",
                        borderRadius: "4px 4px 0 0",
                        opacity: day.revenue === 0 ? 0.5 : 1,
                        transition: "height 0.3s",
                      }}
                    />
                  </div>
                  {showLabel && (
                    <div
                      style={{
                        fontSize: 10,
                        color: Z.textMuted,
                        marginTop: 4,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {dayNum}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rep Leaderboard */}
        <div
          style={{
            flex: "0 0 35%",
            background: Z.card,
            border: `1px solid ${Z.border}`,
            borderRadius: 16,
            padding: "24px 28px",
          }}
        >
          <SectionTitle>Sales Leaderboard</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {top5Reps.length === 0 && (
              <div style={{ fontSize: 13, color: Z.textMuted }}>No data for this period.</div>
            )}
            {top5Reps.map((rep, idx) => (
              <div
                key={rep.rep}
                style={{
                  borderRadius: 10,
                  padding: "10px 12px",
                  background: idx === 0 ? "#fbbf2415" : "transparent",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: idx === 0 ? "#f59e0b" : Z.textMuted,
                        width: 16,
                      }}
                    >
                      #{idx + 1}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: Z.textPrimary }}>
                      {rep.rep}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        background: Z.borderLight,
                        color: Z.textMuted,
                        borderRadius: 999,
                        padding: "1px 8px",
                        fontWeight: 600,
                      }}
                    >
                      {rep.deal_count}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: Z.textPrimary }}>
                    {fmt(rep.total_revenue)}
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: Z.borderLight,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(rep.total_revenue / topRepRevenue) * 100}%`,
                      background: `linear-gradient(90deg, ${Z.ultramarine}, ${Z.violet})`,
                      borderRadius: 2,
                      transition: "width 0.4s",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Section 3: Deal Type | Tier Breakdown | Operational Health ─── */}
      <div style={{ display: "flex", gap: 20 }}>
        {/* Column 1 — Deal Type */}
        <div
          style={{
            flex: 1,
            background: Z.card,
            border: `1px solid ${Z.border}`,
            borderRadius: 16,
            padding: "24px 28px",
          }}
        >
          <SectionTitle>Revenue by Deal Type</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.deal_type_breakdown.length === 0 && (
              <div style={{ fontSize: 13, color: Z.textMuted }}>No deals this period.</div>
            )}
            {data.deal_type_breakdown.map((dt) => (
              <div
                key={dt.type}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: Z.borderLight,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: dealTypeColor[dt.type] ?? Z.grey,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: Z.textPrimary,
                      textTransform: "capitalize",
                    }}
                  >
                    {dt.type}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: Z.textMuted,
                      background: Z.border,
                      borderRadius: 999,
                      padding: "1px 8px",
                    }}
                  >
                    {dt.count}
                  </span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: Z.textPrimary }}>
                  {fmt(dt.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2 — Tier Breakdown */}
        <div
          style={{
            flex: 1,
            background: Z.card,
            border: `1px solid ${Z.border}`,
            borderRadius: 16,
            padding: "24px 28px",
          }}
        >
          <SectionTitle>Revenue by Tier</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.product_tier_breakdown.length === 0 && (
              <div style={{ fontSize: 13, color: Z.textMuted }}>No tier data yet.</div>
            )}
            {data.product_tier_breakdown.map((tier) => {
              const color = getTierColor(tier.tier);
              const pctMrr = totalMrr > 0 ? (tier.mrr / totalMrr) * 100 : 0;
              return (
                <div key={tier.tier}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 2,
                          background: color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: Z.textPrimary,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {tier.tier}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: Z.textMuted,
                          background: Z.borderLight,
                          borderRadius: 999,
                          padding: "1px 8px",
                        }}
                      >
                        {tier.count} customers
                      </span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: Z.textPrimary }}>
                      {fmt(tier.mrr)}/mo
                    </span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      borderRadius: 2,
                      background: Z.borderLight,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pctMrr}%`,
                        background: color,
                        borderRadius: 2,
                        transition: "width 0.4s",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3 — Operational Health */}
        <div
          style={{
            flex: 1,
            background: Z.card,
            border: `1px solid ${Z.border}`,
            borderRadius: 16,
            padding: "24px 28px",
          }}
        >
          <SectionTitle>Operational Health</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              {
                icon: "🔁",
                label: "Active Leads",
                value: data.active_leads,
                href: "/pipeline",
                danger: false,
              },
              {
                icon: "📋",
                label: "In Onboarding",
                value: data.onboarding_in_queue,
                href: "/onboarding",
                danger: false,
              },
              {
                icon: "🎫",
                label: "Open Tickets",
                value: data.open_tickets,
                href: "/support",
                danger: data.open_tickets > 0,
              },
              {
                icon: "⚠️",
                label: "AR at Risk",
                value: data.ar_at_risk,
                href: "/ar",
                danger: data.ar_at_risk > 0,
              },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: `1px solid ${Z.border}`,
                    background: Z.card,
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: Z.textSecondary,
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: item.danger ? "#ef4444" : Z.textPrimary,
                    }}
                  >
                    {item.value.toLocaleString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
