"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Z } from "@/lib/constants";

interface FullItem {
  id: string;
  taskType: string | null;
  itemName: string | null;
  currentStatus: string | null;
  stage: string | null;
  dueDate: string | null;
  completedAt: string | null;
  isActive: boolean;
  owner: string | null;
}

interface FullOnboarding {
  onboardingId: string;
  customerName: string | null;
  businessName: string | null;
  designer: string | null;
  product: string | null;
  wonDate: string | null;
  status: string | null;
  items: FullItem[];
}

const NAV_TABS = [
  { label: "By Customer", href: "/onboarding" },
  { label: "By Task", href: "/onboarding/by-task" },
  { label: "Full View", href: "/onboarding/full" },
  { label: "Work Funnel", href: "/onboarding/funnel" },
];

const TASK_COLUMNS = [
  { key: "website", label: "Website" },
  { key: "logo", label: "Logo" },
  { key: "gbp", label: "GBP" },
  { key: "directories", label: "Directories" },
  { key: "ai_chat", label: "AI Chat" },
  { key: "landing_pages", label: "Landing Pages" },
  { key: "blogs", label: "Blogs" },
  { key: "social_media", label: "Social" },
  { key: "email_marketing", label: "Email Mktg" },
  { key: "sms_marketing", label: "SMS Mktg" },
  { key: "bookings", label: "Bookings" },
  { key: "publishing", label: "Publishing" },
];

function getTaskCell(items: FullItem[], taskType: string): { symbol: string; color: string; bg: string } {
  const item = items.find((i) => i.taskType === taskType);
  if (!item) return { symbol: "–", color: "#8b90a8", bg: "transparent" };

  const now = new Date();
  const isOverdue = item.dueDate && new Date(item.dueDate) < now && item.stage !== "complete";

  if (item.stage === "complete") return { symbol: "✓", color: "#10b981", bg: "#10b98110" };
  if (isOverdue) return { symbol: "!", color: "#ef4444", bg: "#ef444410" };
  if (item.stage === "in_progress") return { symbol: "•", color: "#00AEFF", bg: "#00AEFF10" };
  return { symbol: "–", color: "#8b90a8", bg: "transparent" };
}

export default function OnboardingFullPage() {
  const { data: onboardings } = useSWR<FullOnboarding[]>("/api/onboarding/full");
  const [filterDesigner, setFilterDesigner] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const list = (onboardings ?? []).filter((ob) => {
    if (filterDesigner && ob.designer !== filterDesigner) return false;
    if (filterProduct && !(ob.product ?? "").toLowerCase().includes(filterProduct.toLowerCase())) return false;
    if (filterStatus === "overdue") {
      const hasOverdue = ob.items.some((i) => i.dueDate && new Date(i.dueDate) < new Date() && i.stage !== "complete");
      if (!hasOverdue) return false;
    }
    if (filterStatus === "complete") {
      if (!ob.items.every((i) => i.stage === "complete")) return false;
    }
    if (filterStatus === "active") {
      if (ob.status !== "active") return false;
    }
    return true;
  });

  // Collect unique designers for filter
  const designers = Array.from(new Set((onboardings ?? []).map((o) => o.designer).filter(Boolean))) as string[];

  return (
    <div>
      {/* Tab Nav */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
        {NAV_TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              background: t.href === "/onboarding/full" ? `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})` : "transparent",
              color: t.href === "/onboarding/full" ? "#fff" : Z.textSecondary,
              border: t.href === "/onboarding/full" ? "none" : `1px solid ${Z.border}`,
            }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Onboarding — Full View</h1>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <select
          value={filterDesigner}
          onChange={(e) => setFilterDesigner(e.target.value)}
          style={{
            padding: "8px 12px",
            fontSize: 12,
            border: `1px solid ${Z.border}`,
            borderRadius: 8,
            background: Z.card,
            color: Z.textPrimary,
            outline: "none",
          }}
        >
          <option value="">All Designers</option>
          {designers.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value)}
          style={{
            padding: "8px 12px",
            fontSize: 12,
            border: `1px solid ${Z.border}`,
            borderRadius: 8,
            background: Z.card,
            color: Z.textPrimary,
            outline: "none",
          }}
        >
          <option value="">All Products</option>
          <option value="DISCOVER">DISCOVER</option>
          <option value="BOOST">BOOST</option>
          <option value="DOMINATE">DOMINATE</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: "8px 12px",
            fontSize: 12,
            border: `1px solid ${Z.border}`,
            borderRadius: 8,
            background: Z.card,
            color: Z.textPrimary,
            outline: "none",
          }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="overdue">Overdue</option>
          <option value="complete">Complete</option>
        </select>
      </div>

      {/* Matrix Table */}
      <div
        style={{
          background: Z.card,
          borderRadius: 16,
          border: `1px solid ${Z.border}`,
          overflow: "auto",
          position: "relative",
        }}
      >
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 1200 }}>
          <thead>
            <tr>
              <th
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 2,
                  background: Z.card,
                  padding: "12px 16px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: Z.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  textAlign: "left",
                  borderBottom: `1px solid ${Z.border}`,
                  borderRight: `1px solid ${Z.border}`,
                  minWidth: 160,
                }}
              >
                Business Name
              </th>
              <th style={{ padding: "12px 10px", fontSize: 11, fontWeight: 700, color: Z.textMuted, textTransform: "uppercase", letterSpacing: 0.8, textAlign: "left", borderBottom: `1px solid ${Z.border}`, minWidth: 90 }}>Designer</th>
              <th style={{ padding: "12px 10px", fontSize: 11, fontWeight: 700, color: Z.textMuted, textTransform: "uppercase", letterSpacing: 0.8, textAlign: "left", borderBottom: `1px solid ${Z.border}`, minWidth: 80 }}>Product</th>
              {TASK_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: "12px 6px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: Z.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    textAlign: "center",
                    borderBottom: `1px solid ${Z.border}`,
                    minWidth: 64,
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((ob) => (
              <tr key={ob.onboardingId}>
                <td
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                    background: Z.card,
                    padding: "10px 16px",
                    fontSize: 13,
                    fontWeight: 700,
                    borderBottom: `1px solid ${Z.borderLight}`,
                    borderRight: `1px solid ${Z.border}`,
                  }}
                >
                  {ob.businessName ?? "—"}
                </td>
                <td style={{ padding: "10px 10px", fontSize: 12, color: Z.textSecondary, borderBottom: `1px solid ${Z.borderLight}` }}>
                  {ob.designer ?? "—"}
                </td>
                <td style={{ padding: "10px 10px", fontSize: 11, borderBottom: `1px solid ${Z.borderLight}` }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: 10,
                      fontWeight: 700,
                      background: `${Z.ultramarine}15`,
                      color: Z.ultramarine,
                    }}
                  >
                    {(ob.product ?? "").split(" - ")[0] || "—"}
                  </span>
                </td>
                {TASK_COLUMNS.map((col) => {
                  const cell = getTaskCell(ob.items, col.key);
                  return (
                    <td
                      key={col.key}
                      style={{
                        padding: "10px 6px",
                        textAlign: "center",
                        fontSize: 16,
                        fontWeight: 800,
                        color: cell.color,
                        background: cell.bg,
                        borderBottom: `1px solid ${Z.borderLight}`,
                      }}
                    >
                      {cell.symbol}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {list.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: Z.textMuted }}>No onboarding records found</div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 20, marginTop: 16, fontSize: 12, color: Z.textMuted }}>
        <span><span style={{ color: "#10b981", fontWeight: 800 }}>✓</span> Completed</span>
        <span><span style={{ color: "#00AEFF", fontWeight: 800 }}>•</span> In Progress</span>
        <span><span style={{ color: "#ef4444", fontWeight: 800 }}>!</span> Overdue</span>
        <span><span style={{ color: "#8b90a8", fontWeight: 800 }}>–</span> Not Started / N/A</span>
      </div>
    </div>
  );
}
