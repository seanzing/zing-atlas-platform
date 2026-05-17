"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { PageLoader } from "@/components/PageLoader";
import { Z, fmt, AVATAR_COLORS } from "@/lib/constants";

interface DealRow {
  id: string;
  customerName: string;
  wonDate: string;
  status: "live" | "cancelled" | "pending";
  productName: string;
  dealValue: number;
  launchFee: number;
  totalSale: number;
  subscriptionCommission: number;
  launchFeeCommission: number;
  totalCommission: number;
  commissionPct: number;
  stripeCustomerId: string | null;
  paymentStatus: string | null;
}

interface MemberDealsResponse {
  member: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    role: string | null;
    position: string | null;
    active: boolean;
  };
  deals: DealRow[];
  summary: {
    totalRevenue: number;
    totalLaunchFees: number;
    totalCommission: number;
    dealCount: number;
  };
}

function getInitials(first: string | null, last: string | null): string {
  return `${(first || "")[0] || ""}${(last || "")[0] || ""}`.toUpperCase() || "?";
}

function toDateInputValue(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatWonDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

const STATUS_CONFIG = {
  live: { label: "Live", bg: "#10b98118", color: "#10b981" },
  cancelled: { label: "Cancelled", bg: "#ef444418", color: "#ef4444" },
  pending: { label: "Pending", bg: "#f59e0b18", color: "#f59e0b" },
};

const GRID_COLS = "2fr 1fr 1fr 1.5fr 1fr 1fr 1fr 1fr 1fr";
const COL_HEADERS = [
  "Customer",
  "Sold On",
  "Status",
  "Product",
  "Sale Value",
  "Launch Fee",
  "Total Sale",
  "Commission $",
  "Commission %",
];

export default function TeamMemberDetailPage() {
  const { id } = useParams<{ id: string }>();

  const now = new Date();
  const defaultFrom = toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
  const defaultTo = toDateInputValue(now);

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [appliedFrom, setAppliedFrom] = useState(defaultFrom);
  const [appliedTo, setAppliedTo] = useState(defaultTo);

  const { data, isLoading } = useSWR<MemberDealsResponse>(
    `/api/team/${id}/deals?from=${appliedFrom}&to=${appliedTo}`
  );

  function handleApply() {
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
  }

  if (isLoading || !data) return <PageLoader />;

  const { member, deals, summary } = data;
  const fullName = `${member.firstName || ""} ${member.lastName || ""}`.trim() || "Unknown";
  const avatarColor = AVATAR_COLORS[0];
  const initials = getInitials(member.firstName, member.lastName);

  return (
    <div style={{ flex: 1, overflowY: "auto", background: Z.bg }}>
      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "32px 28px" }}>

        {/* Back nav */}
        <Link
          href="/team"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: Z.textSecondary,
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 24,
          }}
        >
          ← Back to Team
        </Link>

        {/* Header card */}
        <div
          style={{
            background: Z.card,
            border: `1px solid ${Z.border}`,
            borderRadius: 16,
            padding: "24px 28px",
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}cc)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 22,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          {/* Name + badges */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: Z.textPrimary, letterSpacing: -0.3 }}>
              {fullName}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              {member.role && (
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 10px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    background: `${Z.ultramarine}18`,
                    color: Z.ultramarine,
                  }}
                >
                  {member.role}
                </span>
              )}
              {member.position && (
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 10px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    background: `${Z.grey}15`,
                    color: Z.textSecondary,
                  }}
                >
                  {member.position}
                </span>
              )}
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  background: member.active ? "#10b98118" : "#ef444418",
                  color: member.active ? "#10b981" : "#ef4444",
                }}
              >
                {member.active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          {/* Date range selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: Z.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: `1px solid ${Z.border}`,
                  background: Z.bg,
                  color: Z.textPrimary,
                  fontSize: 13,
                  fontWeight: 600,
                  outline: "none",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: Z.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                To
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: `1px solid ${Z.border}`,
                  background: Z.bg,
                  color: Z.textPrimary,
                  fontSize: 13,
                  fontWeight: 600,
                  outline: "none",
                }}
              />
            </div>
            <button
              onClick={handleApply}
              style={{
                marginTop: 16,
                padding: "7px 18px",
                borderRadius: 8,
                border: "none",
                background: Z.ultramarine,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Apply
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
            marginBottom: 28,
          }}
        >
          {[
            { label: "Total Revenue", value: fmt(summary.totalRevenue) },
            { label: "Total Commission", value: fmt(summary.totalCommission) },
            { label: "Deals Sold", value: String(summary.dealCount) },
            { label: "Launch Fees", value: fmt(summary.totalLaunchFees) },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: Z.card,
                border: `1px solid ${Z.border}`,
                borderRadius: 12,
                padding: "16px 20px",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: Z.textMuted,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: Z.textPrimary }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Deals table */}
        <div
          style={{
            background: Z.card,
            border: `1px solid ${Z.border}`,
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: GRID_COLS,
              padding: "12px 20px",
              borderBottom: `1px solid ${Z.border}`,
              background: Z.bg,
            }}
          >
            {COL_HEADERS.map((h) => (
              <div
                key={h}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: Z.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Data rows */}
          {deals.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 20px",
                color: Z.textMuted,
                fontSize: 14,
              }}
            >
              No deals found for this period.
            </div>
          ) : (
            deals.map((deal, i) => {
              const statusCfg = STATUS_CONFIG[deal.status];
              return (
                <div
                  key={deal.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: GRID_COLS,
                    padding: "14px 20px",
                    borderBottom: i < deals.length - 1 ? `1px solid ${Z.borderLight}` : "none",
                    alignItems: "center",
                  }}
                >
                  {/* Customer */}
                  <div style={{ fontSize: 14, fontWeight: 600, color: Z.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {deal.customerName}
                  </div>

                  {/* Sold On */}
                  <div style={{ fontSize: 13, color: Z.textSecondary }}>
                    {deal.wonDate ? formatWonDate(deal.wonDate) : "—"}
                  </div>

                  {/* Status */}
                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        background: statusCfg.bg,
                        color: statusCfg.color,
                      }}
                    >
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Product */}
                  <div style={{ fontSize: 13, color: Z.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {deal.productName}
                  </div>

                  {/* Sale Value */}
                  <div style={{ fontSize: 14, fontWeight: 600, color: Z.textPrimary }}>
                    {fmt(deal.dealValue)}
                  </div>

                  {/* Launch Fee */}
                  <div style={{ fontSize: 14, color: Z.textSecondary }}>
                    {deal.launchFee > 0 ? fmt(deal.launchFee) : "—"}
                  </div>

                  {/* Total Sale */}
                  <div style={{ fontSize: 14, fontWeight: 700, color: Z.textPrimary }}>
                    {fmt(deal.totalSale)}
                  </div>

                  {/* Commission $ */}
                  <div style={{ fontSize: 14, fontWeight: 700, color: Z.ultramarine }}>
                    {fmt(deal.totalCommission)}
                  </div>

                  {/* Commission % */}
                  <div style={{ fontSize: 13, color: Z.textSecondary }}>
                    {`${deal.commissionPct.toFixed(1)}%`}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
