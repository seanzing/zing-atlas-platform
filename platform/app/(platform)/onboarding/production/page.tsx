"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";
import { Z } from "@/lib/constants";
import { Badge, Btn, Modal, FormField, Input } from "@/components/ui";
import { useToast, Toast } from "@/components/Toast";
import { useAuthContext } from "@/lib/auth-context";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const WEBSITE_STATUSES = [
  { value: "not_started", label: "Not Started", color: "#666" },
  { value: "building", label: "Building", color: Z.ultramarine },
  { value: "draft_sent", label: "Draft Sent", color: "#f59e0b" },
  { value: "in_revision", label: "In Revision", color: "#f97316" },
  { value: "customer_approved", label: "Customer Approved", color: "#22c55e" },
  { value: "in_qa", label: "In QA", color: Z.violet },
  { value: "published", label: "Published", color: Z.turquoise },
];

const STATUS_MAP = Object.fromEntries(WEBSITE_STATUSES.map((s) => [s.value, s]));

const DESIGN_QUEUE = ["not_started", "building", "draft_sent", "in_revision"];
const PUBLISH_QUEUE = ["customer_approved", "in_qa"];

type Tab = "all" | "design" | "publish";

interface OnboardingItem {
  id: string;
  taskType: string | null;
  currentStatus: string | null;
}

interface OnboardingRow {
  onboardingId: string;
  customerName: string | null;
  businessName: string | null;
  email?: string | null;
  websiteStatus?: string | null;
  items: OnboardingItem[];
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
  teamMember: { firstName: string | null; lastName: string | null } | null;
}

export default function ProductionPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [emailModal, setEmailModal] = useState<OnboardingRow | null>(null);
  const { toast, showToast } = useToast();
  const { user } = useAuthContext();

  const { data: rows } = useSWR<OnboardingRow[]>("/api/onboarding/full", fetcher);
  const { data: activity } = useSWR<ActivityEntry[]>(
    selectedId ? `/api/onboarding/${selectedId}/activity` : null,
    fetcher
  );

  const filtered = rows?.filter((r) => {
    const ws = r.websiteStatus || "not_started";
    if (tab === "design") return DESIGN_QUEUE.includes(ws);
    if (tab === "publish") return PUBLISH_QUEUE.includes(ws);
    return true;
  });

  const updateStatus = useCallback(
    async (id: string, status: string) => {
      const res = await fetch(`/api/onboarding/${id}/website-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        mutate("/api/onboarding/full");
        showToast("Status updated", true);
      } else {
        showToast("Failed to update status", false);
      }
    },
    [showToast]
  );

  const getItemStatus = (items: OnboardingItem[], taskType: string) => {
    const item = items.find((i) => i.taskType === taskType);
    return item?.currentStatus || null;
  };

  if (!rows) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: Z.textMuted }}>
        Loading...
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: Z.textPrimary, marginBottom: 4 }}>
        Production
      </h1>
      <p style={{ fontSize: 14, color: Z.textSecondary, marginBottom: 24 }}>
        Website build workflow and email communication
      </p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {([
          { key: "all", label: "All" },
          { key: "design", label: "Design Queue" },
          { key: "publish", label: "Publishing Queue" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 20px",
              borderRadius: 20,
              border: tab === t.key ? "none" : `1px solid ${Z.border}`,
              background:
                tab === t.key
                  ? `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`
                  : "transparent",
              color: tab === t.key ? "#fff" : Z.textSecondary,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          background: Z.card,
          border: `1px solid ${Z.border}`,
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 80px",
            padding: "12px 20px",
            background: Z.bg,
            fontSize: 11,
            fontWeight: 700,
            color: Z.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            borderBottom: `1px solid ${Z.border}`,
          }}
        >
          <div>Customer</div>
          <div>Website Status</div>
          <div>Landing Pages</div>
          <div>Blog</div>
          <div>AI Chatbot</div>
          <div>Actions</div>
        </div>

        {/* Rows */}
        {filtered && filtered.length > 0 ? (
          filtered.map((row) => {
            const ws = row.websiteStatus || "not_started";
            const wsInfo = STATUS_MAP[ws] || STATUS_MAP.not_started;
            const isSelected = selectedId === row.onboardingId;
            const lpStatus = getItemStatus(row.items, "landing_pages");
            const blogStatus =
              getItemStatus(row.items, "blogs") || getItemStatus(row.items, "seo");
            const chatStatus = getItemStatus(row.items, "ai_chat");

            return (
              <div
                key={row.onboardingId}
                onClick={() => setSelectedId(isSelected ? null : row.onboardingId)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 80px",
                  padding: "14px 20px",
                  borderBottom: `1px solid ${Z.borderLight}`,
                  cursor: "pointer",
                  background: isSelected ? `${Z.ultramarine}08` : "transparent",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = Z.bg;
                }}
                onMouseLeave={(e) => {
                  if (!isSelected)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: Z.textPrimary }}>
                    {row.businessName || "—"}
                  </div>
                  <div style={{ fontSize: 11, color: Z.textMuted }}>
                    {row.customerName || "—"}
                  </div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <select
                    value={ws}
                    onChange={(e) => updateStatus(row.onboardingId, e.target.value)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 8,
                      border: `1px solid ${Z.border}`,
                      background: `${wsInfo.color}12`,
                      color: wsInfo.color,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    {WEBSITE_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  {lpStatus ? (
                    <Badge label={lpStatus} color={Z.bluejeans} />
                  ) : (
                    <span style={{ color: Z.textMuted, fontSize: 12 }}>—</span>
                  )}
                </div>
                <div>
                  {blogStatus ? (
                    <Badge label={blogStatus} color={Z.violet} />
                  ) : (
                    <span style={{ color: Z.textMuted, fontSize: 12 }}>—</span>
                  )}
                </div>
                <div>
                  {chatStatus ? (
                    <Badge label={chatStatus} color={Z.turquoise} />
                  ) : (
                    <span style={{ color: Z.textMuted, fontSize: 12 }}>—</span>
                  )}
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setEmailModal(row)}
                    title="Send Email"
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
                      transition: "all 0.15s",
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
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: Z.textMuted, fontSize: 13 }}>
            No items in this queue
          </div>
        )}
      </div>

      {/* Activity Feed Panel */}
      {selectedId && (
        <div
          style={{
            marginTop: 24,
            background: Z.card,
            border: `1px solid ${Z.border}`,
            borderRadius: 16,
            padding: "20px 24px",
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 800, color: Z.textPrimary, marginBottom: 16 }}>
            Activity
          </h3>
          {!activity ? (
            <div style={{ color: Z.textMuted, fontSize: 13 }}>Loading...</div>
          ) : activity.length === 0 ? (
            <div style={{ color: Z.textMuted, fontSize: 13 }}>No activity yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activity.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    padding: "10px 0",
                    borderBottom: `1px solid ${Z.borderLight}`,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        a.type === "email_sent"
                          ? `${Z.bluejeans}18`
                          : `${Z.violet}18`,
                      color: a.type === "email_sent" ? Z.bluejeans : Z.violet,
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    {a.type === "email_sent" ? (
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: Z.textPrimary }}>
                      {a.type === "email_sent"
                        ? `Email sent to ${a.toEmail}`
                        : a.metadata
                        ? `${(a.metadata as Record<string, string>).field}: ${(a.metadata as Record<string, string>).from} → ${(a.metadata as Record<string, string>).to}`
                        : a.subject || "Activity"}
                    </div>
                    <div style={{ fontSize: 11, color: Z.textMuted, marginTop: 2 }}>
                      {a.teamMember
                        ? `${a.teamMember.firstName || ""} ${a.teamMember.lastName || ""}`.trim()
                        : "System"}{" "}
                      · {new Date(a.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Send Email Modal */}
      {emailModal && (
        <SendEmailModal
          row={emailModal}
          userName={user?.teamMember?.firstName || ""}
          onClose={() => setEmailModal(null)}
          onSuccess={() => {
            showToast("Email sent", true);
            setEmailModal(null);
            if (selectedId) mutate(`/api/onboarding/${selectedId}/activity`);
          }}
          onNotConfigured={() => {
            showToast("Gmail not configured yet — credentials pending", false);
            setEmailModal(null);
          }}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}

function SendEmailModal({
  row,
  userName,
  onClose,
  onSuccess,
  onNotConfigured,
}: {
  row: OnboardingRow;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
  onNotConfigured: () => void;
}) {
  const [to, setTo] = useState(row.email || "");
  const [subject, setSubject] = useState(
    `Your website draft is ready for review - ${row.businessName || ""}`
  );
  const [previewUrl, setPreviewUrl] = useState("");
  const [body, setBody] = useState(
    `Hi ${row.customerName || ""},<br><br>We have completed the first draft of your website. You can preview it here:<br><br><a href="[PREVIEW_URL]">[PREVIEW_URL]</a><br><br>Please take a look and let us know any changes you would like to make.<br><br>Best,<br>${userName}`
  );
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    const finalBody = previewUrl
      ? body.replace(/\[PREVIEW_URL\]/g, previewUrl)
      : body;
    const res = await fetch(`/api/onboarding/${row.onboardingId}/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, body: finalBody, previewUrl }),
    });
    setSending(false);

    if (res.status === 503) {
      onNotConfigured();
    } else if (res.ok) {
      onSuccess();
    }
  };

  return (
    <Modal open onClose={onClose} title="Send Email">
      <FormField label="To">
        <Input value={to} onChange={setTo} placeholder="email@example.com" />
      </FormField>
      <FormField label="Subject">
        <Input value={subject} onChange={setSubject} />
      </FormField>
      <FormField label="Preview URL">
        <Input
          value={previewUrl}
          onChange={setPreviewUrl}
          placeholder="https://preview.example.com/..."
        />
      </FormField>
      <FormField label="Body (HTML)">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          style={{
            width: "100%",
            padding: "10px 14px",
            background: Z.bg,
            border: `1px solid ${Z.border}`,
            borderRadius: 8,
            color: Z.textPrimary,
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
            resize: "vertical",
          }}
        />
      </FormField>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        <Btn variant="secondary" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={handleSend} disabled={sending || !to || !subject}>
          {sending ? "Sending..." : "Send Email"}
        </Btn>
      </div>
    </Modal>
  );
}
