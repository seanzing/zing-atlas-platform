"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Badge,
  StatCard,
  SearchBar,
  Btn,
  Modal,
  FormField,
  Input,
  Select,
  FilterBtn,
} from "@/components/ui";
import { PageLoader } from "@/components/PageLoader";
import { Toast, useToast } from "@/components/Toast";
import {
  Z,
  STATUS_COLORS,
  PRIORITY_COLORS,
  CATEGORY_COLORS,
} from "@/lib/constants";

interface Contact {
  id: string;
  name: string;
  email: string;
}

interface Ticket {
  id: string;
  subject: string;
  contactId: string | null;
  contactName: string | null;
  priority: string;
  status: string;
  category: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  contact: Contact | null;
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

const STATUS_FILTERS = ["All", "open", "in-progress", "resolved"];
const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  "in-progress": "In Progress",
  resolved: "Resolved",
};

export default function SupportPage() {
  const { data: tickets, mutate } = useSWR<Ticket[]>("/api/tickets");
  const { data: contacts } = useSWR<Contact[]>("/api/contacts");
  const { data: team } = useSWR<TeamMember[]>("/api/team");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // New ticket form
  const [formSubject, setFormSubject] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formPriority, setFormPriority] = useState("medium");
  const [formCategory, setFormCategory] = useState("Question");
  const [formDescription, setFormDescription] = useState("");

  // Panel edit state
  const [noteText, setNoteText] = useState("");
  const [panelStatus, setPanelStatus] = useState("");
  const [panelAssignee, setPanelAssignee] = useState("");
  const { toast, showToast } = useToast();

  if (!tickets) return <PageLoader />;

  const list = tickets || [];

  const openCount = list.filter((t) => t.status === "open").length;
  const inProgressCount = list.filter((t) => t.status === "in-progress").length;
  const resolvedCount = list.filter((t) => t.status === "resolved").length;

  const filtered = list.filter((t) => {
    if (statusFilter !== "All" && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.subject.toLowerCase().includes(q) ||
        (t.contactName || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const fmtDate = (d: string | null) => {
    if (!d) return "--";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "--";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const openPanel = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setPanelStatus(ticket.status);
    setPanelAssignee(ticket.contactName || "");
    setNoteText("");
    setPanelOpen(true);
  };

  const resetForm = () => {
    setFormSubject("");
    setFormContact("");
    setFormPriority("medium");
    setFormCategory("Question");
    setFormDescription("");
  };

  const handleCreate = async () => {
    if (!formSubject) return;
    try {
      const selectedContact = (contacts || []).find((c) => c.id === formContact);
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: formSubject,
          contactId: formContact || undefined,
          contactName: selectedContact?.name || undefined,
          priority: formPriority,
          status: "open",
          category: formCategory,
          description: formDescription || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      mutate();
      setModalOpen(false);
      resetForm();
    } catch {
      showToast("Failed to create ticket", false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: panelStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      mutate();
      setSelectedTicket({ ...selectedTicket, status: panelStatus });
    } catch {
      showToast("Failed to update status", false);
    }
  };

  const handleAssign = async (memberId: string) => {
    if (!selectedTicket) return;
    const member = (team || []).find((m) => m.id === memberId);
    if (!member) return;
    const assigneeName = `${member.firstName} ${member.lastName}`;
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactName: assigneeName }),
      });
      if (!res.ok) throw new Error("Failed");
      setPanelAssignee(assigneeName);
      setSelectedTicket({ ...selectedTicket, contactName: assigneeName });
      mutate();
    } catch {
      showToast("Failed to assign ticket", false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedTicket || !noteText.trim()) return;
    const existingDesc = selectedTicket.description || "";
    const timestamp = new Date().toLocaleString();
    const updatedDesc = existingDesc
      ? `${existingDesc}\n\n[${timestamp}] ${noteText.trim()}`
      : `[${timestamp}] ${noteText.trim()}`;

    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: updatedDesc }),
      });
      if (!res.ok) throw new Error("Failed");
      setSelectedTicket({ ...selectedTicket, description: updatedDesc });
      setNoteText("");
      mutate();
    } catch {
      showToast("Failed to add note", false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 0, height: "100%" }}>
      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: Z.textPrimary,
              margin: 0,
              letterSpacing: -0.5,
            }}
          >
            Support Tickets
          </h1>
          <p
            style={{
              fontSize: 14,
              color: Z.textSecondary,
              margin: "4px 0 0 0",
            }}
          >
            Track and resolve customer issues
          </p>
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
            label="Open"
            value={openCount}
            sub="needs attention"
            accent="#ef4444"
          />
          <StatCard
            label="In Progress"
            value={inProgressCount}
            sub="being worked on"
            accent={Z.bluejeans}
          />
          <StatCard
            label="Resolved"
            value={resolvedCount}
            sub="completed"
            accent="#10b981"
          />
          <StatCard
            label="Total"
            value={list.length}
            sub="all tickets"
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
            placeholder="Search tickets..."
          />
          <div style={{ display: "flex", gap: 6 }}>
            {STATUS_FILTERS.map((f) => (
              <FilterBtn
                key={f}
                label={f === "All" ? "All" : STATUS_LABELS[f] || f}
                active={statusFilter === f}
                onClick={() => setStatusFilter(f)}
              />
            ))}
          </div>
          <div style={{ marginLeft: "auto" }}>
            <Btn onClick={() => setModalOpen(true)}>+ New Ticket</Btn>
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
              gridTemplateColumns: "2.5fr 1.5fr 1fr 1fr 1fr 1fr",
              padding: "14px 24px",
              borderBottom: `1px solid ${Z.border}`,
              background: Z.bg,
            }}
          >
            {["Subject", "Contact", "Category", "Priority", "Status", "Created"].map(
              (h) => (
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
              )
            )}
          </div>

          {/* Rows */}
          {filtered.map((t) => (
            <div
              key={t.id}
              onClick={() => openPanel(t)}
              style={{
                display: "grid",
                gridTemplateColumns: "2.5fr 1.5fr 1fr 1fr 1fr 1fr",
                padding: "14px 24px",
                alignItems: "center",
                borderBottom: `1px solid ${Z.borderLight}`,
                cursor: "pointer",
                background:
                  selectedTicket?.id === t.id ? `${Z.ultramarine}08` : "transparent",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (selectedTicket?.id !== t.id)
                  e.currentTarget.style.background = Z.bg;
              }}
              onMouseLeave={(e) => {
                if (selectedTicket?.id !== t.id)
                  e.currentTarget.style.background = "transparent";
              }}
            >
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
                {t.subject}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: Z.textSecondary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {t.contactName || t.contact?.name || "--"}
              </div>
              <div>
                <Badge
                  label={t.category}
                  color={CATEGORY_COLORS[t.category] || Z.grey}
                />
              </div>
              <div>
                <Badge
                  label={t.priority}
                  color={PRIORITY_COLORS[t.priority] || Z.grey}
                />
              </div>
              <div>
                <Badge
                  label={STATUS_LABELS[t.status] || t.status}
                  color={STATUS_COLORS[t.status] || Z.grey}
                />
              </div>
              <div style={{ fontSize: 12, color: Z.textMuted }}>
                {fmtDate(t.createdAt)}
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
              No tickets found
            </div>
          )}
        </div>
      </div>

      {/* Detail slide-out panel */}
      {panelOpen && selectedTicket && (
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
                {selectedTicket.subject}
              </h2>
              <p
                style={{
                  fontSize: 12,
                  color: Z.textMuted,
                  margin: "4px 0 0 0",
                }}
              >
                {selectedTicket.contactName || selectedTicket.contact?.name || "Unassigned"} &middot; {fmtDate(selectedTicket.createdAt)}
              </p>
            </div>
            <button
              onClick={() => {
                setPanelOpen(false);
                setSelectedTicket(null);
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

          {/* Badges row */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <Badge
              label={selectedTicket.category}
              color={CATEGORY_COLORS[selectedTicket.category] || Z.grey}
            />
            <Badge
              label={selectedTicket.priority}
              color={PRIORITY_COLORS[selectedTicket.priority] || Z.grey}
            />
            <Badge
              label={STATUS_LABELS[selectedTicket.status] || selectedTicket.status}
              color={STATUS_COLORS[selectedTicket.status] || Z.grey}
            />
          </div>

          {/* Update Status */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: Z.textSecondary,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Update Status
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Select
                value={panelStatus}
                onChange={setPanelStatus}
                options={[
                  { value: "open", label: "Open" },
                  { value: "in-progress", label: "In Progress" },
                  { value: "resolved", label: "Resolved" },
                ]}
              />
              <Btn small onClick={handleStatusUpdate}>
                Save
              </Btn>
            </div>
          </div>

          {/* Assign to Team Member */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: Z.textSecondary,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Assign To
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) handleAssign(e.target.value);
                }}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  background: Z.bg,
                  border: `1px solid ${Z.border}`,
                  borderRadius: 8,
                  color: Z.textPrimary,
                  fontSize: 13,
                  outline: "none",
                  appearance: "none" as const,
                  boxSizing: "border-box" as const,
                }}
              >
                <option value="">
                  {panelAssignee || "Select team member..."}
                </option>
                {(team || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName} ({m.role})
                  </option>
                ))}
              </select>
            </div>
            {panelAssignee && (
              <div
                style={{
                  fontSize: 12,
                  color: Z.textSecondary,
                  marginTop: 6,
                }}
              >
                Currently assigned to: <strong>{panelAssignee}</strong>
              </div>
            )}
          </div>

          {/* Description / Notes */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: Z.textSecondary,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Description & Notes
            </div>
            <div
              style={{
                background: Z.bg,
                borderRadius: 10,
                padding: 16,
                fontSize: 13,
                color: Z.textPrimary,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                minHeight: 60,
                border: `1px solid ${Z.border}`,
              }}
            >
              {selectedTicket.description || "No description"}
            </div>
          </div>

          {/* Add Note */}
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: Z.textSecondary,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Add Note
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Type a note..."
              rows={3}
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
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
            <div style={{ marginTop: 8 }}>
              <Btn small onClick={handleAddNote}>
                Add Note
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title="New Support Ticket"
      >
        <FormField label="Subject">
          <Input
            value={formSubject}
            onChange={setFormSubject}
            placeholder="Ticket subject"
          />
        </FormField>
        <FormField label="Contact">
          <Select
            value={formContact}
            onChange={setFormContact}
            options={[
              { value: "", label: "Select contact..." },
              ...(contacts || []).map((c) => ({
                value: c.id,
                label: `${c.name} (${c.email})`,
              })),
            ]}
          />
        </FormField>
        <FormField label="Category">
          <Select
            value={formCategory}
            onChange={setFormCategory}
            options={[
              { value: "Bug", label: "Bug" },
              { value: "Question", label: "Question" },
              { value: "Feature Request", label: "Feature Request" },
              { value: "Billing", label: "Billing" },
            ]}
          />
        </FormField>
        <FormField label="Priority">
          <Select
            value={formPriority}
            onChange={setFormPriority}
            options={[
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
          />
        </FormField>
        <FormField label="Description">
          <textarea
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Describe the issue..."
            rows={4}
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
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </FormField>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 8,
          }}
        >
          <Btn
            variant="secondary"
            onClick={() => {
              setModalOpen(false);
              resetForm();
            }}
          >
            Cancel
          </Btn>
          <Btn onClick={handleCreate}>Create Ticket</Btn>
        </div>
      </Modal>
      <Toast toast={toast} />
    </div>
  );
}
