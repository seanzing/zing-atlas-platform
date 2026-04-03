"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { Z } from "@/lib/constants";
import { useAuthContext } from "@/lib/auth-context";

interface FullItem {
  id: string;
  taskType: string | null;
  itemName: string | null;
  currentStatus: string | null;
  statusOptions: { value: string; label: string }[] | null;
  stage: string | null;
  dueDate: string | null;
  completedAt: string | null;
  isActive: boolean;
  owner: string | null;
  ownerRole: string | null;
}

interface FullOnboarding {
  onboardingId: string;
  customerName: string | null;
  businessName: string | null;
  designer: string | null;
  product: string | null;
  status: string | null;
  items: FullItem[];
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Notification {
  id: string;
  message: string | null;
  type: string | null;
  isRead: boolean;
  createdAt: string;
}

const NAV_TABS = [
  { label: "By Customer", href: "/onboarding" },
  { label: "By Task", href: "/onboarding/by-task" },
  { label: "Full View", href: "/onboarding/full" },
  { label: "Work Funnel", href: "/onboarding/funnel" },
];

const ROLE_COLORS: Record<string, string> = {
  designer: "#9600FF",
  onboarding_specialist: "#00AEFF",
  marketing: "#34E1D2",
  publishing: "#3A5AFF",
  "Sales Rep": "#f59e0b",
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeAgo(d: string): string {
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function OnboardingFunnelPage() {
  const { user, isAdmin } = useAuthContext();
  const { data: onboardings } = useSWR<FullOnboarding[]>("/api/onboarding/full");
  const { data: team } = useSWR<TeamMember[]>("/api/team");
  const { data: notifications, mutate: mutateNotifs } = useSWR<Notification[]>("/api/onboarding/notifications?unreadOnly=true");

  // Non-admins: force "My Tasks" mode with their own name
  const myName = user?.teamMember
    ? `${user.teamMember.firstName || ""} ${user.teamMember.lastName || ""}`.trim()
    : "";
  const [viewMode, setViewMode] = useState<"all" | "my">(isAdmin ? "all" : "my");
  const [selectedMember, setSelectedMember] = useState("");

  // Once user loads, lock non-admins to My Tasks
  useEffect(() => {
    if (!isAdmin && myName) {
      setViewMode("my");
      setSelectedMember(myName);
    }
  }, [isAdmin, myName]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const allItems = (onboardings ?? [])
    .filter((ob) => ob.status === "active")
    .flatMap((ob) =>
      ob.items
        .filter((i) => i.isActive && i.stage !== "complete")
        .map((i) => ({ ...i, businessName: ob.businessName, customerName: ob.customerName }))
    );

  // Group by ownerRole → owner
  const byRole: Record<string, Record<string, typeof allItems>> = {};
  for (const item of allItems) {
    const role = item.ownerRole ?? "unassigned";
    const owner = item.owner ?? "Unassigned";
    if (!byRole[role]) byRole[role] = {};
    if (!byRole[role][owner]) byRole[role][owner] = [];
    byRole[role][owner].push(item);
  }

  // Sort items: overdue first, then by due date
  const now = new Date();
  for (const role of Object.values(byRole)) {
    for (const ownerItems of Object.values(role)) {
      ownerItems.sort((a, b) => {
        const aOverdue = a.dueDate && new Date(a.dueDate) < now ? 0 : 1;
        const bOverdue = b.dueDate && new Date(b.dueDate) < now ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
      });
    }
  }

  // My Tasks: filter by selected team member
  const myItems = selectedMember
    ? allItems.filter((i) => i.owner === selectedMember)
    : [];

  const unreadCount = (notifications ?? []).length;

  async function markRead(id: string) {
    await fetch(`/api/onboarding/notifications/${id}/read`, { method: "PUT" });
    mutateNotifs();
  }

  async function updateStatus(itemId: string, status: string) {
    setUpdatingId(itemId);
    try {
      const res = await fetch(`/api/onboarding/items/${itemId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setToast({ msg: "Status updated", type: "success" });
      } else {
        setToast({ msg: "Update failed", type: "error" });
      }
    } catch {
      setToast({ msg: "Network error", type: "error" });
    }
    setUpdatingId(null);
    setTimeout(() => setToast(null), 2500);
  }

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
              background: t.href === "/onboarding/funnel" ? `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})` : "transparent",
              color: t.href === "/onboarding/funnel" ? "#fff" : Z.textSecondary,
              border: t.href === "/onboarding/funnel" ? "none" : `1px solid ${Z.border}`,
            }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Work Funnel</h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* My Tasks / All Tasks toggle — admins only */}
          {isAdmin && (
            <div style={{ display: "flex", border: `1px solid ${Z.border}`, borderRadius: 8, overflow: "hidden" }}>
              <button
                onClick={() => setViewMode("all")}
                style={{
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: viewMode === "all" ? Z.ultramarine : Z.card,
                  color: viewMode === "all" ? "#fff" : Z.textSecondary,
                }}
              >
                All Tasks
              </button>
              <button
                onClick={() => setViewMode("my")}
                style={{
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: 700,
                  border: "none",
                  borderLeft: `1px solid ${Z.border}`,
                  cursor: "pointer",
                  background: viewMode === "my" ? Z.ultramarine : Z.card,
                  color: viewMode === "my" ? "#fff" : Z.textSecondary,
                }}
              >
                My Tasks
              </button>
            </div>
          )}

          {viewMode === "my" && (
            <select
              value={selectedMember}
              onChange={(e) => isAdmin && setSelectedMember(e.target.value)}
              disabled={!isAdmin}
              style={{
                padding: "8px 12px",
                fontSize: 12,
                border: `1px solid ${Z.border}`,
                borderRadius: 8,
                background: Z.card,
                color: Z.textPrimary,
                outline: "none",
                opacity: isAdmin ? 1 : 0.7,
              }}
            >
              <option value="">View as...</option>
              {(team ?? []).map((m) => (
                <option key={m.id} value={`${m.firstName} ${m.lastName}`}>
                  {m.firstName} {m.lastName}
                </option>
              ))}
            </select>
          )}

          {/* Notification Bell */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                border: `1px solid ${Z.border}`,
                background: Z.card,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                position: "relative",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={Z.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 2000,
            padding: "12px 20px",
            borderRadius: 10,
            background: toast.type === "success" ? "#10b981" : "#ef4444",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Notification Slide-out */}
      {notifOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
          <div
            onClick={() => setNotifOpen(false)}
            style={{ position: "absolute", inset: 0, background: "rgba(5,5,54,0.3)", backdropFilter: "blur(2px)" }}
          />
          <div
            style={{
              position: "relative",
              width: 400,
              background: Z.card,
              borderLeft: `1px solid ${Z.border}`,
              overflowY: "auto",
              padding: "24px",
              boxShadow: "-8px 0 40px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 800 }}>Notifications</span>
              <button onClick={() => setNotifOpen(false)} style={{ background: "none", border: "none", color: Z.textMuted, cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            {(notifications ?? []).length === 0 ? (
              <div style={{ color: Z.textMuted, fontSize: 13, textAlign: "center", padding: 20 }}>No unread notifications</div>
            ) : (
              (notifications ?? []).map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: `1px solid ${Z.borderLight}`,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontSize: 13, color: Z.textPrimary, marginBottom: 6 }}>{n.message}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: Z.textMuted }}>{timeAgo(n.createdAt)}</span>
                    <button
                      onClick={() => markRead(n.id)}
                      style={{
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        border: `1px solid ${Z.border}`,
                        borderRadius: 6,
                        background: "transparent",
                        color: Z.textSecondary,
                        cursor: "pointer",
                      }}
                    >
                      Mark Read
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* All Tasks View */}
      {viewMode === "all" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16 }}>
          {Object.entries(byRole).map(([role, owners]) =>
            Object.entries(owners).map(([owner, items]) => (
              <div
                key={`${role}-${owner}`}
                style={{
                  background: Z.card,
                  borderRadius: 14,
                  border: `1px solid ${Z.border}`,
                  padding: "18px 20px",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>{owner}</span>
                    <Badge label={role.replace("_", " ")} color={ROLE_COLORS[role] ?? Z.grey} />
                  </div>
                  <span style={{ fontSize: 12, color: Z.textMuted, fontWeight: 600 }}>{items.length} tasks</span>
                </div>

                {items.map((item) => {
                  const isOverdue = item.dueDate && new Date(item.dueDate) < now;
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: isOverdue ? "#ef444408" : Z.bg,
                        marginBottom: 6,
                        fontSize: 12,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderLeft: `3px solid ${isOverdue ? "#ef4444" : Z.turquoise}`,
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, color: Z.textPrimary }}>{item.businessName}</span>
                        <span style={{ color: Z.textMuted }}> — {item.itemName}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Badge
                          label={
                            Array.isArray(item.statusOptions)
                              ? (item.statusOptions.find((o) => o.value === item.currentStatus)?.label ?? item.currentStatus ?? "—")
                              : (item.currentStatus ?? "—")
                          }
                          color={isOverdue ? "#ef4444" : Z.bluejeans}
                        />
                        <span style={{ color: isOverdue ? "#ef4444" : Z.textMuted, fontSize: 11, fontWeight: 600 }}>
                          {fmtDate(item.dueDate)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}

      {/* My Tasks View */}
      {viewMode === "my" && (
        <div>
          {!selectedMember ? (
            <div style={{ padding: 40, textAlign: "center", color: Z.textMuted }}>Select a team member to view their tasks</div>
          ) : myItems.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: Z.textMuted }}>No active tasks for {selectedMember}</div>
          ) : (
            <div style={{ background: Z.card, borderRadius: 14, border: `1px solid ${Z.border}`, overflow: "hidden" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr 1.5fr 0.8fr",
                  padding: "12px 20px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: Z.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  borderBottom: `1px solid ${Z.border}`,
                }}
              >
                <div>Task Name</div>
                <div>Customer</div>
                <div>Status</div>
                <div>Due Date</div>
              </div>

              {myItems.map((item) => {
                const options = Array.isArray(item.statusOptions) ? item.statusOptions : [];
                const isOverdue = item.dueDate && new Date(item.dueDate) < now;
                const isUpdating = updatingId === item.id;
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1fr 1.5fr 0.8fr",
                      padding: "12px 20px",
                      fontSize: 13,
                      borderBottom: `1px solid ${Z.borderLight}`,
                      opacity: isUpdating ? 0.6 : 1,
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{item.itemName}</div>
                    <div style={{ color: Z.textSecondary }}>
                      {item.businessName ?? item.customerName ?? "—"}
                    </div>
                    <div>
                      <select
                        value={item.currentStatus ?? ""}
                        onChange={(e) => updateStatus(item.id, e.target.value)}
                        style={{
                          padding: "6px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          border: `1px solid ${Z.border}`,
                          borderRadius: 8,
                          background: Z.bg,
                          color: Z.textPrimary,
                          outline: "none",
                          width: "100%",
                          maxWidth: 200,
                        }}
                      >
                        {options.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ color: isOverdue ? "#ef4444" : Z.textMuted, fontWeight: isOverdue ? 700 : 400, fontSize: 12 }}>
                      {fmtDate(item.dueDate)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {viewMode === "all" && Object.keys(byRole).length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: Z.textMuted }}>No active tasks in the funnel</div>
      )}
    </div>
  );
}
