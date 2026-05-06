"use client";

import { useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Z } from "@/lib/constants";
import { useAuthContext } from "@/lib/auth-context";
import { PageLoader } from "@/components/PageLoader";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const WEBSITE_STATUSES: Record<string, { label: string; color: string }> = {
  not_started: { label: "Not Started", color: "#6b7280" },
  building: { label: "Building", color: Z.ultramarine },
  draft_sent: { label: "Draft Sent", color: "#f59e0b" },
  in_revision: { label: "In Revision", color: "#f97316" },
  customer_approved: { label: "Customer Approved", color: "#22c55e" },
  in_qa: { label: "In QA", color: Z.violet },
  published: { label: "Published", color: Z.turquoise },
};

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
  items: { id: string; taskType: string | null; stage: string | null; dueDate: string | null; currentStatus: string | null }[];
}

interface ActivityEntry {
  id: string;
  type: string;
  subject: string | null;
  toEmail: string | null;
  fromEmail: string | null;
  metadata: Record<string, string> | null;
  createdAt: string;
}

function StatBox({ label, value, color, href }: { label: string; value: number | string; color: string; href?: string }) {
  const inner = (
    <div style={{
      background: Z.card,
      border: `1px solid ${Z.border}`,
      borderRadius: 14,
      padding: "20px 24px",
      flex: 1,
      minWidth: 140,
      transition: "border-color 0.15s",
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: Z.textMuted, fontWeight: 600 }}>{label}</div>
    </div>
  );
  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none", flex: 1, minWidth: 140 }}
        onMouseEnter={(e) => { (e.currentTarget.firstChild as HTMLElement).style.borderColor = color; }}
        onMouseLeave={(e) => { (e.currentTarget.firstChild as HTMLElement).style.borderColor = Z.border; }}
      >
        {inner}
      </Link>
    );
  }
  return inner;
}

export default function DashboardPage() {
  const { user } = useAuthContext();
  const { data: rows } = useSWR<OnboardingRow[]>("/api/onboarding/full", fetcher);
  const { data: activityData } = useSWR<{ activity: ActivityEntry[] }>(
    "/api/dashboard/activity",
    fetcher
  );

  const firstName = user?.teamMember?.firstName || user?.email?.split("@")[0] || "there";
  const role = user?.teamMember?.role || "";

  const stats = useMemo(() => {
    if (!rows) return null;
    const active = rows.filter((r) => r.websiteStatus !== "published");
    const overdue = rows.filter((r) => {
      const ws = r.websiteStatus || "not_started";
      if (ws === "published") return false;
      return r.items.some((i) => i.dueDate && new Date(i.dueDate) < new Date() && i.stage !== "complete");
    });
    const inDesign = rows.filter((r) => ["not_started", "building", "draft_sent", "in_revision"].includes(r.websiteStatus || "not_started"));
    const inPublish = rows.filter((r) => ["customer_approved", "in_qa"].includes(r.websiteStatus || "not_started"));
    const published = rows.filter((r) => r.websiteStatus === "published");
    return { active: active.length, overdue: overdue.length, inDesign: inDesign.length, inPublish: inPublish.length, published: published.length };
  }, [rows]);

  // Role-based "my queue" — items relevant to this user's role
  const myQueue = useMemo(() => {
    if (!rows) return [];
    if (role.startsWith("designer")) {
      return rows.filter((r) => ["building", "draft_sent", "in_revision"].includes(r.websiteStatus || ""));
    }
    if (role === "publishing") {
      return rows.filter((r) => ["customer_approved", "in_qa"].includes(r.websiteStatus || ""));
    }
    // Default: show active items for sales/admin/others
    return rows.filter((r) => r.websiteStatus !== "published").slice(0, 10);
  }, [rows, role]);

  const activity = activityData?.activity ?? [];

  if (!rows) return <PageLoader />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: Z.textPrimary, margin: 0 }}>
          {greeting}, {firstName}
        </h1>
        <p style={{ fontSize: 14, color: Z.textSecondary, margin: "4px 0 0" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats row */}
      {stats && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 32 }}>
          <StatBox label="Active Customers" value={stats.active} color={Z.ultramarine} href="/onboarding/production" />
          <StatBox label="In Design" value={stats.inDesign} color={Z.bluejeans} href="/onboarding/production" />
          <StatBox label="In Publishing" value={stats.inPublish} color="#22c55e" href="/onboarding/production" />
          <StatBox label="Overdue" value={stats.overdue} color={stats.overdue > 0 ? "#ef4444" : Z.textMuted} href="/onboarding/production" />
          <StatBox label="Published (Total)" value={stats.published} color={Z.turquoise} />
        </div>
      )}

      {/* Two column: my queue + recent activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
        {/* My Queue */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: Z.textPrimary }}>
              {role.startsWith("designer") ? "Design Queue" : role === "publishing" ? "Publishing Queue" : "Active Customers"}
            </div>
            <Link href="/onboarding/production" style={{ fontSize: 12, color: Z.ultramarine, textDecoration: "none", fontWeight: 600 }}>
              View all →
            </Link>
          </div>
          <div style={{ background: Z.card, border: `1px solid ${Z.border}`, borderRadius: 14, overflow: "hidden" }}>
            {myQueue.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center", color: Z.textMuted, fontSize: 13 }}>
                Nothing in your queue right now
              </div>
            ) : (
              myQueue.slice(0, 12).map((row, idx) => {
                const ws = row.websiteStatus || "not_started";
                const wsInfo = WEBSITE_STATUSES[ws] || WEBSITE_STATUSES.not_started;
                const hasOverdue = row.items.some(
                  (i) => i.dueDate && new Date(i.dueDate) < new Date() && i.stage !== "complete"
                );
                return (
                  <Link
                    key={row.onboardingId}
                    href={`/onboarding/${row.onboardingId}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "13px 20px",
                      borderBottom: idx < myQueue.length - 1 ? `1px solid ${Z.borderLight}` : "none",
                      textDecoration: "none",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = Z.bg; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: Z.textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
                        {row.businessName || row.customerName || "\u2014"}
                        {hasOverdue && <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 800 }}>OVERDUE</span>}
                      </div>
                      <div style={{ fontSize: 11, color: Z.textMuted, marginTop: 2 }}>
                        {row.customerName && row.businessName ? row.customerName : ""}
                        {row.product && <span style={{ marginLeft: 8, color: Z.violet }}>{row.product}</span>}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 20,
                      background: `${wsInfo.color}18`,
                      color: wsInfo.color,
                      border: `1px solid ${wsInfo.color}35`,
                      whiteSpace: "nowrap",
                    }}>
                      {wsInfo.label}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: Z.textPrimary, marginBottom: 14 }}>
            Recent Activity
          </div>
          <div style={{ background: Z.card, border: `1px solid ${Z.border}`, borderRadius: 14, overflow: "hidden" }}>
            {activity.length === 0 ? (
              <div style={{ padding: "24px 16px", color: Z.textMuted, fontSize: 13 }}>No recent activity.</div>
            ) : (
              activity.slice(0, 15).map((entry, idx) => (
                <div key={entry.id} style={{
                  padding: "11px 16px",
                  borderBottom: idx < activity.length - 1 ? `1px solid ${Z.borderLight}` : "none",
                }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 13, marginTop: 1 }}>
                      {entry.type === "email_sent" ? "\u2709" : "\u2195"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: Z.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.type === "email_sent"
                          ? entry.subject || "(no subject)"
                          : `Status: ${entry.metadata?.from || "?"} \u2192 ${entry.metadata?.to || "?"}`}
                      </div>
                      {entry.type === "email_sent" && (
                        <div style={{ fontSize: 10, color: Z.textMuted, marginTop: 1 }}>To: {entry.toEmail}</div>
                      )}
                      <div style={{ fontSize: 10, color: Z.textMuted, marginTop: 2 }}>
                        {new Date(entry.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
