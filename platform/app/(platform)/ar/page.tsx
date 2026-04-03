"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { PageLoader } from "@/components/PageLoader";
import {
  Badge,
  StatCard,
  SearchBar,
  Btn,
  FilterBtn,
} from "@/components/ui";
import { Z, fmt } from "@/lib/constants";
import { useAuthContext } from "@/lib/auth-context";

// ── Types ──────────────────────────────────────────────────────────
interface ArTimelineEntry {
  id: string;
  arId: string;
  date: string | null;
  type: string | null;
  note: string | null;
}

interface ArAccount {
  id: string;
  businessName: string | null;
  customerName: string | null;
  email: string | null;
  phone: string | null;
  product: string | null;
  mrr: number | null;
  status: string | null;
  stripeStatus: string | null;
  stripeCustomerId: string | null;
  daysPastDue: number | null;
  amountDue: number | null;
  amountPaid: number | null;
  paidDate: string | null;
  lastPaymentDate: string | null;
  failedDate: string | null;
  subscriptionCreated: string | null;
  timeline: ArTimelineEntry[];
  createdAt: string;
}

interface SyncResult {
  synced: number;
  active: number;
  pastDue: number;
  unpaid: number;
  canceled: number;
  lastSyncTime: string;
}

// ── Constants ──────────────────────────────────────────────────────
const FILTERS = ["All", "active", "past_due", "unpaid", "canceled"];
const FILTER_LABELS: Record<string, string> = {
  All: "All",
  active: "Active",
  past_due: "Past Due",
  unpaid: "Unpaid",
  canceled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  active: Z.turquoise,
  past_due: "#F59E0B",
  unpaid: "#EF4444",
  canceled: Z.textMuted,
};

const TIMELINE_TYPE_COLORS: Record<string, string> = {
  "payment-received": "#10b981",
  escalated: "#EF4444",
  "reminder-sent": Z.bluejeans,
  "payment-retry": "#F59E0B",
  text: Z.ultramarine,
  email: Z.bluejeans,
  call: Z.violet,
  "stripe-retry": "#F59E0B",
};

// ── Helpers ────────────────────────────────────────────────────────
const num = (v: number | string | null | undefined): number => {
  if (v == null) return 0;
  return typeof v === "string" ? parseFloat(v) || 0 : v;
};

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "--";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const timeAgo = (iso: string | null) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
};

// ── Component ──────────────────────────────────────────────────────
export default function ARPage() {
  const { isAdmin } = useAuthContext();
  const { data: accounts, mutate } = useSWR<ArAccount[]>("/api/ar");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Auto-sync on mount
  const doSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/ar/sync");
      if (res.ok) {
        const data: SyncResult = await res.json();
        setLastSync(data.lastSyncTime);
        mutate();
      }
    } catch {
      // silent fail — data from DB still shown
    } finally {
      setSyncing(false);
    }
  }, [mutate]);

  useEffect(() => {
    doSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      const res = await fetch(`/api/ar/${id}/retry`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast("Payment retry successful", true);
        mutate();
      } else {
        showToast(data.error || "Retry failed", false);
      }
    } catch {
      showToast("Network error", false);
    } finally {
      setRetryingId(null);
    }
  };

  const handleRemind = async (id: string) => {
    try {
      const res = await fetch(`/api/ar/${id}/remind`, { method: "POST" });
      if (res.ok) {
        showToast("Reminder sent", true);
        mutate();
      } else {
        showToast("Failed to send reminder", false);
      }
    } catch {
      showToast("Network error", false);
    }
  };

  // ── Data ──────────────────────────────────────────────────────
  if (!accounts) return <PageLoader />;

  const list = accounts || [];

  const activeAccounts = list.filter((a) => a.status === "active");
  const pastDueAccounts = list.filter((a) => a.status === "past_due");
  const unpaidAccounts = list.filter((a) => a.status === "unpaid");

  const activeMRR = activeAccounts.reduce((s, a) => s + num(a.mrr), 0);
  const pastDueTotal = pastDueAccounts.reduce((s, a) => s + num(a.amountDue), 0);
  const unpaidTotal = unpaidAccounts.reduce((s, a) => s + num(a.amountDue), 0);

  // Collected this month: sum of amountPaid where paidDate >= start of current month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const collectedThisMonth = list
    .filter((a) => a.paidDate && new Date(a.paidDate) >= monthStart)
    .reduce((s, a) => s + num(a.amountPaid), 0);

  // Filter + search
  const filtered = list.filter((a) => {
    if (filter !== "All" && a.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (a.customerName || "").toLowerCase().includes(q) ||
        (a.businessName || "").toLowerCase().includes(q) ||
        (a.email || "").toLowerCase().includes(q) ||
        (a.product || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selected = list.find((a) => a.id === selectedId) || null;

  const openPanel = (a: ArAccount) => {
    setSelectedId(a.id);
    setPanelOpen(true);
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", gap: 0, height: "100%" }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 36,
            zIndex: 2000,
            padding: "12px 24px",
            borderRadius: 12,
            background: toast.ok ? "#10b981" : "#EF4444",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Page header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 28,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: Z.textPrimary,
                margin: 0,
                letterSpacing: -0.5,
              }}
            >
              Accounts Receivable
            </h1>
            <p
              style={{
                fontSize: 14,
                color: Z.textSecondary,
                margin: "4px 0 0 0",
              }}
            >
              Manage subscriptions, past due accounts, and payment retries
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {lastSync && (
              <span style={{ fontSize: 12, color: Z.textMuted }}>
                Last synced {timeAgo(lastSync)}
              </span>
            )}
            <Btn onClick={doSync} style={{ opacity: syncing ? 0.6 : 1 }}>
              {syncing ? "Syncing..." : "Sync from Stripe"}
            </Btn>
          </div>
        </div>

        {/* Stat cards */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <StatCard
            label="Active Subscriptions"
            value={activeAccounts.length}
            sub={`${fmt(activeMRR)} MRR`}
            accent={Z.turquoise}
          />
          <StatCard
            label="Past Due"
            value={pastDueAccounts.length}
            sub={`${fmt(pastDueTotal)} outstanding`}
            accent="#F59E0B"
          />
          <StatCard
            label="Unpaid"
            value={unpaidAccounts.length}
            sub={`${fmt(unpaidTotal)} outstanding`}
            accent="#EF4444"
          />
          <StatCard
            label="Collected This Month"
            value={fmt(collectedThisMonth)}
            sub="payments received"
            accent={Z.ultramarine}
          />
        </div>

        {/* Search + Filter row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search accounts..."
          />
          <div style={{ display: "flex", gap: 6 }}>
            {FILTERS.map((f) => (
              <FilterBtn
                key={f}
                label={FILTER_LABELS[f]}
                active={filter === f}
                onClick={() => setFilter(f)}
              />
            ))}
          </div>
        </div>

        {/* Table */}
        <div
          style={{
            background: Z.card,
            borderRadius: 16,
            border: `1px solid ${Z.border}`,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.2fr 0.8fr 0.8fr 0.8fr 0.9fr 1fr 1.2fr",
              padding: "14px 24px",
              borderBottom: `1px solid ${Z.border}`,
              background: Z.bg,
            }}
          >
            {[
              "Customer / Business",
              "Product",
              "MRR",
              "Status",
              "Days Past Due",
              "Amount Due",
              "Last Payment",
              "Actions",
            ].map((h) => (
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

          {/* Rows */}
          {filtered.map((a) => (
            <div
              key={a.id}
              onClick={() => openPanel(a)}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.2fr 0.8fr 0.8fr 0.8fr 0.9fr 1fr 1.2fr",
                padding: "14px 24px",
                alignItems: "center",
                borderBottom: `1px solid ${Z.borderLight}`,
                cursor: "pointer",
                background:
                  selectedId === a.id ? `${Z.ultramarine}08` : "transparent",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (selectedId !== a.id)
                  e.currentTarget.style.background = Z.bg;
              }}
              onMouseLeave={(e) => {
                if (selectedId !== a.id)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              {/* Customer / Business */}
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: Z.textPrimary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {a.customerName || a.businessName || "--"}
                </div>
                {a.businessName && a.customerName && a.businessName !== a.customerName && (
                  <div
                    style={{
                      fontSize: 11,
                      color: Z.textMuted,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {a.businessName}
                  </div>
                )}
              </div>

              {/* Product */}
              <div
                style={{
                  fontSize: 13,
                  color: Z.textSecondary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {a.product || "--"}
              </div>

              {/* MRR */}
              <div style={{ fontSize: 13, fontWeight: 600, color: Z.textPrimary }}>
                {fmt(num(a.mrr))}
              </div>

              {/* Status */}
              <div>
                <Badge
                  label={FILTER_LABELS[a.status || ""] || a.status || "--"}
                  color={STATUS_COLORS[a.status || ""] || Z.textMuted}
                />
              </div>

              {/* Days Past Due */}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: num(a.daysPastDue) > 0 ? "#EF4444" : Z.textMuted,
                }}
              >
                {num(a.daysPastDue) > 0 ? num(a.daysPastDue) : "--"}
              </div>

              {/* Amount Due */}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: num(a.amountDue) > 0 ? "#EF4444" : "#10b981",
                }}
              >
                {num(a.amountDue) > 0 ? fmt(num(a.amountDue)) : "$0.00"}
              </div>

              {/* Last Payment */}
              <div style={{ fontSize: 12, color: Z.textMuted }}>
                {fmtDate(a.lastPaymentDate)}
              </div>

              {/* Actions */}
              <div
                style={{ display: "flex", gap: 6 }}
                onClick={(e) => e.stopPropagation()}
              >
                {isAdmin && (a.status === "past_due" || a.status === "unpaid") && (
                  <Btn
                    small
                    variant="danger"
                    onClick={() => handleRetry(a.id)}
                    style={{
                      opacity: retryingId === a.id ? 0.6 : 1,
                      pointerEvents: retryingId === a.id ? "none" : "auto",
                    }}
                  >
                    {retryingId === a.id ? "..." : "Retry"}
                  </Btn>
                )}
                <Btn small variant="secondary" onClick={() => handleRemind(a.id)}>
                  Remind
                </Btn>
                {a.stripeCustomerId && (
                  <a
                    href={`https://dashboard.stripe.com/customers/${a.stripeCustomerId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View in Stripe"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: Z.bg,
                      border: `1px solid ${Z.border}`,
                      color: Z.textSecondary,
                      textDecoration: "none",
                      fontSize: 14,
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div
              style={{
                padding: 48,
                textAlign: "center",
                color: Z.textMuted,
                fontSize: 14,
              }}
            >
              No accounts found
            </div>
          )}
        </div>
      </div>

      {/* Detail slide-out panel */}
      {panelOpen && selected && (
        <div
          style={{
            width: 400,
            flexShrink: 0,
            background: Z.card,
            borderLeft: `1px solid ${Z.border}`,
            marginLeft: 24,
            borderRadius: 16,
            padding: "24px 20px",
            overflowY: "auto",
            maxHeight: "calc(100vh - 100px)",
          }}
        >
          {/* Panel header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 20,
            }}
          >
            <div style={{ flex: 1 }}>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: Z.textPrimary,
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {selected.customerName || selected.businessName || "Unknown"}
              </h2>
              <p
                style={{
                  fontSize: 12,
                  color: Z.textMuted,
                  margin: "4px 0 0 0",
                }}
              >
                {selected.email || "No email"} &middot;{" "}
                {selected.phone || "No phone"}
              </p>
              {selected.businessName &&
                selected.customerName &&
                selected.businessName !== selected.customerName && (
                  <p
                    style={{
                      fontSize: 12,
                      color: Z.textSecondary,
                      margin: "2px 0 0 0",
                    }}
                  >
                    {selected.businessName}
                  </p>
                )}
            </div>
            <button
              onClick={() => {
                setPanelOpen(false);
                setSelectedId(null);
              }}
              style={{
                background: "none",
                border: "none",
                color: Z.textMuted,
                cursor: "pointer",
                fontSize: 18,
                padding: "0 0 0 12px",
              }}
            >
              ✕
            </button>
          </div>

          {/* Product + MRR */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Badge
              label={selected.product || "Unknown"}
              color={Z.ultramarine}
            />
            <span
              style={{ fontSize: 14, fontWeight: 700, color: Z.textPrimary }}
            >
              {fmt(num(selected.mrr))}/mo
            </span>
          </div>

          {/* Status + Days past due */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 20,
              alignItems: "center",
            }}
          >
            <Badge
              label={
                FILTER_LABELS[selected.status || ""] ||
                selected.status ||
                "--"
              }
              color={STATUS_COLORS[selected.status || ""] || Z.textMuted}
            />
            {num(selected.daysPastDue) > 0 && (
              <span
                style={{ fontSize: 12, fontWeight: 700, color: "#EF4444" }}
              >
                {num(selected.daysPastDue)} days past due
              </span>
            )}
          </div>

          {/* Amount due / paid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                background: Z.bg,
                borderRadius: 10,
                padding: 14,
                border: `1px solid ${Z.border}`,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: Z.textMuted,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 4,
                }}
              >
                Amount Due
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: num(selected.amountDue) > 0 ? "#EF4444" : "#10b981",
                }}
              >
                {fmt(num(selected.amountDue))}
              </div>
            </div>
            <div
              style={{
                background: Z.bg,
                borderRadius: 10,
                padding: 14,
                border: `1px solid ${Z.border}`,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: Z.textMuted,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 4,
                }}
              >
                Amount Paid
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#10b981",
                }}
              >
                {fmt(num(selected.amountPaid))}
              </div>
            </div>
          </div>

          {/* Subscription created */}
          <div
            style={{
              fontSize: 12,
              color: Z.textMuted,
              marginBottom: 20,
            }}
          >
            Subscription created: {fmtDate(selected.subscriptionCreated)}
          </div>

          {/* Timeline */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: Z.textSecondary,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 12,
              }}
            >
              Timeline
            </div>
            {(selected.timeline || [])
              .sort(
                (a, b) =>
                  new Date(b.date || 0).getTime() -
                  new Date(a.date || 0).getTime()
              )
              .map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    marginBottom: 14,
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background:
                        TIMELINE_TYPE_COLORS[entry.type || ""] || Z.textMuted,
                      marginTop: 5,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 2,
                      }}
                    >
                      <Badge
                        label={entry.type || "note"}
                        color={
                          TIMELINE_TYPE_COLORS[entry.type || ""] || Z.textMuted
                        }
                      />
                      <span style={{ fontSize: 11, color: Z.textMuted }}>
                        {fmtDate(entry.date)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: Z.textPrimary,
                        lineHeight: 1.4,
                      }}
                    >
                      {entry.note || "--"}
                    </div>
                  </div>
                </div>
              ))}
            {(!selected.timeline || selected.timeline.length === 0) && (
              <div style={{ fontSize: 13, color: Z.textMuted }}>
                No timeline entries
              </div>
            )}
          </div>

          {/* Retry Payment button — admin only */}
          {isAdmin &&
            (selected.status === "past_due" ||
              selected.status === "unpaid") && (
              <Btn
                variant="danger"
                onClick={() => handleRetry(selected.id)}
                style={{
                  width: "100%",
                  marginBottom: 12,
                  opacity: retryingId === selected.id ? 0.6 : 1,
                  pointerEvents:
                    retryingId === selected.id ? "none" : "auto",
                }}
              >
                {retryingId === selected.id
                  ? "Retrying..."
                  : "Retry Payment"}
              </Btn>
            )}

          {/* View in Stripe */}
          {selected.stripeCustomerId && (
            <a
              href={`https://dashboard.stripe.com/customers/${selected.stripeCustomerId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                textAlign: "center",
                padding: "10px 20px",
                borderRadius: 10,
                background: Z.bg,
                border: `1px solid ${Z.border}`,
                color: Z.textSecondary,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                transition: "all 0.2s",
              }}
            >
              View in Stripe Dashboard
            </a>
          )}
        </div>
      )}
    </div>
  );
}
