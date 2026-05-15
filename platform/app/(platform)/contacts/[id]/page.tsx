"use client";

import { useState, useEffect } from "react";
import FloatingEmailCompose from "@/components/FloatingEmailCompose";
import EmailThreadCard from "@/components/EmailThreadCard";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { PageLoader } from "@/components/PageLoader";
import { Toast, useToast } from "@/components/Toast";
import {
  Badge,
  Avatar,
  Btn,
  FormField,
  Input,
  Modal,
  Select,
} from "@/components/ui";
import {
  Z,
  fmt,
  STATUS_COLORS,
  LEAD_SOURCE_COLORS,
} from "@/lib/constants";

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  createdAt: string;
  productId?: string | null;
  domainType?: string | null;
  domainName?: string | null;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
}

interface OnboardingItem {
  id: string;
  itemName: string | null;
  currentStatus: string | null;
  completedAt: string | null;
  dueDate: string | null;
  owner: string | null;
  ownerRole: string | null;
  stage: string | null;
  isActive: boolean;
}

interface OnboardingRecord {
  id: string;
  businessName: string | null;
  customerName: string | null;
  websiteStatus: string | null;
  status: string | null;
  wonDate: string | null;
}

// Campaign data is included inline from the contacts API

interface ProductOption {
  id: string;
  description: string;
  price: number;
}

interface ContactNote {
  id: string;
  body: string;
  createdAt: string;
}

interface ContactTask {
  id: string;
  title: string;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

interface ContactDetail {
  id: string;
  name: string;
  email: string;
  secondaryEmail: string | null;
  company: string;
  phone: string;
  status: string;
  lastContact: string;
  value: number;
  notes: string | null;
  leadSource: string;
  campaignId: string | null;
  avatar: string | null;
  deals: Deal[];
  tickets: Ticket[];
  onboarding: OnboardingItem[];
  onboardingRecords?: OnboardingRecord[];
}

interface ActivityEntry {
  id: string;
  type: string;
  subject: string | null;
  body: string | null;
  toEmail: string | null;
  fromEmail: string | null;
  teamMemberId: string | null;
  createdAt: string;
}

interface EmailMessage {
  id: string;
  type: "email_sent" | "email_received";
  subject: string | null;
  body: string | null;
  fromEmail: string | null;
  toEmail: string | null;
  createdAt: string;
  metadata: {
    bodyHtml?: string;
    hasHtml?: boolean;
    attachments?: Array<{ name: string; size: number; mimeType: string }>;
    gmailMessageId?: string;
    deliveryStatus?: string;
    deliveredAt?: string;
    openedAt?: string;
    clickedAt?: string;
    bouncedAt?: string;
    source?: string;
  } | null;
}

interface EmailThread {
  gmailThreadId: string;
  subject: string;
  messageCount: number;
  lastMessageAt: string;
  participants: string[];
  messages: EmailMessage[];
}

interface StandaloneEntry {
  id: string;
  type: string;
  subject: string | null;
  body: string | null;
  fromEmail: string | null;
  toEmail: string | null;
  createdAt: string;
  metadata?: {
    deliveryStatus?: string;
    deliveredAt?: string;
    openedAt?: string;
    clickedAt?: string;
    bouncedAt?: string;
    source?: string;
    [key: string]: unknown;
  } | null;
}

const TABS = ["Customer Info", "Activity", "Pre Sale Comms", "Form Submissions", "Cancelled"];

const EMAIL_TEMPLATES = [
  {
    label: "Website Draft Ready",
    subject: "Your website draft is ready for review",
    body: "Hi NAME,\n\nWe have completed the first draft of your website and would love to get your feedback.\n\nPlease take a look and let us know what changes you would like to make.\n\nBest,\nSENDER",
  },
  {
    label: "Following Up",
    subject: "Following up on your website",
    body: "Hi NAME,\n\nJust checking in to see if you had a chance to review your website draft. We want to make sure everything looks exactly right for you.\n\nLet us know if you have any questions!\n\nBest,\nSENDER",
  },
  {
    label: "Revisions Complete",
    subject: "Your revisions are ready",
    body: "Hi NAME,\n\nWe have made the changes you requested to your website. Please take another look and let us know if everything looks good!\n\nBest,\nSENDER",
  },
  {
    label: "Website Live",
    subject: "Your website is live!",
    body: "Hi NAME,\n\nExciting news: your website is now live! Thank you for choosing ZING. We are here if you need anything!\n\nBest,\nSENDER",
  },
];

function formatRelative(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function taskDueBadge(dueDate: string | null): { label: string; color: string; bg: string } | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.floor((due.getTime() - now.setHours(0, 0, 0, 0)) / 86400000);
  if (diffDays < 0) return { label: "Overdue", color: "#fff", bg: "#ef4444" };
  if (diffDays === 0) return { label: "Today", color: "#fff", bg: "#f59e0b" };
  if (diffDays === 1) return { label: "Tomorrow", color: "#fff", bg: "#f59e0b" };
  return { label: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }), color: Z.textMuted, bg: Z.borderLight };
}

function generateTimeline(
  contact: ContactDetail,
  tab: string
): { channel: string; date: string; note: string; color: string }[] {
  const entries: { channel: string; date: string; note: string; color: string }[] = [];

  if (tab === "Pre Sale Comms") {
    // Generate from deals and lead info
    if (contact.deals && contact.deals.length > 0) {
      contact.deals.forEach((deal) => {
        entries.push({
          channel: "Pipeline",
          date: fmtDate(deal.createdAt),
          note: `Deal "${deal.title}" created - ${fmt(Number(deal.value) || 0)} - Stage: ${deal.stage}`,
          color: Z.ultramarine,
        });
      });
    }
    entries.push({
      channel: contact.leadSource || "Unknown",
      date: fmtDate(contact.lastContact),
      note: `Initial outreach via ${(contact.leadSource || "unknown").toLowerCase()} campaign`,
      color: LEAD_SOURCE_COLORS[contact.leadSource] || Z.bluejeans,
    });
    entries.push({
      channel: "System",
      date: fmtDate(contact.lastContact),
      note: `Contact added as ${contact.status} from ${contact.leadSource || "unknown"} source`,
      color: Z.turquoise,
    });
    if (contact.notes) {
      entries.push({
        channel: "Note",
        date: fmtDate(contact.lastContact),
        note: contact.notes,
        color: Z.violet,
      });
    }
  } else if (tab === "Post Sale Comms") {
    // Generate from onboarding and tickets
    if (contact.onboarding && contact.onboarding.length > 0) {
      contact.onboarding.forEach((item) => {
        entries.push({
          channel: "Onboarding",
          date: fmtDate(item.dueDate),
          note: `${item.itemName ?? "Untitled"} - ${item.currentStatus ?? "—"}`,
          color: item.currentStatus === "complete" ? "#10b981" : Z.bluejeans,
        });
      });
    }
    if (contact.tickets && contact.tickets.length > 0) {
      contact.tickets.forEach((ticket) => {
        entries.push({
          channel: "Support",
          date: fmtDate(ticket.createdAt),
          note: `${ticket.subject} [${ticket.priority}] - ${ticket.status}`,
          color: ticket.status === "resolved" ? "#10b981" : "#ef4444",
        });
      });
    }
    if (entries.length === 0) {
      entries.push({
        channel: "System",
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        note: "No post-sale communications yet",
        color: Z.grey,
      });
    }
  } else if (tab === "Cancelled") {
    if (contact.status === "Cancelled") {
      entries.push({
        channel: "System",
        date: fmtDate(contact.lastContact),
        note: "Customer status changed to Cancelled",
        color: "#ef4444",
      });
      entries.push({
        channel: "Win-Back",
        date: fmtDate(contact.lastContact),
        note: "Added to win-back campaign queue",
        color: Z.violet,
      });
    } else if (contact.status === "DNC") {
      entries.push({
        channel: "System",
        date: fmtDate(contact.lastContact),
        note: "Contact marked as Do Not Contact",
        color: Z.grey,
      });
    } else {
      entries.push({
        channel: "System",
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        note: "No cancellation history",
        color: Z.grey,
      });
    }
  }

  return entries;
}

export default function ContactDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [activeTab, setActiveTab] = useState("Customer Info");
  const { data: contact, error: contactError, mutate } = useSWR<ContactDetail>(`/api/contacts/${id}`, fetcher);
  const { data: activityData, mutate: mutateActivity } = useSWR<{
    threads: EmailThread[];
    standalone: StandaloneEntry[];
  }>(
    `/api/contacts/${id}/activity`,
    fetcher,
    { refreshInterval: activeTab === "Activity" ? 60000 : 0 }
  );
  const threads = activityData?.threads ?? [];
  const standalone = activityData?.standalone ?? [];
  const { data: campaigns } = useSWR<{ id: string; name: string; type: string }[]>(
    "/api/campaigns"
  );
  const { data: productOptions } = useSWR<ProductOption[]>("/api/products");
  const { data: contactNotes, mutate: mutateNotes } = useSWR<ContactNote[]>(`/api/contacts/${id}/notes`);

  interface FormSubmission {
    id: string;
    formName: string;
    formData: Record<string, unknown>;
    submittedAt: string;
  }
  const { data: formSubmissions } = useSWR<FormSubmission[]>(
    activeTab === "Form Submissions" ? `/api/form-submissions?contactId=${id}` : null
  );
  const { data: contactTasks, mutate: mutateTasks } = useSWR<ContactTask[]>(`/api/contacts/${id}/tasks`);
  const [composeOpen, setComposeOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showSecondaryEmail, setShowSecondaryEmail] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSecondaryEmail, setEditSecondaryEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailActivity, setEmailActivity] = useState<ActivityEntry[]>([]);
  const [emailActivityLoading, setEmailActivityLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const { toast, showToast } = useToast();
  const [addDealOpen, setAddDealOpen] = useState(false);
  const [dealTitle, setDealTitle] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [dealStage, setDealStage] = useState("call-now");
  const [dealProductId, setDealProductId] = useState("");
  const [editingDeal, setEditingDeal] = useState<{ id: string; title: string; value: number; stage: string; productId: string | null } | null>(null);
  const [editDealTitle, setEditDealTitle] = useState("");
  const [editDealValue, setEditDealValue] = useState("");
  const [editDealStage, setEditDealStage] = useState("call-now");
  const [editDealProductId, setEditDealProductId] = useState("");

  // Silent background reply check when Activity tab is opened
  useEffect(() => {
    if (activeTab === "Activity") {
      fetch(`/api/contacts/${id}/check-replies`, { method: "POST" })
        .then((r) => r.json())
        .then((d) => {
          if (d.newReplies > 0) mutateActivity();
        })
        .catch(() => {});
    }
  }, [activeTab, id, mutateActivity]);

  // Update lastChecked when activity data changes
  useEffect(() => {
    if (activityData) setLastChecked(new Date());
  }, [activityData]);

  useEffect(() => {
    if (activeTab === "Email" && contact) {
      if (!emailTo) setEmailTo(contact.email || "");
      setEmailActivityLoading(true);
      fetch(`/api/contacts/${id}/activity`)
        .then((r) => r.json())
        .then((d) => {
          // Flatten threads into individual messages for the Email tab
          const msgs: ActivityEntry[] = [];
          for (const t of d.threads || []) {
            for (const m of t.messages || []) {
              msgs.push({ ...m, teamMemberId: null });
            }
          }
          for (const s of d.standalone || []) {
            msgs.push({ ...s, teamMemberId: null });
          }
          msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setEmailActivity(msgs);
        })
        .catch(() => setEmailActivity([]))
        .finally(() => setEmailActivityLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, contact, id]);

  const applyTemplate = (label: string) => {
    const tmpl = EMAIL_TEMPLATES.find((t) => t.label === label);
    if (!tmpl || !contact) return;
    setSelectedTemplate(label);
    setEmailSubject(tmpl.subject);
    setEmailBody(
      tmpl.body
        .replace(/NAME/g, contact.name || "")
        .replace(/SENDER/g, "")
    );
  };

  const handleSendEmail = async () => {
    if (!emailTo || !emailSubject || !emailBody) {
      showToast("To, subject, and body are required", false);
      return;
    }
    setEmailSending(true);
    try {
      const res = await fetch(`/api/contacts/${id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emailTo, subject: emailSubject, body: emailBody }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to send email", false);
        return;
      }
      showToast("Email sent", true);
      setEmailSubject("");
      setEmailBody("");
      setSelectedTemplate("");
      const actRes = await fetch(`/api/contacts/${id}/activity`);
      const actData = await actRes.json();
      const msgs: ActivityEntry[] = [];
      for (const t of actData.threads || []) {
        for (const m of t.messages || []) {
          msgs.push({ ...m, teamMemberId: null });
        }
      }
      for (const s of actData.standalone || []) {
        msgs.push({ ...s, teamMemberId: null });
      }
      msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setEmailActivity(msgs);
    } catch {
      showToast("Failed to send email", false);
    } finally {
      setEmailSending(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteInput.trim()) return;
    await fetch(`/api/contacts/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteInput.trim() }),
    });
    setNoteInput("");
    mutateNotes();
  };

  const handleAddTask = async () => {
    if (!taskTitle.trim()) return;
    await fetch(`/api/contacts/${id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: taskTitle.trim(), dueDate: taskDueDate || undefined }),
    });
    setTaskTitle("");
    setTaskDueDate("");
    setShowTaskForm(false);
    mutateTasks();
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    await fetch(`/api/contacts/${id}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    mutateTasks();
  };

  const handleAddDeal = async () => {
    if (!dealTitle.trim()) return;
    await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: dealTitle.trim(),
        value: dealValue ? parseFloat(dealValue) : 0,
        stage: dealStage,
        contactId: id,
        contactName: contact?.name,
        productId: dealProductId || undefined,
      }),
    });
    setDealTitle("");
    setDealValue("");
    setDealStage("call-now");
    setDealProductId("");
    setAddDealOpen(false);
    mutate();
  };

  const handleEditDeal = async () => {
    if (!editingDeal || !editDealTitle.trim()) return;
    await fetch(`/api/deals/${editingDeal.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editDealTitle.trim(),
        value: editDealValue ? parseFloat(editDealValue) : 0,
        stage: editDealStage,
        productId: editDealProductId || undefined,
      }),
    });
    setEditingDeal(null);
    mutate();
  };

  const openEditDeal = (deal: { id: string; title: string; value: number; stage: string; productId?: string | null }) => {
    setEditingDeal({ id: deal.id, title: deal.title, value: deal.value, stage: deal.stage, productId: deal.productId ?? null });
    setEditDealTitle(deal.title);
    setEditDealValue(String(deal.value || 0));
    setEditDealStage(deal.stage || "call-now");
    setEditDealProductId(deal.productId || "");
  };

  if (contactError) return (
    <div style={{ textAlign: "center", padding: "80px 20px" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>404</div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: Z.textPrimary, margin: "0 0 8px" }}>
        Contact not found
      </h2>
      <p style={{ fontSize: 14, color: Z.textMuted, margin: "0 0 24px" }}>
        This contact may have been deleted or the link is incorrect.
      </p>
      <Link
        href="/contacts"
        style={{
          color: Z.ultramarine,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        ← Back to Contacts
      </Link>
    </div>
  );

  if (!contact) return <PageLoader />;

  const campaignMap = new Map((campaigns || []).map((c) => [c.id, c]));
  const campaign = contact.campaignId
    ? campaignMap.get(contact.campaignId)
    : null;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  const startEdit = () => {
    setEditName(contact.name);
    setEditCompany(contact.company);
    setEditEmail(contact.email);
    setEditSecondaryEmail(contact.secondaryEmail || "");
    setEditPhone(contact.phone);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const saveEdit = async () => {
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          company: editCompany,
          email: editEmail,
          secondaryEmail: editSecondaryEmail || null,
          phone: editPhone,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      mutate();
      setEditing(false);
    } catch {
      showToast("Failed to save contact", false);
    }
  };

  const preSaleCount =
    (contact.deals ? contact.deals.length : 0) + (contact.notes ? 1 : 0) + 1;

  const tabCounts: Record<string, number | null> = {
    "Customer Info": null,
    Activity: null,
    "Pre Sale Comms": preSaleCount,
    "Form Submissions": null,
    Cancelled: null,
  };

  const timelineEntries = generateTimeline(contact, activeTab);

  return (
    <div>
      {/* Back button */}
      <Link
        href="/contacts"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: Z.ultramarine,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
          marginBottom: 20,
          cursor: "pointer",
        }}
      >
        ← Back to Contacts
      </Link>

      {/* Contact header card */}
      <div
        style={{
          background: Z.card,
          borderRadius: 16,
          border: `1px solid ${Z.border}`,
          padding: "24px 28px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Avatar initials={getInitials(contact.name)} index={0} size={48} />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: Z.textPrimary,
              letterSpacing: -0.3,
            }}
          >
            {contact.name}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 4,
              fontSize: 13,
              color: Z.textSecondary,
            }}
          >
            <span>{contact.company}</span>
            <span style={{ color: Z.borderLight }}>|</span>
            <span>{contact.email}</span>
            <span style={{ color: Z.borderLight }}>|</span>
            <span>{contact.phone}</span>
          </div>
        </div>
        <Badge
          label={contact.status}
          color={STATUS_COLORS[contact.status] || Z.grey}
        />
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setComposeOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px",
            background: `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`,
            color: "#fff", border: "none", borderRadius: 6,
            fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}
        >
          ✉ Email
        </button>
      </div>

      {/* Floating compose window */}
      {composeOpen && (
        <FloatingEmailCompose
          contactId={id}
          contactName={contact.name}
          contactEmail={contact.email || ""}
          onClose={() => setComposeOpen(false)}
          onEmailSent={() => mutateActivity()}
        />
      )}

      {/* Tabs */}
      <div
        style={{
          background: Z.bg,
          borderRadius: 10,
          padding: 4,
          display: "inline-flex",
          gap: 2,
          marginBottom: 24,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              background:
                activeTab === tab
                  ? `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`
                  : "transparent",
              color: activeTab === tab ? "#fff" : Z.textSecondary,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {tab}
            {tabCounts[tab] !== null && tabCounts[tab] !== undefined && (
              <span
                style={{
                  background:
                    activeTab === tab ? "rgba(255,255,255,0.25)" : Z.border,
                  color: activeTab === tab ? "#fff" : Z.textMuted,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 10,
                }}
              >
                {tabCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "Customer Info" && (
        <div>
          {/* Contact Details Card */}
          <div
            style={{
              background: Z.card,
              borderRadius: 16,
              border: `1px solid ${Z.border}`,
              padding: "24px 28px",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: Z.textPrimary,
                }}
              >
                Contact Details
              </div>
              {!editing ? (
                <Btn variant="secondary" small onClick={startEdit}>
                  Edit
                </Btn>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn variant="secondary" small onClick={cancelEdit}>
                    Cancel
                  </Btn>
                  <Btn small onClick={saveEdit}>
                    Save
                  </Btn>
                </div>
              )}
            </div>

            {!editing ? (
              /* Read mode - 3 column grid */
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 20,
                  }}
                >
                  <DetailField label="Primary Email" value={contact.email} />
                  <DetailField
                    label="Secondary Email"
                    value={contact.secondaryEmail || "--"}
                  />
                  <DetailField label="Phone" value={contact.phone} />
                  <DetailField label="Company" value={contact.company} />
                  <DetailField
                    label="Pipeline Value"
                    value={fmt(Number(contact.value) || 0)}
                  />
                  <DetailField
                    label="Last Contact"
                    value={fmtDate(contact.lastContact)}
                  />
                  <DetailField label="Lead Source">
                    <Badge
                      label={contact.leadSource}
                      color={
                        LEAD_SOURCE_COLORS[contact.leadSource] || Z.grey
                      }
                    />
                  </DetailField>
                  <DetailField label="Status">
                    <Badge
                      label={contact.status}
                      color={STATUS_COLORS[contact.status] || Z.grey}
                    />
                  </DetailField>
                  <DetailField label="Campaign">
                    {campaign ? (
                      <Badge label={campaign.name} color={Z.bluejeans} />
                    ) : (
                      <span style={{ fontSize: 13, color: Z.textMuted }}>
                        --
                      </span>
                    )}
                  </DetailField>
                </div>
              </div>
            ) : (
              /* Edit mode - 2 column grid */
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <FormField label="Name">
                  <Input
                    value={editName}
                    onChange={setEditName}
                    placeholder="Full name"
                  />
                </FormField>
                <FormField label="Company">
                  <Input
                    value={editCompany}
                    onChange={setEditCompany}
                    placeholder="Company"
                  />
                </FormField>
                <div>
                  <FormField label="Primary Email">
                    <Input
                      value={editEmail}
                      onChange={setEditEmail}
                      placeholder="Email"
                      type="email"
                    />
                  </FormField>
                  {contact.secondaryEmail && (
                    <button
                      onClick={() => setShowSecondaryEmail(!showSecondaryEmail)}
                      style={{
                        background: "none",
                        border: "none",
                        color: Z.ultramarine,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: 0,
                        marginTop: -8,
                      }}
                    >
                      {showSecondaryEmail
                        ? "Hide secondary email"
                        : "Show secondary email"}
                    </button>
                  )}
                  {showSecondaryEmail && (
                    <div style={{ marginTop: 8 }}>
                      <FormField label="Secondary Email">
                        <Input
                          value={editSecondaryEmail}
                          onChange={setEditSecondaryEmail}
                          placeholder="Secondary email"
                          type="email"
                        />
                      </FormField>
                    </div>
                  )}
                </div>
                <FormField label="Phone">
                  <Input
                    value={editPhone}
                    onChange={setEditPhone}
                    placeholder="Phone"
                    type="tel"
                  />
                </FormField>
              </div>
            )}
          </div>

          {/* Deals + Tickets - 2 column */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
            }}
          >
            {/* Deals */}
            <div
              style={{
                background: Z.card,
                borderRadius: 16,
                border: `1px solid ${Z.border}`,
                padding: "24px 28px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: Z.textPrimary }}>Deals</div>
                <Btn variant="secondary" onClick={() => setAddDealOpen(true)}>+ Add Deal</Btn>
              </div>
              {contact.deals && contact.deals.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {contact.deals.map((deal) => (
                    <div
                      key={deal.id}
                      style={{
                        padding: "12px 16px",
                        background: Z.bg,
                        borderRadius: 10,
                        border: `1px solid ${Z.borderLight}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: Z.textPrimary,
                          }}
                        >
                          {deal.title}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: Z.textPrimary,
                            }}
                          >
                            {fmt(Number(deal.value) || 0)}
                          </span>
                          <button
                            onClick={() => openEditDeal(deal)}
                            style={{ fontSize: 11, color: Z.textMuted, background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 4 }}
                            title="Edit deal"
                          >
                            ✏️
                          </button>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: deal.domainName ? 8 : 0,
                        }}
                      >
                        <Badge label={deal.stage} color={Z.ultramarine} />
                        <span style={{ fontSize: 11, color: Z.textMuted }}>
                          {new Date(deal.createdAt).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" }
                          )}
                        </span>
                      </div>
                      {deal.domainName && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: deal.domainType === "existing" ? "#eff6ff" : "#f0fdf4", borderRadius: 6, border: `1px solid ${deal.domainType === "existing" ? "#bfdbfe" : "#bbf7d0"}` }}>
                          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: deal.domainType === "existing" ? "#1d4ed8" : "#15803d" }}>
                            {deal.domainType === "existing" ? "Existing Domain" : "Requested Domain"}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: deal.domainType === "existing" ? "#1e40af" : "#166534" }}>
                            {deal.domainName}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: Z.textMuted,
                    fontSize: 13,
                  }}
                >
                  No deals yet
                </div>
              )}
            </div>

            {/* Support Tickets */}
            <div
              style={{
                background: Z.card,
                borderRadius: 16,
                border: `1px solid ${Z.border}`,
                padding: "24px 28px",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: Z.textPrimary,
                  marginBottom: 16,
                }}
              >
                Support Tickets
              </div>
              {contact.tickets && contact.tickets.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {contact.tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      style={{
                        padding: "12px 16px",
                        background: Z.bg,
                        borderRadius: 10,
                        border: `1px solid ${Z.borderLight}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: Z.textPrimary,
                          }}
                        >
                          {ticket.subject}
                        </span>
                        <Badge
                          label={ticket.priority}
                          color={
                            ticket.priority === "high"
                              ? "#ef4444"
                              : ticket.priority === "medium"
                              ? Z.bluejeans
                              : Z.grey
                          }
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Badge
                          label={ticket.status}
                          color={STATUS_COLORS[ticket.status] || Z.grey}
                        />
                        <span style={{ fontSize: 11, color: Z.textMuted }}>
                          {new Date(ticket.createdAt).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" }
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: Z.textMuted,
                    fontSize: 13,
                  }}
                >
                  No support tickets
                </div>
              )}
            </div>
          </div>

          {/* Active Onboarding */}
          {contact.onboardingRecords && contact.onboardingRecords.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: Z.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                Active Onboarding
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {contact.onboardingRecords.map((ob) => {
                  const WS_COLORS: Record<string, string> = {
                    not_started: "#6b7280",
                    building: Z.ultramarine,
                    draft_sent: "#f59e0b",
                    in_revision: "#f97316",
                    customer_approved: "#22c55e",
                    in_qa: Z.violet,
                    published: Z.turquoise,
                  };
                  const ws = ob.websiteStatus || "not_started";
                  const wsColor = WS_COLORS[ws] || "#6b7280";
                  const wsLabel = ws.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                  return (
                    <Link
                      key={ob.id}
                      href={`/onboarding/${ob.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        background: Z.bg,
                        border: `1px solid ${Z.border}`,
                        borderRadius: 10,
                        textDecoration: "none",
                        transition: "border-color 0.15s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = Z.ultramarine; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = Z.border; }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: Z.textPrimary }}>
                          {ob.businessName || ob.customerName || "Onboarding"}
                        </div>
                        {ob.wonDate && (
                          <div style={{ fontSize: 11, color: Z.textMuted, marginTop: 2 }}>
                            Won {new Date(ob.wonDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: 20,
                          background: `${wsColor}18`,
                          color: wsColor,
                          border: `1px solid ${wsColor}35`,
                        }}>
                          {wsLabel}
                        </span>
                        <span style={{ color: Z.textMuted, fontSize: 14 }}>→</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{ background: Z.card, borderRadius: 16, border: `1px solid ${Z.border}`, padding: "28px 32px", marginTop: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: Z.textPrimary, marginBottom: 16 }}>Notes</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <input
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && noteInput.trim()) handleAddNote(); }}
                placeholder="Add a note..."
                style={{ flex: 1, padding: "10px 14px", background: Z.bg, border: `1px solid ${Z.border}`, borderRadius: 8, color: Z.textPrimary, fontSize: 13, outline: "none", fontFamily: "inherit" }}
              />
              <Btn onClick={handleAddNote} disabled={!noteInput.trim()}>Add Note</Btn>
            </div>
            {(!contactNotes || contactNotes.length === 0) ? (
              <div style={{ textAlign: "center", color: Z.textMuted, fontSize: 13, padding: "24px 0" }}>No notes yet. Add the first one above.</div>
            ) : (
              <div>
                {contactNotes.map((note, i) => (
                  <div key={note.id} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: i < contactNotes.length - 1 ? `1px solid ${Z.borderLight}` : "none" }}>
                    <div style={{ fontSize: 13, color: Z.textPrimary, lineHeight: 1.5, marginBottom: 4 }}>{note.body}</div>
                    <div style={{ fontSize: 11, color: Z.textMuted }}>{formatRelative(note.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tasks */}
          <div style={{ background: Z.card, borderRadius: 16, border: `1px solid ${Z.border}`, padding: "28px 32px", marginTop: 20 }}>
            {/* Section 1: Onboarding Tasks (read-only) */}
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: Z.textPrimary, marginBottom: 16 }}>Onboarding Tasks</div>
              {(() => {
                const items = (contact.onboarding || []).filter(o => o.isActive);
                if (items.length === 0) {
                  return <div style={{ textAlign: "center", color: Z.textMuted, fontSize: 13, padding: "24px 0" }}>No onboarding tasks yet.</div>;
                }
                const isComplete = (o: OnboardingItem) => o.completedAt !== null || o.currentStatus === "complete";
                const incomplete = items.filter(o => !isComplete(o)).sort((a, b) => {
                  if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                  if (a.dueDate) return -1;
                  if (b.dueDate) return 1;
                  return 0;
                });
                const complete = items.filter(o => isComplete(o)).sort((a, b) => {
                  if (a.completedAt && b.completedAt) return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
                  if (a.completedAt) return -1;
                  if (b.completedAt) return 1;
                  return 0;
                });
                const ordered = [...incomplete, ...complete];
                return (
                  <div>
                    {ordered.map((item, i) => {
                      const done = isComplete(item);
                      const badge = taskDueBadge(item.dueDate);
                      return (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "10px 0",
                            borderBottom: i < ordered.length - 1 ? `1px solid ${Z.borderLight}` : "none",
                            opacity: done ? 0.5 : 1,
                          }}
                        >
                          <span style={{ width: 16, height: 16, borderRadius: "50%", background: done ? "#10b981" : Z.borderLight, display: "inline-block", flexShrink: 0 }} />
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontSize: 13, color: done ? Z.textMuted : Z.textPrimary, textDecoration: done ? "line-through" : "none" }}>
                              {item.itemName || "Untitled"}
                            </span>
                            {item.owner && (
                              <span style={{ fontSize: 11, color: Z.textMuted }}>{item.owner}</span>
                            )}
                          </div>
                          {badge && (
                            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: badge.bg, color: badge.color }}>{badge.label}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Section 2: Ad-hoc Tasks */}
            <div style={{ borderTop: `1px solid ${Z.borderLight}`, marginTop: 24, paddingTop: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: Z.textPrimary }}>Ad-hoc Tasks</div>
                <Btn variant="secondary" onClick={() => setShowTaskForm(v => !v)}>+ Add Task</Btn>
              </div>
              {showTaskForm && (
                <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
                  <input
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    placeholder="Task title..."
                    style={{ flex: 1, padding: "10px 14px", background: Z.bg, border: `1px solid ${Z.border}`, borderRadius: 8, color: Z.textPrimary, fontSize: 13, outline: "none", fontFamily: "inherit" }}
                  />
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={e => setTaskDueDate(e.target.value)}
                    style={{ padding: "10px 14px", background: Z.bg, border: `1px solid ${Z.border}`, borderRadius: 8, color: Z.textPrimary, fontSize: 13, outline: "none", fontFamily: "inherit" }}
                  />
                  <Btn onClick={handleAddTask} disabled={!taskTitle.trim()}>Save</Btn>
                  <Btn variant="secondary" onClick={() => { setShowTaskForm(false); setTaskTitle(""); setTaskDueDate(""); }}>Cancel</Btn>
                </div>
              )}
              {(!contactTasks || contactTasks.length === 0) ? (
                <div style={{ textAlign: "center", color: Z.textMuted, fontSize: 13, padding: "24px 0" }}>No tasks yet.</div>
              ) : (
                <div>
                  {contactTasks.map(task => {
                    const badge = taskDueBadge(task.dueDate);
                    return (
                      <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${Z.borderLight}`, opacity: task.completed ? 0.5 : 1 }}>
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggleTask(task.id, !task.completed)}
                          style={{ width: 16, height: 16, cursor: "pointer", accentColor: Z.ultramarine }}
                        />
                        <span style={{ flex: 1, fontSize: 13, color: task.completed ? Z.textMuted : Z.textPrimary, textDecoration: task.completed ? "line-through" : "none" }}>{task.title}</span>
                        {badge && (
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: badge.bg, color: badge.color }}>{badge.label}</span>
                        )}
                        <span style={{ fontSize: 11, color: Z.textMuted }}>{formatRelative(task.createdAt)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "Email" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Compose */}
          <div style={{ background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: 10, padding: 20 }}>
            <div style={{ color: "#ffffffcc", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Compose Email</div>
            <select
              value={selectedTemplate}
              onChange={(e) => applyTemplate(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", background: "#ffffff0a", border: "1px solid #ffffff18", borderRadius: 6, color: selectedTemplate ? "#ffffffcc" : "#ffffff55", fontSize: 12, cursor: "pointer", marginBottom: 12 }}
            >
              <option value="">Use a template...</option>
              {EMAIL_TEMPLATES.map((t) => (
                <option key={t.label} value={t.label}>{t.label}</option>
              ))}
            </select>
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: "#ffffff55", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>TO</div>
              <input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="customer@email.com"
                style={{ width: "100%", padding: "8px 10px", background: "#ffffff0a", border: "1px solid #ffffff18", borderRadius: 6, color: "#ffffffcc", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: "#ffffff55", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>SUBJECT</div>
              <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Subject"
                style={{ width: "100%", padding: "8px 10px", background: "#ffffff0a", border: "1px solid #ffffff18", borderRadius: 6, color: "#ffffffcc", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: "#ffffff55", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>MESSAGE</div>
              <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="Write your message..." rows={8}
                style={{ width: "100%", padding: 10, background: "#ffffff0a", border: "1px solid #ffffff18", borderRadius: 6, color: "#ffffffcc", fontSize: 13, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <button onClick={handleSendEmail} disabled={emailSending}
              style={{ padding: "9px 20px", background: emailSending ? "#ffffff20" : "linear-gradient(135deg, #3A5AFF, #9600FF)", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: emailSending ? "not-allowed" : "pointer" }}>
              {emailSending ? "Sending..." : "Send Email"}
            </button>
          </div>
          {/* History */}
          <div>
            <div style={{ color: "#ffffff55", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Email History</div>
            {emailActivityLoading ? (
              <div style={{ color: "#ffffff45", fontSize: 13 }}>Loading...</div>
            ) : emailActivity.length === 0 ? (
              <div style={{ color: "#ffffff35", fontSize: 13 }}>No emails sent yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {emailActivity.map((entry) => (
                  <div key={entry.id} style={{ background: "#ffffff08", border: "1px solid #ffffff12", borderRadius: 8, padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ color: "#ffffffcc", fontSize: 13, fontWeight: 600 }}>{entry.subject || "(no subject)"}</div>
                      <div style={{ color: "#ffffff45", fontSize: 11 }}>{new Date(entry.createdAt).toLocaleString()}</div>
                    </div>
                    <div style={{ color: "#ffffff65", fontSize: 11, marginBottom: 6 }}>From: {entry.fromEmail || "unknown"} to {entry.toEmail || "unknown"}</div>
                    <div style={{ color: "#ffffff80", fontSize: 12, whiteSpace: "pre-wrap", maxHeight: 80, overflow: "hidden" }}>{entry.body}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Activity tab — threaded email view */}
      {activeTab === "Activity" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "16px 0" }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffffcc" }}>
              Email Threads
              {threads.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, color: "#ffffff45", fontWeight: 400 }}>
                  {threads.length} {threads.length === 1 ? "thread" : "threads"}
                </span>
              )}
            </div>
            {lastChecked && (
              <span style={{ fontSize: 11, color: "#ffffff25" }}>
                Updated {formatRelative(lastChecked.toISOString())}
              </span>
            )}
          </div>

          {/* Thread list */}
          {threads.length === 0 ? (
            <div style={{
              padding: "40px 24px",
              textAlign: "center",
              color: "#ffffff30",
              fontSize: 13,
              border: "1px dashed #ffffff12",
              borderRadius: 12,
            }}>
              No email threads yet. Send the first email using the \u2709 button above.
            </div>
          ) : (
            threads.map((thread, i) => (
              <EmailThreadCard
                key={thread.gmailThreadId}
                thread={thread}
                defaultExpanded={i === 0}
                contactId={id}
                onReply={() => mutateActivity()}
              />
            ))
          )}

          {/* Earlier standalone emails */}
          {standalone.filter((e) => e.type === "email_sent" || e.type === "email_received").length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11, color: "#ffffff25", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                Earlier emails (no thread tracking)
              </div>
              {standalone
                .filter((e) => e.type === "email_sent" || e.type === "email_received")
                .map((e) => (
                  <div key={e.id} style={{
                    padding: "10px 14px",
                    background: "#ffffff04",
                    border: "1px solid #ffffff08",
                    borderRadius: 8,
                    marginBottom: 6,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#ffffff60" }}>{e.subject || "(no subject)"}</span>
                      <span style={{ fontSize: 11, color: "#ffffff25" }}>{formatRelative(e.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#ffffff35", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span>{e.type === "email_sent" ? "Sent" : "Received"} &middot; {e.fromEmail} &rarr; {e.toEmail}</span>
                      {e.metadata?.deliveryStatus && (() => {
                        const s = e.metadata.deliveryStatus;
                        const config: Record<string, { label: string; color: string; bg: string }> = {
                          sent:         { label: "Sent",         color: "#60a5fa", bg: "#1e3a5f" },
                          delivered:    { label: "Delivered",    color: "#34d399", bg: "#064e3b" },
                          opened:       { label: "Opened",       color: "#a78bfa", bg: "#2e1065" },
                          clicked:      { label: "Clicked",      color: "#f472b6", bg: "#500724" },
                          bounced:      { label: "Bounced",      color: "#f87171", bg: "#450a0a" },
                          spam:         { label: "Spam",         color: "#fb923c", bg: "#431407" },
                          failed:       { label: "Failed",       color: "#f87171", bg: "#450a0a" },
                          unsubscribed: { label: "Unsubscribed", color: "#94a3b8", bg: "#1e293b" },
                        };
                        const c = config[s] ?? { label: s, color: "#94a3b8", bg: "#1e293b" };
                        const ts = e.metadata.openedAt ?? e.metadata.clickedAt ?? e.metadata.deliveredAt ?? e.metadata.bouncedAt;
                        return (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "1px 7px", borderRadius: 4, background: c.bg, color: c.color, fontWeight: 700, fontSize: 10 }}>
                            {c.label}{ts ? ` · ${new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline tabs: Pre Sale, Post Sale, Cancelled */}
      {/* Form Submissions tab */}
      {activeTab === "Form Submissions" && (
        <div
          style={{
            background: Z.card,
            borderRadius: 16,
            border: `1px solid ${Z.border}`,
            padding: "28px 32px",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: Z.textPrimary, marginBottom: 24 }}>
            Form Submissions
          </div>
          {!formSubmissions ? (
            <div style={{ color: Z.textMuted, fontSize: 13 }}>Loading...</div>
          ) : formSubmissions.length === 0 ? (
            <div style={{ textAlign: "center", color: Z.textMuted, fontSize: 13, padding: "40px 0" }}>
              No form submissions yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {formSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  style={{
                    background: Z.bg,
                    borderRadius: 12,
                    border: `1px solid ${Z.borderLight}`,
                    padding: "16px 20px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: Z.textPrimary }}>{sub.formName}</div>
                    <div style={{ fontSize: 11, color: Z.textMuted }}>
                      {new Date(sub.submittedAt).toLocaleString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                        hour: "numeric", minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {Object.entries(sub.formData as Record<string, unknown>).map(([key, value]) => (
                      <div key={key} style={{ display: "flex", gap: 12, fontSize: 13 }}>
                        <span style={{ fontWeight: 600, color: Z.textMuted, minWidth: 160, textTransform: "capitalize", flexShrink: 0 }}>
                          {key.replace(/_/g, " ")}
                        </span>
                        <span style={{ color: Z.textPrimary }}>{String(value ?? "—")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(activeTab === "Pre Sale Comms" ||
        activeTab === "Cancelled") && (
        <div
          style={{
            background: Z.card,
            borderRadius: 16,
            border: `1px solid ${Z.border}`,
            padding: "28px 32px",
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: Z.textPrimary,
              marginBottom: 24,
            }}
          >
            {activeTab}
          </div>

          {timelineEntries.length > 0 ? (
            <div style={{ position: "relative", paddingLeft: 28 }}>
              {/* Vertical line */}
              <div
                style={{
                  position: "absolute",
                  left: 7,
                  top: 4,
                  bottom: 4,
                  width: 2,
                  background: Z.borderLight,
                  borderRadius: 1,
                }}
              />

              {timelineEntries.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    paddingBottom: i < timelineEntries.length - 1 ? 24 : 0,
                  }}
                >
                  {/* Dot */}
                  <div
                    style={{
                      position: "absolute",
                      left: -24,
                      top: 4,
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: entry.color,
                      border: `2px solid ${Z.card}`,
                      boxShadow: `0 0 0 2px ${entry.color}30`,
                    }}
                  />

                  {/* Content */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 4,
                      }}
                    >
                      <Badge label={entry.channel} color={entry.color} />
                      <span
                        style={{
                          fontSize: 12,
                          color: Z.textMuted,
                        }}
                      >
                        {entry.date}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: Z.textPrimary,
                        lineHeight: 1.5,
                      }}
                    >
                      {entry.note}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: Z.textMuted,
                fontSize: 13,
              }}
            >
              No entries
            </div>
          )}
        </div>
      )}
      <Modal open={addDealOpen} onClose={() => { setAddDealOpen(false); setDealTitle(""); setDealValue(""); setDealStage("call-now"); setDealProductId(""); }} title="Add Deal">
        <FormField label="Product">
          <Select
            value={dealProductId}
            onChange={(val) => {
              setDealProductId(val);
              const product = (productOptions || []).find(p => p.id === val);
              if (product) {
                setDealTitle(product.description);
                setDealValue(String(product.price));
              }
            }}
            options={[
              { value: "", label: "Select a product..." },
              ...(productOptions || []).map(p => ({
                value: p.id,
                label: `${p.description} — $${Number(p.price).toFixed(2)}/mo`,
              })),
            ]}
          />
        </FormField>
        <FormField label="Title">
          <Input value={dealTitle} onChange={setDealTitle} placeholder="Auto-filled from product" />
        </FormField>
        <FormField label="Value ($)">
          <Input value={dealValue} onChange={setDealValue} placeholder="0" type="number" />
        </FormField>
        <FormField label="Stage">
          <Select
            value={dealStage}
            onChange={setDealStage}
            options={[
              { value: "call-now", label: "Call Now" },
              { value: "call-no-answer", label: "Call No Answer" },
              { value: "hot-72", label: "Hot 72" },
              { value: "active", label: "Active" },
              { value: "appointment", label: "Appointment" },
              { value: "appt-no-show", label: "Appt No Show" },
              { value: "marketing-appt", label: "Marketing Appt" },
              { value: "promo-hot", label: "Promo Hot" },
              { value: "promo-cold", label: "Promo Cold" },
              { value: "won", label: "Won" },
            ]}
          />
        </FormField>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <Btn variant="secondary" onClick={() => { setAddDealOpen(false); setDealTitle(""); setDealValue(""); setDealStage("call-now"); setDealProductId(""); }}>Cancel</Btn>
          <Btn onClick={handleAddDeal} disabled={!dealProductId || !dealTitle.trim()}>Create Deal</Btn>
        </div>
      </Modal>
      <Modal
        open={!!editingDeal}
        onClose={() => setEditingDeal(null)}
        title="Edit Deal"
      >
        <FormField label="Product">
          <Select
            value={editDealProductId}
            onChange={(val) => {
              setEditDealProductId(val);
              const product = (productOptions || []).find(p => p.id === val);
              if (product) {
                setEditDealTitle(product.description);
                setEditDealValue(String(product.price));
              }
            }}
            options={[
              { value: "", label: "No product / keep existing" },
              ...(productOptions || []).map(p => ({
                value: p.id,
                label: `${p.description} — $${Number(p.price).toFixed(2)}/mo`,
              })),
            ]}
          />
        </FormField>
        <FormField label="Title">
          <Input value={editDealTitle} onChange={setEditDealTitle} placeholder="Deal title" />
        </FormField>
        <FormField label="Value ($)">
          <Input value={editDealValue} onChange={setEditDealValue} placeholder="0" type="number" />
        </FormField>
        <FormField label="Stage">
          <Select
            value={editDealStage}
            onChange={setEditDealStage}
            options={[
              { value: "call-now", label: "Call Now" },
              { value: "call-no-answer", label: "Call No Answer" },
              { value: "hot-72", label: "Hot 72" },
              { value: "active", label: "Active" },
              { value: "appointment", label: "Appointment" },
              { value: "appt-no-show", label: "Appt No Show" },
              { value: "marketing-appt", label: "Marketing Appt" },
              { value: "promo-hot", label: "Promo Hot" },
              { value: "promo-cold", label: "Promo Cold" },
              { value: "won", label: "Won" },
            ]}
          />
        </FormField>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <Btn variant="secondary" onClick={() => setEditingDeal(null)}>Cancel</Btn>
          <Btn onClick={handleEditDeal} disabled={!editDealTitle.trim()}>Save Changes</Btn>
        </div>
      </Modal>
      <Toast toast={toast} />
    </div>
  );
}

/* Read-only detail field helper */
function DetailField({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: Z.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children || (
        <div style={{ fontSize: 13, color: Z.textPrimary, fontWeight: 500 }}>
          {value}
        </div>
      )}
    </div>
  );
}
