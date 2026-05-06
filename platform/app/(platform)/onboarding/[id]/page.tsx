"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { Z } from "@/lib/constants";
import { PageLoader } from "@/components/PageLoader";
import { Toast, useToast } from "@/components/Toast";
import FloatingEmailCompose from "@/components/FloatingEmailCompose";

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
const WS_MAP = Object.fromEntries(WEBSITE_STATUSES.map((s) => [s.value, s]));

const TRACK_ORDER = ["website", "landing_pages", "blogs", "ai_chat"];
const TRACK_LABELS: Record<string, string> = {
  website: "Website",
  landing_pages: "Landing Pages",
  blogs: "Blogs",
  ai_chat: "AI Chatbot",
};
const TRACK_COLORS: Record<string, string> = {
  website: Z.ultramarine,
  landing_pages: Z.bluejeans,
  blogs: Z.violet,
  ai_chat: Z.turquoise,
};

interface OnboardingItem {
  id: string;
  itemName: string | null;
  taskType: string | null;
  ownerRole: string | null;
  currentStatus: string | null;
  statusOptions: { value: string; label: string }[] | null;
  stage: string | null;
  owner: string | null;
  dueDate: string | null;
  completedAt: string | null;
  isActive: boolean;
  notes: string | null;
}

interface OnboardingDetail {
  id: string;
  customerName: string | null;
  businessName: string | null;
  email: string | null;
  phone: string | null;
  rep: string | null;
  wonDate: string | null;
  status: string | null;
  websiteStatus: string | null;
  existingUrl: string | null;
  newUrl: string | null;
  offshoreDesigner: string | null;
  usDesigner: string | null;
  items: OnboardingItem[];
  deal: { id: string; contactId: string | null; title: string | null } | null;
  product: { id: string; name: string; description: string | null } | null;
}

interface ActivityEntry {
  id: string;
  type: string;
  subject: string | null;
  body: string | null;
  toEmail: string | null;
  fromEmail: string | null;
  metadata: Record<string, string> | null;
  createdAt: string;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "\u2014";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "\u2014";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function OnboardingDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: ob, mutate } = useSWR<OnboardingDetail>(`/api/onboarding/${id}`, fetcher);
  const { data: activityData } = useSWR<{ activity: ActivityEntry[] }>(
    `/api/onboarding/${id}/activity`,
    fetcher
  );
  const activity = activityData?.activity ?? [];

  const [composeOpen, setComposeOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const { toast, showToast } = useToast();

  if (!ob) return <PageLoader />;

  const ws = ob.websiteStatus || "not_started";
  const wsInfo = WS_MAP[ws] || WS_MAP.not_started;

  const itemsByTrack = TRACK_ORDER.reduce<Record<string, OnboardingItem[]>>((acc, t) => {
    acc[t] = ob.items.filter((i) => i.taskType === t);
    return acc;
  }, {});
  // Catch any items with unrecognized task types
  const otherItems = ob.items.filter((i) => !TRACK_ORDER.includes(i.taskType || ""));

  const updateWebsiteStatus = async (status: string) => {
    setUpdatingStatus(true);
    const res = await fetch(`/api/onboarding/${id}/website-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      mutate({ ...ob, websiteStatus: status }, false);
    } else {
      showToast("Failed to update status", false);
    }
    setUpdatingStatus(false);
  };

  const updateItemStatus = async (itemId: string, status: string) => {
    await fetch(`/api/onboarding/items/${itemId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    mutate();
  };

  const markItemComplete = async (itemId: string) => {
    await fetch(`/api/onboarding/items/${itemId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed", stage: "complete" }),
    });
    mutate();
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Back nav */}
      <div style={{ marginBottom: 20, display: "flex", gap: 16, alignItems: "center" }}>
        <Link href="/onboarding/production" style={{ color: Z.textMuted, fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
          &larr; Work Queue
        </Link>
        <span style={{ color: Z.borderLight }}>&middot;</span>
        <Link href="/onboarding" style={{ color: Z.textMuted, fontSize: 13, textDecoration: "none" }}>
          All Onboarding
        </Link>
      </div>

      {/* Customer header */}
      <div style={{
        background: Z.card,
        border: `1px solid ${Z.border}`,
        borderRadius: 16,
        padding: "24px 28px",
        marginBottom: 24,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: Z.textPrimary, margin: "0 0 4px" }}>
              {ob.businessName || ob.customerName || "Unnamed Customer"}
            </h1>
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              {ob.customerName && ob.businessName && (
                <span style={{ fontSize: 13, color: Z.textSecondary }}>{ob.customerName}</span>
              )}
              {ob.product && (
                <span style={{
                  background: `${Z.violet}18`,
                  color: Z.violet,
                  border: `1px solid ${Z.violet}35`,
                  borderRadius: 20,
                  padding: "2px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  {ob.product.name || ob.product.description}
                </span>
              )}
              {ob.rep && <span style={{ fontSize: 12, color: Z.textMuted }}>Rep: {ob.rep}</span>}
              {ob.wonDate && <span style={{ fontSize: 12, color: Z.textMuted }}>Won {fmtDate(ob.wonDate)}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {ob.deal?.contactId && (
              <Link
                href={`/contacts/${ob.deal.contactId}`}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  border: `1px solid ${Z.border}`,
                  borderRadius: 8,
                  color: Z.textSecondary,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                Contact Record
              </Link>
            )}
            <button
              onClick={() => setComposeOpen(true)}
              style={{
                padding: "8px 16px",
                background: `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`,
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Email Customer
            </button>
          </div>
        </div>

        {/* Contact info row */}
        <div style={{ display: "flex", gap: 24, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${Z.borderLight}` }}>
          {ob.email && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: Z.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Email</div>
              <a href={`mailto:${ob.email}`} style={{ fontSize: 13, color: Z.ultramarine, textDecoration: "none" }}>{ob.email}</a>
            </div>
          )}
          {ob.phone && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: Z.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Phone</div>
              <span style={{ fontSize: 13, color: Z.textPrimary }}>{ob.phone}</span>
            </div>
          )}
          {ob.existingUrl && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: Z.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Existing Site</div>
              <a href={ob.existingUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: Z.ultramarine, textDecoration: "none" }}>{ob.existingUrl}</a>
            </div>
          )}
          {ob.newUrl && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: Z.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>New URL</div>
              <a href={ob.newUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: Z.turquoise, textDecoration: "none" }}>{ob.newUrl}</a>
            </div>
          )}
        </div>
      </div>

      {/* Two-column layout: tracks + activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "start" }}>
        {/* Left: tracks */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Website track — uses websiteStatus on Onboarding */}
          <div style={{
            background: Z.card,
            border: `1px solid ${Z.border}`,
            borderRadius: 14,
            overflow: "hidden",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              borderBottom: `1px solid ${Z.borderLight}`,
              background: `${TRACK_COLORS.website}08`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 3, height: 18, borderRadius: 2, background: TRACK_COLORS.website }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: Z.textPrimary }}>Website</span>
              </div>
              <select
                value={ws}
                disabled={updatingStatus}
                onChange={(e) => updateWebsiteStatus(e.target.value)}
                style={{
                  padding: "5px 12px",
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
            {/* Website task items */}
            {itemsByTrack.website.length > 0 ? (
              itemsByTrack.website.map((item) => (
                <TaskItemRow key={item.id} item={item} onStatusChange={updateItemStatus} onComplete={markItemComplete} />
              ))
            ) : (
              <div style={{ padding: "14px 20px", color: Z.textMuted, fontSize: 13 }}>No task items</div>
            )}
          </div>

          {/* Other tracks */}
          {(["landing_pages", "blogs", "ai_chat"] as const).map((track) => {
            const trackItems = itemsByTrack[track];
            const color = TRACK_COLORS[track];
            const label = TRACK_LABELS[track];
            if (trackItems.length === 0) return null;
            return (
              <div key={track} style={{
                background: Z.card,
                border: `1px solid ${Z.border}`,
                borderRadius: 14,
                overflow: "hidden",
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "14px 20px",
                  borderBottom: `1px solid ${Z.borderLight}`,
                  background: `${color}08`,
                }}>
                  <div style={{ width: 3, height: 18, borderRadius: 2, background: color, marginRight: 10 }} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: Z.textPrimary }}>{label}</span>
                </div>
                {trackItems.map((item) => (
                  <TaskItemRow key={item.id} item={item} onStatusChange={updateItemStatus} onComplete={markItemComplete} />
                ))}
              </div>
            );
          })}

          {/* Catch-all for unrecognized task types */}
          {otherItems.length > 0 && (
            <div style={{ background: Z.card, border: `1px solid ${Z.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${Z.borderLight}` }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: Z.textPrimary }}>Other Tasks</span>
              </div>
              {otherItems.map((item) => (
                <TaskItemRow key={item.id} item={item} onStatusChange={updateItemStatus} onComplete={markItemComplete} />
              ))}
            </div>
          )}
        </div>

        {/* Right: activity feed */}
        <div style={{
          background: Z.card,
          border: `1px solid ${Z.border}`,
          borderRadius: 14,
          overflow: "hidden",
          position: "sticky",
          top: 24,
        }}>
          <div style={{
            padding: "14px 20px",
            borderBottom: `1px solid ${Z.borderLight}`,
            fontSize: 13,
            fontWeight: 800,
            color: Z.textPrimary,
          }}>
            Activity
          </div>
          {activity.length === 0 ? (
            <div style={{ padding: "24px 20px", color: Z.textMuted, fontSize: 13 }}>
              No activity yet. Emails sent and status changes will appear here.
            </div>
          ) : (
            <div style={{ maxHeight: 520, overflowY: "auto" }}>
              {activity.map((entry) => (
                <div key={entry.id} style={{
                  padding: "12px 20px",
                  borderBottom: `1px solid ${Z.borderLight}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: Z.textPrimary, flex: 1 }}>
                      {entry.type === "email_sent"
                        ? entry.subject || "(no subject)"
                        : entry.type === "status_change"
                        ? `Status: ${entry.metadata?.from || "?"} \u2192 ${entry.metadata?.to || "?"}`
                        : entry.type}
                    </span>
                  </div>
                  {entry.type === "email_sent" && (
                    <div style={{ fontSize: 11, color: Z.textMuted, marginBottom: 4 }}>
                      To: {entry.toEmail} &middot; From: {entry.fromEmail}
                    </div>
                  )}
                  {entry.body && entry.type === "email_sent" && (
                    <div style={{ fontSize: 12, color: Z.textSecondary, whiteSpace: "pre-wrap", overflow: "hidden", maxHeight: 48, lineHeight: 1.5 }}>
                      {entry.body}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: Z.textMuted, marginTop: 4 }}>
                    {new Date(entry.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating email compose */}
      {composeOpen && (
        <FloatingEmailCompose
          onboardingId={id}
          contactId={ob.deal?.contactId ?? undefined}
          contactName={ob.businessName || ob.customerName || "Customer"}
          contactEmail={ob.email || ""}
          onClose={() => setComposeOpen(false)}
          onEmailSent={() => {
            showToast("Email sent", true);
            setComposeOpen(false);
          }}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}

function TaskItemRow({
  item,
  onStatusChange,
  onComplete,
}: {
  item: OnboardingItem;
  onStatusChange: (id: string, status: string) => void;
  onComplete: (id: string) => void;
}) {
  const isComplete = item.stage === "complete" || item.completedAt != null;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr auto auto",
      gap: 12,
      alignItems: "center",
      padding: "12px 20px",
      borderBottom: `1px solid ${Z.borderLight}`,
      opacity: isComplete ? 0.6 : 1,
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: Z.textPrimary, textDecoration: isComplete ? "line-through" : "none" }}>
          {item.itemName || item.taskType || "\u2014"}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
          {item.owner && (
            <span style={{ fontSize: 11, color: Z.textMuted }}>{item.owner}</span>
          )}
          {item.dueDate && (
            <span style={{ fontSize: 11, color: new Date(item.dueDate) < new Date() && !isComplete ? "#ef4444" : Z.textMuted }}>
              Due {new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </div>

      {/* Status dropdown if options exist and not website taskType (website uses parent websiteStatus) */}
      {item.statusOptions && item.statusOptions.length > 0 && item.taskType !== "website" && !isComplete && (
        <select
          value={item.currentStatus ?? ""}
          onChange={(e) => onStatusChange(item.id, e.target.value)}
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            border: `1px solid ${Z.border}`,
            background: Z.bg,
            color: Z.textSecondary,
            fontSize: 11,
            cursor: "pointer",
            outline: "none",
          }}
        >
          {item.statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      {/* Complete button */}
      {!isComplete && (
        <button
          onClick={() => onComplete(item.id)}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: `1px solid ${Z.border}`,
            background: "transparent",
            color: Z.textMuted,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#10b981";
            e.currentTarget.style.color = "#10b981";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = Z.border;
            e.currentTarget.style.color = Z.textMuted;
          }}
        >
          Done
        </button>
      )}
      {isComplete && (
        <span style={{ fontSize: 11, color: "#10b981", fontWeight: 700 }}>Complete</span>
      )}
    </div>
  );
}
