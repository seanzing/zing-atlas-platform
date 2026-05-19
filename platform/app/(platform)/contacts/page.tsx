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
import { CopyableText } from "@/components/CopyableText";

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
  industry: string | null;
  websiteUrl: string | null;
  rep: string | null;
  dealValue: string | null;
  product: string | null;
  hasActiveDeal: boolean;
}


const STATUS_FILTERS = ["All", "Live Customer", "Active Lead", "Cancelled", "DNC"];

export default function ContactsPage() {
  const router = useRouter();
  const { data: contacts, mutate } = useSWR<Contact[]>("/api/contacts");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // New contact form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formStatus, setFormStatus] = useState("Active Lead");
  const [formLeadSource, setFormLeadSource] = useState("Email");

  const { toast, showToast } = useToast();

  if (!contacts) return <PageLoader />;

  const list = contacts || [];

  // Stats
  const liveCount = list.filter((c) => c.status === "Live Customer").length;
  const activeCount = list.filter((c) => c.hasActiveDeal).length;
  const cancelledCount = list.filter((c) => c.status === "Cancelled").length;
  const dncCount = list.filter((c) => c.status === "DNC").length;

  // Filtered list
  const filtered = list.filter((c) => {
    if (statusFilter !== "All") {
      if (statusFilter === "Active Lead") {
        // Show any contact with a deal in the pipeline (any non-won stage)
        if (!c.hasActiveDeal) return false;
      } else if (c.status !== statusFilter) {
        return false;
      }
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        (c.name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.company || "").toLowerCase().includes(q)
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
  };

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));
  const someFilteredSelected =
    filtered.some((c) => selectedIds.has(c.id)) && !allFilteredSelected;

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((c) => next.delete(c.id));
      } else {
        filtered.forEach((c) => next.add(c.id));
      }
      return next;
    });
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkStatusChange = async (newStatus: string) => {
    if (!newStatus || selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/contacts/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          })
        )
      );
      await mutate();
      clearSelection();
      showToast(`Updated ${ids.length} contact${ids.length === 1 ? "" : "s"}`, true);
    } catch {
      showToast("Failed to update contacts", false);
    } finally {
      setBulkUpdating(false);
    }
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
            gridTemplateColumns: "40px 2fr 1.5fr 1fr 1fr 1fr 1fr 1.2fr 1fr 1fr 1fr",
            padding: "14px 24px",
            borderBottom: `1px solid ${Z.border}`,
            background: Z.bg,
            alignItems: "center",
          }}
        >
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={allFilteredSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someFilteredSelected;
                }}
                onChange={toggleSelectAll}
                style={{ cursor: "pointer", width: 16, height: 16 }}
              />
            </div>
          {["Name", "Email", "Phone", "Company", "Industry", "Lead Source", "Status", "Product", "Value", "Rep"].map(
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
          const isSelected = selectedIds.has(c.id);
          return (
            <div
              key={c.id}
              onClick={() => router.push(`/contacts/${c.id}`)}
              onMouseEnter={() => setHoveredRow(c.id)}
              onMouseLeave={() => setHoveredRow(null)}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 2fr 1.5fr 1fr 1fr 1fr 1fr 1.2fr 1fr 1fr 1fr",
                padding: "14px 24px",
                alignItems: "center",
                borderBottom: `1px solid ${Z.borderLight}`,
                cursor: "pointer",
                background: isSelected
                  ? `${Z.ultramarine}10`
                  : hoveredRow === c.id
                  ? Z.bg
                  : "transparent",
                transition: "background 0.15s",
              }}
            >
              {/* Checkbox */}
              <div
                style={{ display: "flex", alignItems: "center" }}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelectOne(c.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ cursor: "pointer", width: 16, height: 16 }}
                />
              </div>

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
                <CopyableText value={c.email} type="email" style={{ fontSize: 13 }} />
              </div>

              {/* Phone */}
              <div
                style={{
                  fontSize: 13,
                  color: Z.textSecondary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.phone ? <CopyableText value={c.phone} type="phone" style={{ fontSize: 13 }} /> : "—"}
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
                {c.company || "—"}
              </div>

              {/* Industry */}
              <div
                style={{
                  fontSize: 12,
                  color: Z.textSecondary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.industry || <span style={{ color: Z.textMuted }}>—</span>}
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

              {/* Product */}
              <div
                style={{
                  fontSize: 12,
                  color: Z.textSecondary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.product || <span style={{ color: Z.textMuted }}>—</span>}
              </div>

              {/* Value */}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: Z.textPrimary,
                }}
              >
                {c.dealValue ? fmt(Number(c.dealValue)) : <span style={{ color: Z.textMuted }}>—</span>}
              </div>

              {/* Rep */}
              <div
                style={{
                  fontSize: 13,
                  color: Z.textSecondary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.rep || <span style={{ color: Z.textMuted }}>—</span>}
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
            {search || statusFilter !== "All"
              ? "No contacts match your search or filter. Try adjusting your criteria."
              : "No contacts yet. Click \"+ Add Contact\" to create your first one."}
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

      {/* Sticky bulk action bar */}
      {selectedIds.size > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: Z.oxford,
            color: "#fff",
            borderRadius: 12,
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 10px 32px rgba(5, 5, 54, 0.35)",
            zIndex: 100,
            minWidth: 480,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            {selectedIds.size} contact{selectedIds.size === 1 ? "" : "s"} selected
          </div>
          <div style={{ flex: 1 }} />
          <select
            value=""
            disabled={bulkUpdating}
            onChange={(e) => {
              const val = e.target.value;
              if (val) handleBulkStatusChange(val);
            }}
            style={{
              padding: "8px 12px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 8,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: bulkUpdating ? "not-allowed" : "pointer",
              outline: "none",
            }}
          >
            <option value="" style={{ color: Z.textPrimary }}>
              {bulkUpdating ? "Updating..." : "Change Status"}
            </option>
            <option value="Active Lead" style={{ color: Z.textPrimary }}>
              Active Lead
            </option>
            <option value="Live Customer" style={{ color: Z.textPrimary }}>
              Live Customer
            </option>
            <option value="Cancelled" style={{ color: Z.textPrimary }}>
              Cancelled
            </option>
            <option value="DNC" style={{ color: Z.textPrimary }}>
              DNC
            </option>
          </select>
          <button
            onClick={clearSelection}
            disabled={bulkUpdating}
            style={{
              padding: "8px 14px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 8,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: bulkUpdating ? "not-allowed" : "pointer",
            }}
          >
            Clear Selection
          </button>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
