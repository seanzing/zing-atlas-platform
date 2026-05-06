"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { Z } from "@/lib/constants";
import { Badge } from "@/components/ui";
import { useToast, Toast } from "@/components/Toast";
import FloatingEmailCompose from "@/components/FloatingEmailCompose";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const WEBSITE_STATUSES = [
  { value: "not_started", label: "Not Started", color: "#6b7280" },
  { value: "building", label: "Building", color: Z.ultramarine },
  { value: "draft_sent", label: "Draft Sent", color: "#f59e0b" },
  { value: "in_revision", label: "In Revision", color: "#f97316" },
  { value: "customer_approved", label: "Customer Approved", color: "#22c55e" },
  { value: "in_qa", label: "In QA", color: Z.violet },
  { value: "published", label: "Published", color: Z.turquoise },
];

const STATUS_MAP = Object.fromEntries(WEBSITE_STATUSES.map((s) => [s.value, s]));
const DESIGN_STATUSES = ["not_started", "building", "draft_sent", "in_revision"];
const PUBLISH_STATUSES = ["customer_approved", "in_qa"];

type QueueTab = "all" | "design" | "publish" | "overdue";

interface OnboardingRow {
  onboardingId: string;
  customerName: string | null;
  businessName: string | null;
  email: string | null;
  contactId: string | null;
  websiteStatus: string | null;
  designer: string | null;
  wonDate: string | null;
  product: string | null;
  items: {
    id: string;
    taskType: string | null;
    currentStatus: string | null;
    itemName: string | null;
    dueDate: string | null;
    stage: string | null;
  }[];
}

interface ComposeTarget {
  onboardingId: string;
  contactId: string | null;
  name: string;
  email: string;
}

function isOverdue(row: OnboardingRow): boolean {
  const ws = row.websiteStatus || "not_started";
  if (ws === "published") return false;
  return row.items.some(
    (i) => i.dueDate && new Date(i.dueDate) < new Date() && i.stage !== "complete"
  );
}

export default function WorkQueuePage() {
  const [tab, setTab] = useState<QueueTab>("all");
  const [compose, setCompose] = useState<ComposeTarget | null>(null);
  const { toast, showToast } = useToast();

  const { data: rows, mutate } = useSWR<OnboardingRow[]>("/api/onboarding/full", fetcher);

  const filtered = (rows ?? []).filter((r) => {
    const ws = r.websiteStatus || "not_started";
    if (tab === "design") return DESIGN_STATUSES.includes(ws);
    if (tab === "publish") return PUBLISH_STATUSES.includes(ws);
    if (tab === "overdue") return isOverdue(r);
    return ws !== "published"; // "all" hides published by default
  });

  const updateStatus = useCallback(async (id: string, status: string) => {
    // Optimistic update
    mutate(
      (prev) => prev?.map((r) => r.onboardingId === id ? { ...r, websiteStatus: status } : r),
      false
    );
    const res = await fetch(`/api/onboarding/${id}/website-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      showToast("Failed to update status", false);
      mutate(); // revert
    }
  }, [mutate, showToast]);

  function getTrackStatus(items: OnboardingRow["items"], taskType: string) {
    return items.find((i) => i.taskType === taskType)?.currentStatus ?? null;
  }

  function fmtDate(d: string | null) {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const TRACK_BADGE_COLORS: Record<string, string> = {
    landing_pages: Z.bluejeans,
    blogs: Z.violet,
    ai_chat: Z.turquoise,
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: Z.textPrimary, margin: 0 }}>Work Queue</h1>
          <p style={{ fontSize: 14, color: Z.textSecondary, margin: "4px 0 0" }}>
            Active customer deliverables across all tracks
          </p>
        </div>
        <div style={{ color: Z.textMuted, fontSize: 13 }}>
          {filtered.length} {filtered.length === 1 ? "customer" : "customers"}
        </div>
      </div>

      {/* Queue tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {([
          { key: "all" as QueueTab, label: "All Active" },
          { key: "design" as QueueTab, label: "Design Queue" },
          { key: "publish" as QueueTab, label: "Publishing Queue" },
          { key: "overdue" as QueueTab, label: "⚠ Overdue" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 20px",
              borderRadius: 20,
              border: tab === t.key ? "none" : `1px solid ${Z.border}`,
              background: tab === t.key
                ? t.key === "overdue"
                  ? "linear-gradient(135deg, #ef4444, #dc2626)"
                  : `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`
                : "transparent",
              color: tab === t.key ? "#fff" : Z.textSecondary,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t.label}
            {tab === t.key && (
              <span style={{ marginLeft: 8, background: "rgba(255,255,255,0.2)", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>
                {filtered.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: Z.card, border: `1px solid ${Z.border}`, borderRadius: 16, overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1.8fr 1fr 1fr 1fr 1fr 100px",
          padding: "10px 20px",
          background: Z.bg,
          fontSize: 10,
          fontWeight: 700,
          color: Z.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          borderBottom: `1px solid ${Z.border}`,
        }}>
          <div>Customer</div>
          <div>Website Status</div>
          <div>Landing Pages</div>
          <div>Blogs</div>
          <div>AI Chat</div>
          <div>Won Date</div>
          <div>Actions</div>
        </div>

        {!rows ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: Z.textMuted, fontSize: 13 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: Z.textMuted, fontSize: 13 }}>
            No customers in this queue
          </div>
        ) : (
          filtered.map((row) => {
            const ws = row.websiteStatus || "not_started";
            const wsInfo = STATUS_MAP[ws] || STATUS_MAP.not_started;
            const lpStatus = getTrackStatus(row.items, "landing_pages");
            const blogStatus = getTrackStatus(row.items, "blogs") || getTrackStatus(row.items, "seo");
            const chatStatus = getTrackStatus(row.items, "ai_chat");

            return (
              <div
                key={row.onboardingId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.8fr 1fr 1fr 1fr 1fr 100px",
                  padding: "14px 20px",
                  borderBottom: `1px solid ${Z.borderLight}`,
                  alignItems: "center",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = Z.bg; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {/* Customer */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: Z.textPrimary }}>
                    {row.businessName || row.customerName || "\u2014"}
                  </div>
                  <div style={{ fontSize: 11, color: Z.textMuted, marginTop: 2 }}>
                    {row.customerName && row.businessName ? row.customerName : ""}
                    {row.product && <span style={{ marginLeft: 6, color: Z.violet, fontWeight: 600 }}>{row.product}</span>}
                  </div>
                </div>

                {/* Website status dropdown */}
                <div onClick={(e) => e.stopPropagation()}>
                  <select
                    value={ws}
                    onChange={(e) => updateStatus(row.onboardingId, e.target.value)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 8,
                      border: `1px solid ${wsInfo.color}40`,
                      background: `${wsInfo.color}15`,
                      color: wsInfo.color,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    {WEBSITE_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Other tracks — read-only status pills */}
                <div>
                  {lpStatus
                    ? <Badge label={lpStatus} color={TRACK_BADGE_COLORS.landing_pages} />
                    : <span style={{ color: Z.textMuted, fontSize: 12 }}>\u2014</span>}
                </div>
                <div>
                  {blogStatus
                    ? <Badge label={blogStatus} color={TRACK_BADGE_COLORS.blogs} />
                    : <span style={{ color: Z.textMuted, fontSize: 12 }}>\u2014</span>}
                </div>
                <div>
                  {chatStatus
                    ? <Badge label={chatStatus} color={TRACK_BADGE_COLORS.ai_chat} />
                    : <span style={{ color: Z.textMuted, fontSize: 12 }}>\u2014</span>}
                </div>

                {/* Won date */}
                <div style={{ fontSize: 12, color: Z.textSecondary }}>{fmtDate(row.wonDate)}</div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                  {/* Email button */}
                  <button
                    onClick={() => setCompose({
                      onboardingId: row.onboardingId,
                      contactId: row.contactId,
                      name: row.businessName || row.customerName || "Customer",
                      email: row.email || "",
                    })}
                    title="Send email"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: `1px solid ${Z.border}`,
                      background: "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: Z.textSecondary,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = Z.ultramarine;
                      e.currentTarget.style.color = Z.ultramarine;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = Z.border;
                      e.currentTarget.style.color = Z.textSecondary;
                    }}
                  >
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </button>

                  {/* View full record */}
                  <Link
                    href={`/onboarding/${row.onboardingId}`}
                    title="View full record"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: `1px solid ${Z.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: Z.textSecondary,
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = Z.violet;
                      (e.currentTarget as HTMLElement).style.color = Z.violet;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = Z.border;
                      (e.currentTarget as HTMLElement).style.color = Z.textSecondary;
                    }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating email compose */}
      {compose && (
        <FloatingEmailCompose
          onboardingId={compose.onboardingId}
          contactId={compose.contactId ?? undefined}
          contactName={compose.name}
          contactEmail={compose.email}
          onClose={() => setCompose(null)}
          onEmailSent={() => {
            showToast("Email sent", true);
            setCompose(null);
          }}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
