"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { PageLoader } from "@/components/PageLoader";
import { Toast, useToast } from "@/components/Toast";
import {
  Badge,
  Avatar,
  StatCard,
  SearchBar,
  Btn,
  Modal,
  FormField,
  Input,
  Select,
  FilterBtn,
} from "@/components/ui";
import { Z, fmt, STATUS_COLORS, LEAD_SOURCE_COLORS } from "@/lib/constants";

interface Contact {
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
}

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  contactCount: number;
}

const STATUS_FILTERS = ["All", "Live Customer", "Active Lead", "Cancelled", "DNC"];

export default function ContactsPage() {
  const router = useRouter();
  const { data: contacts, mutate } = useSWR<Contact[]>("/api/contacts");
  const { data: campaigns } = useSWR<Campaign[]>("/api/campaigns");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // New contact form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formStatus, setFormStatus] = useState("Active Lead");
  const [formLeadSource, setFormLeadSource] = useState("Email");
  const [formNotes, setFormNotes] = useState("");

  const { toast, showToast } = useToast();

  if (!contacts) return <PageLoader />;

  const list = contacts || [];
  const campaignMap = new Map((campaigns || []).map((c) => [c.id, c]));

  // Stats
  const liveCount = list.filter((c) => c.status === "Live Customer").length;
  const activeCount = list.filter((c) => c.status === "Active Lead").length;
  const cancelledCount = list.filter((c) => c.status === "Cancelled").length;
  const dncCount = list.filter((c) => c.status === "DNC").length;

  // Filtered list
  const filtered = list.filter((c) => {
    if (statusFilter !== "All" && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormCompany("");
    setFormPhone("");
    setFormStatus("Active Lead");
    setFormLeadSource("Email");
    setFormNotes("");
  };

  const handleCreate = async () => {
    if (!formName || !formEmail) return;
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          company: formCompany,
          phone: formPhone,
          status: formStatus,
          leadSource: formLeadSource,
          notes: formNotes,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      mutate();
      setModalOpen(false);
      resetForm();
    } catch {
      showToast("Failed to create contact", false);
    }
  };

  return (
    <div>
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
          Contacts
        </h1>
        <p
          style={{
            fontSize: 14,
            color: Z.textSecondary,
            margin: "4px 0 0 0",
          }}
        >
          Manage your relationships
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
          label="Live Customers"
          value={liveCount}
          sub="active subscribers"
          accent="#10b981"
        />
        <StatCard
          label="Active Leads"
          value={activeCount}
          sub="in pipeline"
          accent={Z.ultramarine}
        />
        <StatCard
          label="Cancelled"
          value={cancelledCount}
          sub="win-back targets"
          accent="#ef4444"
        />
        <StatCard
          label="DNC"
          value={dncCount}
          sub="do not contact"
          accent={Z.grey}
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
          placeholder="Search contacts..."
        />
        <div style={{ display: "flex", gap: 6 }}>
          {STATUS_FILTERS.map((f) => (
            <FilterBtn
              key={f}
              label={f}
              active={statusFilter === f}
              onClick={() => setStatusFilter(f)}
            />
          ))}
        </div>
        <div style={{ marginLeft: "auto" }}>
          <Btn onClick={() => setModalOpen(true)}>+ Add Contact</Btn>
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
            gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr 1fr",
            padding: "14px 24px",
            borderBottom: `1px solid ${Z.border}`,
            background: Z.bg,
          }}
        >
          {["Name", "Email", "Company", "Campaign", "Lead Source", "Status", "Value"].map(
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
        {filtered.map((c, i) => {
          const campaign = c.campaignId ? campaignMap.get(c.campaignId) : null;
          return (
            <div
              key={c.id}
              onClick={() => router.push(`/contacts/${c.id}`)}
              onMouseEnter={() => setHoveredRow(c.id)}
              onMouseLeave={() => setHoveredRow(null)}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr 1fr",
                padding: "14px 24px",
                alignItems: "center",
                borderBottom: `1px solid ${Z.borderLight}`,
                cursor: "pointer",
                background: hoveredRow === c.id ? Z.bg : "transparent",
                transition: "background 0.15s",
              }}
            >
              {/* Name */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar initials={getInitials(c.name)} index={i} size={32} />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: Z.textPrimary,
                  }}
                >
                  {c.name}
                </span>
              </div>

              {/* Email */}
              <div
                style={{
                  fontSize: 13,
                  color: Z.textSecondary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.email}
              </div>

              {/* Company */}
              <div
                style={{
                  fontSize: 13,
                  color: Z.textSecondary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.company}
              </div>

              {/* Campaign */}
              <div>
                {campaign ? (
                  <Badge
                    label={
                      campaign.name.length > 20
                        ? campaign.name.slice(0, 20) + "..."
                        : campaign.name
                    }
                    color={Z.bluejeans}
                  />
                ) : (
                  <span style={{ fontSize: 12, color: Z.textMuted }}>--</span>
                )}
              </div>

              {/* Lead Source */}
              <div>
                <Badge
                  label={c.leadSource}
                  color={LEAD_SOURCE_COLORS[c.leadSource] || Z.grey}
                />
              </div>

              {/* Status */}
              <div>
                <Badge
                  label={c.status}
                  color={STATUS_COLORS[c.status] || Z.grey}
                />
              </div>

              {/* Value */}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: Z.textPrimary,
                }}
              >
                {fmt(c.value)}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div
            style={{
              padding: 48,
              textAlign: "center",
              color: Z.textMuted,
              fontSize: 14,
            }}
          >
            No contacts found
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title="Add Contact"
      >
        <FormField label="Name">
          <Input
            value={formName}
            onChange={setFormName}
            placeholder="Full name"
          />
        </FormField>
        <FormField label="Email">
          <Input
            value={formEmail}
            onChange={setFormEmail}
            placeholder="Email address"
            type="email"
          />
        </FormField>
        <FormField label="Company">
          <Input
            value={formCompany}
            onChange={setFormCompany}
            placeholder="Company name"
          />
        </FormField>
        <FormField label="Phone">
          <Input
            value={formPhone}
            onChange={setFormPhone}
            placeholder="Phone number"
            type="tel"
          />
        </FormField>
        <FormField label="Status">
          <Select
            value={formStatus}
            onChange={setFormStatus}
            options={[
              { value: "Active Lead", label: "Active Lead" },
              { value: "Live Customer", label: "Live Customer" },
              { value: "Cancelled", label: "Cancelled" },
              { value: "DNC", label: "DNC" },
            ]}
          />
        </FormField>
        <FormField label="Lead Source">
          <Select
            value={formLeadSource}
            onChange={setFormLeadSource}
            options={[
              { value: "Email", label: "Email" },
              { value: "SMS", label: "SMS" },
              { value: "Paid", label: "Paid" },
            ]}
          />
        </FormField>
        <FormField label="Notes">
          <textarea
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            placeholder="Additional notes..."
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
          <Btn onClick={handleCreate}>Create Contact</Btn>
        </div>
      </Modal>
      <Toast toast={toast} />
    </div>
  );
}
