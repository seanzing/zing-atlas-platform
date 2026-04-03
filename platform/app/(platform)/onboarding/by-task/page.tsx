"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Badge, SearchBar } from "@/components/ui";
import { Z } from "@/lib/constants";

interface TaskItem {
  id: string;
  currentStatus: string | null;
  statusOptions: { value: string; label: string }[] | null;
  owner: string | null;
  ownerRole: string | null;
  customerName: string | null;
  businessName: string | null;
  onboardingId: string;
  dueDate: string | null;
  isActive: boolean;
  notes: string | null;
}

interface TaskGroup {
  taskType: string;
  itemName: string;
  items: TaskItem[];
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

const NAV_TABS = [
  { label: "By Customer", href: "/onboarding" },
  { label: "By Task", href: "/onboarding/by-task" },
  { label: "Full View", href: "/onboarding/full" },
  { label: "Work Funnel", href: "/onboarding/funnel" },
];

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysOverdue(d: string | null): number | null {
  if (!d) return null;
  const due = new Date(d);
  const now = new Date();
  const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function OnboardingByTaskPage() {
  const { data: groups, mutate } = useSWR<TaskGroup[]>("/api/onboarding/by-task");
  const { data: team } = useSWR<TeamMember[]>("/api/team");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const list = groups ?? [];

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
        mutate();
      } else {
        setToast({ msg: "Update failed", type: "error" });
      }
    } catch {
      setToast({ msg: "Network error", type: "error" });
    }
    setUpdatingId(null);
    setTimeout(() => setToast(null), 2500);
  }

  async function updateOwner(itemId: string, owner: string) {
    setUpdatingId(itemId);
    try {
      // Use the existing onboarding item update route
      const res = await fetch(`/api/onboarding/items/${itemId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "_keep", ownerName: owner }),
      });
      if (res.ok) mutate();
    } catch { /* silent */ }
    setUpdatingId(null);
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
              background: t.href === "/onboarding/by-task" ? `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})` : "transparent",
              color: t.href === "/onboarding/by-task" ? "#fff" : Z.textSecondary,
              border: t.href === "/onboarding/by-task" ? "none" : `1px solid ${Z.border}`,
            }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Onboarding — By Task</h1>
        <SearchBar value={search} onChange={setSearch} placeholder="Search business or customer..." />
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

      {list.map((group) => {
        const items = group.items.filter((i) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return (i.businessName ?? "").toLowerCase().includes(q) || (i.customerName ?? "").toLowerCase().includes(q);
        });
        if (items.length === 0) return null;

        return (
          <div key={group.taskType} style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>{group.itemName}</span>
              <Badge label={`${items.length} active`} color={Z.ultramarine} />
            </div>

            <div style={{ background: Z.card, borderRadius: 14, border: `1px solid ${Z.border}`, overflow: "hidden" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr 1fr 1.2fr 0.8fr 0.6fr",
                  padding: "12px 20px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: Z.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  borderBottom: `1px solid ${Z.border}`,
                }}
              >
                <div>Business Name</div>
                <div>Customer</div>
                <div>Assigned To</div>
                <div>Current Status</div>
                <div>Due Date</div>
                <div>Days Overdue</div>
              </div>

              {items.map((item) => {
                const days = daysOverdue(item.dueDate);
                const options = Array.isArray(item.statusOptions) ? item.statusOptions : [];
                const isUpdating = updatingId === item.id;

                return (
                  <div
                    key={item.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1fr 1fr 1.2fr 0.8fr 0.6fr",
                      padding: "12px 20px",
                      fontSize: 13,
                      borderBottom: `1px solid ${Z.borderLight}`,
                      opacity: isUpdating ? 0.6 : 1,
                      transition: "opacity 0.2s",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{item.businessName ?? "—"}</div>
                    <div style={{ color: Z.textSecondary }}>{item.customerName ?? "—"}</div>
                    <div>
                      <select
                        value={item.owner ?? ""}
                        onChange={(e) => updateOwner(item.id, e.target.value)}
                        style={{
                          padding: "4px 8px",
                          fontSize: 12,
                          border: `1px solid ${Z.borderLight}`,
                          borderRadius: 6,
                          background: Z.bg,
                          color: Z.textPrimary,
                          outline: "none",
                          maxWidth: 140,
                        }}
                      >
                        <option value="">Unassigned</option>
                        {(team ?? []).filter(m => m.role !== undefined).map((m) => (
                          <option key={m.id} value={`${m.firstName} ${m.lastName}`}>
                            {m.firstName} {m.lastName}
                          </option>
                        ))}
                      </select>
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
                          maxWidth: 180,
                        }}
                      >
                        {options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ color: Z.textSecondary, fontSize: 12 }}>{fmtDate(item.dueDate)}</div>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>
                      {days === null ? "—" : days > 0 ? (
                        <span style={{ color: "#ef4444" }}>{days}d</span>
                      ) : (
                        <span style={{ color: "#10b981" }}>✓</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {list.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: Z.textMuted }}>No active onboarding tasks found</div>
      )}
    </div>
  );
}
