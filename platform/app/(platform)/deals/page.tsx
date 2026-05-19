"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { PageLoader } from "@/components/PageLoader";
import { SearchBar, FilterBtn } from "@/components/ui";
import { Z, fmt, STAGES } from "@/lib/constants";
import { CopyableText } from "@/components/CopyableText";

interface Deal {
  id: string;
  title: string;
  stage: string;
  value: number | null;
  rep: string | null;
  dealType: string | null;
  contactName: string | null;
  wonDate: string | null;
  createdAt: string;
  contact: {
    id: string;
    name: string | null;
    company: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  product: {
    id: string;
    name: string | null;
    description: string | null;
  } | null;
}

const STAGE_COLORS: Record<string, string> = {
  won: "#10b981",
  "link-sent": "#06b6d4",
  active: Z.turquoise,
  appointment: Z.bluejeans,
  "hot-72": "#f59e0b",
  "call-now": "#ef4444",
  "call-no-answer": Z.grey,
  "appt-no-show": Z.violet,
  "marketing-appt": Z.ultramarine,
  "promo-hot": Z.purple,
  "promo-cold": "#a855f7",
};

const STAGE_LABELS: Record<string, string> = Object.fromEntries(
  STAGES.map((s) => [s.key, s.label])
);

const DATE_PRESETS = [
  { key: "all", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "this-week", label: "This Week" },
  { key: "this-month", label: "This Month" },
  { key: "last-month", label: "Last Month" },
];

function getPresetRange(preset: string): { from: Date; to: Date } | null {
  if (preset === "all") return null;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400000 - 1);
  if (preset === "today") return { from: startOfDay, to: endOfDay };
  if (preset === "this-week") {
    const dow = now.getDay();
    const from = new Date(startOfDay.getTime() - dow * 86400000);
    return { from, to: endOfDay };
  }
  if (preset === "this-month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { from, to };
  }
  if (preset === "last-month") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { from, to };
  }
  return null;
}

export default function AllDealsPage() {
  const { data: deals } = useSWR<Deal[]>("/api/deals");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [datePreset, setDatePreset] = useState("all");

  const filtered = useMemo(() => {
    if (!deals) return [];
    const range = getPresetRange(datePreset);
    return deals.filter((d) => {
      // Stage filter
      if (stageFilter !== "all" && d.stage !== stageFilter) return false;

      // Date filter
      if (range) {
        const date = new Date(d.createdAt);
        if (date < range.from || date > range.to) return false;
      }

      // Search
      if (search) {
        const q = search.toLowerCase();
        const hit =
          (d.contactName || "").toLowerCase().includes(q) ||
          (d.contact?.name || "").toLowerCase().includes(q) ||
          (d.contact?.company || "").toLowerCase().includes(q) ||
          (d.contact?.email || "").toLowerCase().includes(q) ||
          (d.rep || "").toLowerCase().includes(q) ||
          (d.product?.description || "").toLowerCase().includes(q) ||
          (d.dealType || "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [deals, stageFilter, datePreset, search]);

  if (!deals) return <PageLoader />;

  const totalValue = filtered.reduce((sum, d) => sum + (d.value ?? 0), 0);
  const wonDeals = filtered.filter((d) => d.stage === "won");

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: Z.textPrimary, margin: "0 0 4px" }}>
          All Deals
        </h1>
        <p style={{ color: Z.textMuted, fontSize: 14, margin: 0 }}>
          Every deal across all reps and stages
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Deals", value: filtered.length, color: Z.ultramarine },
          { label: "Won", value: wonDeals.length, color: "#10b981" },
          { label: "Total Value", value: fmt(totalValue), color: Z.violet },
          { label: "Won Value", value: fmt(wonDeals.reduce((s, d) => s + (d.value ?? 0), 0)), color: "#f59e0b" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              background: Z.card,
              border: `1px solid ${Z.border}`,
              borderRadius: 12,
              padding: "14px 20px",
              borderTop: `3px solid ${stat.color}`,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: Z.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: Z.textPrimary }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ width: 280 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search name, business, rep, product..." />
        </div>

        {/* Date presets */}
        <div style={{ display: "flex", gap: 6 }}>
          {DATE_PRESETS.map((p) => (
            <FilterBtn key={p.key} label={p.label} active={datePreset === p.key} onClick={() => setDatePreset(p.key)} />
          ))}
        </div>

        {/* Stage filter */}
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          style={{
            padding: "7px 12px",
            borderRadius: 8,
            border: `1px solid ${Z.border}`,
            background: Z.card,
            color: Z.textPrimary,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <option value="all">All Stages</option>
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div
        style={{
          background: Z.card,
          border: `1px solid ${Z.border}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "140px 1fr 1fr 120px 160px 120px 110px 110px 100px",
            padding: "10px 20px",
            background: Z.bg,
            borderBottom: `1px solid ${Z.border}`,
            gap: 8,
          }}
        >
          {["Date", "Business", "Customer", "Phone", "Email", "Purchased", "Deal Type", "Rep", "Stage"].map((col) => (
            <div key={col} style={{ fontSize: 11, fontWeight: 700, color: Z.textMuted, textTransform: "uppercase", letterSpacing: 0.8 }}>
              {col}
            </div>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: Z.textMuted, fontSize: 14 }}>
            No deals match your filters.
          </div>
        ) : (
          filtered.map((deal) => {
            const stageBg = STAGE_COLORS[deal.stage] ?? Z.grey;
            const stageLabel = STAGE_LABELS[deal.stage] ?? deal.stage;
            const customerName = deal.contactName || deal.contact?.name || "—";
            const business = deal.contact?.company || "—";
            const phone = deal.contact?.phone || "—";
            const email = deal.contact?.email || "—";
            const product = deal.product?.description || deal.product?.name || "—";
            const dealType = deal.dealType
              ? deal.dealType.charAt(0).toUpperCase() + deal.dealType.slice(1)
              : "—";
            const date = new Date(deal.createdAt);
            const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

            return (
              <div
                key={deal.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr 1fr 120px 160px 120px 110px 110px 100px",
                  padding: "13px 20px",
                  borderBottom: `1px solid ${Z.borderLight}`,
                  gap: 8,
                  alignItems: "center",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f2f6")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {/* Date */}
                <div style={{ fontSize: 12, color: Z.textMuted, fontWeight: 600 }}>{dateStr}</div>

                {/* Business */}
                <div style={{ fontSize: 13, fontWeight: 700, color: Z.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {deal.contact?.id ? (
                    <Link href={`/contacts/${deal.contact.id}`} style={{ color: Z.textPrimary, textDecoration: "none" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = Z.ultramarine)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = Z.textPrimary)}
                    >
                      {business}
                    </Link>
                  ) : business}
                </div>

                {/* Customer name */}
                <div style={{ fontSize: 13, color: Z.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {deal.contact?.id ? (
                    <Link href={`/contacts/${deal.contact.id}`} style={{ color: Z.textSecondary, textDecoration: "none" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = Z.ultramarine)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = Z.textSecondary)}
                    >
                      {customerName}
                    </Link>
                  ) : customerName}
                </div>

                {/* Phone */}
                <div style={{ fontSize: 12, color: Z.textMuted }}>
                  {phone !== "—" ? <CopyableText value={phone} type="phone" /> : "—"}
                </div>

                {/* Email */}
                <div style={{ fontSize: 12, color: Z.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {email !== "—" ? <CopyableText value={email} type="email" /> : "—"}
                </div>

                {/* Product purchased */}
                <div style={{ fontSize: 12, fontWeight: 700, color: Z.violet, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {product}
                </div>

                {/* Deal type */}
                <div style={{ fontSize: 12, color: Z.textMuted }}>{dealType}</div>

                {/* Rep */}
                <div style={{ fontSize: 12, fontWeight: 600, color: Z.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {deal.rep || "—"}
                </div>

                {/* Stage badge */}
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 9px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      background: `${stageBg}20`,
                      color: stageBg,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {stageLabel}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {/* Footer count */}
        {filtered.length > 0 && (
          <div
            style={{
              padding: "10px 20px",
              fontSize: 12,
              color: Z.textMuted,
              fontWeight: 600,
              borderTop: `1px solid ${Z.border}`,
              background: Z.bg,
            }}
          >
            {filtered.length} deal{filtered.length !== 1 ? "s" : ""} &nbsp;·&nbsp; Total value: {fmt(totalValue)}
          </div>
        )}
      </div>
    </div>
  );
}
