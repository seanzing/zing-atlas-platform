"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { PageLoader } from "@/components/PageLoader";
import { Toast, useToast } from "@/components/Toast";
// showToast(message, ok: boolean) — true=success, false=error
import { Btn, Modal, FormField, Input, Select } from "@/components/ui";
import { Z, fmt, AVATAR_COLORS } from "@/lib/constants";

interface TeamMemberPerf {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  position: string | null;
  department: string | null;
  active: boolean;
  monthlyTarget: number;
  totalRevenue: number;
  subscriptionCommission: number;
  launchFeeCommission: number;
  totalCommission: number;
  dealCount: number;
  liveCustomerCount: number;
}

function getInitials(first: string | null, last: string | null): string {
  return `${(first || "")[0] || ""}${(last || "")[0] || ""}`.toUpperCase() || "?";
}

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function ProgressBar({ value, target }: { value: number; target: number }) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const color =
    pct >= 100
      ? "#10b981"
      : pct >= 50
      ? "#f59e0b"
      : "#ef4444";

  return (
    <div style={{ marginTop: 4 }}>
      <div
        style={{
          height: 6,
          borderRadius: 4,
          background: Z.borderLight,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 4,
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 3,
          fontSize: 10,
          color: Z.textMuted,
        }}
      >
        <span>{Math.round(pct)}% of target</span>
        <span>{fmt(target)}</span>
      </div>
    </div>
  );
}

function MemberCard({
  member,
  index,
  onEdit,
}: {
  member: TeamMemberPerf;
  index: number;
  onEdit: (m: TeamMemberPerf) => void;
}) {
  const router = useRouter();
  const initials = getInitials(member.firstName, member.lastName);
  const avatarColor = getAvatarColor(index);
  const fullName = `${member.firstName || ""} ${member.lastName || ""}`.trim();

  return (
    <div
      onClick={() => router.push(`/team/${member.id}`)}
      style={{
        background: Z.card,
        border: `1px solid ${Z.border}`,
        borderRadius: 16,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        cursor: "pointer",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}cc)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 18,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: Z.textPrimary,
              marginBottom: 4,
            }}
          >
            {fullName || "Unknown"}
          </div>
          <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {member.role && (
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  background: `${Z.ultramarine}18`,
                  color: Z.ultramarine,
                }}
              >
                {member.role}
              </span>
            )}
            {member.position && (
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  background: `${Z.grey}15`,
                  color: Z.textSecondary,
                }}
              >
                {member.position}
              </span>
            )}
            <span
              style={{
                display: "inline-block",
                padding: "2px 10px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                background: member.active ? "#10b98118" : "#ef444418",
                color: member.active ? "#10b981" : "#ef4444",
              }}
            >
              {member.active ? "Active" : "Inactive"}
            </span>
          </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(member); }}
            title="Edit"
            style={{
              background: "none",
              border: `1px solid ${Z.border}`,
              borderRadius: 8,
              cursor: "pointer",
              color: Z.textMuted,
              padding: "5px 8px",
              fontSize: 13,
              lineHeight: 1,
              flexShrink: 0,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = Z.textPrimary; e.currentTarget.style.borderColor = Z.ultramarine; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = Z.textMuted; e.currentTarget.style.borderColor = Z.border; }}
          >
            ✏️
          </button>
        </div>
      </div>

      {/* Target + Progress */}
      <div
        style={{
          background: Z.bg,
          borderRadius: 10,
          padding: "12px 14px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: Z.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Monthly Target
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: Z.textPrimary }}>
            {fmt(member.totalRevenue)}
          </span>
        </div>
        <ProgressBar value={member.totalRevenue} target={member.monthlyTarget} />
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <StatPill label="Revenue" value={fmt(member.totalRevenue)} />
        <StatPill label="Commission" value={fmt(member.totalCommission)} highlight />
        <StatPill label="Deals Won" value={String(member.dealCount)} />
        <StatPill label="Live Customers" value={String(member.liveCustomerCount)} />
      </div>

      {/* Commission breakdown */}
      {(member.subscriptionCommission > 0 || member.launchFeeCommission > 0) && (
        <div
          style={{
            borderTop: `1px solid ${Z.borderLight}`,
            paddingTop: 12,
            display: "flex",
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 10, color: Z.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Subscription
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: Z.textPrimary }}>
              {fmt(member.subscriptionCommission)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: Z.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Launch Fee
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: Z.textPrimary }}>
              {fmt(member.launchFeeCommission)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        background: highlight ? `${Z.ultramarine}08` : Z.bg,
        border: `1px solid ${highlight ? `${Z.ultramarine}20` : Z.borderLight}`,
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      <div style={{ fontSize: 10, color: Z.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: highlight ? Z.ultramarine : Z.textPrimary }}>
        {value}
      </div>
    </div>
  );
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function TeamPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editMember, setEditMember] = useState<TeamMemberPerf | null>(null);

  // Add form state
  const [formFirst, setFormFirst] = useState("");
  const [formLast, setFormLast] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formDept, setFormDept] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editSaving, setEditSaving] = useState(false);

  function openEdit(m: TeamMemberPerf) {
    setEditMember(m);
    setEditFirst(m.firstName || "");
    setEditLast(m.lastName || "");
    setEditEmail(m.email || "");
    setEditPhone(m.phone || "");
    setEditTarget(m.monthlyTarget ? String(m.monthlyTarget) : "");
    setEditActive(m.active);
  }

  async function handleEditSave() {
    if (!editMember) return;
    if (!editFirst.trim() || !editLast.trim()) {
      showToast("First and last name are required", false);
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/team/${editMember.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editFirst.trim(),
          lastName: editLast.trim(),
          email: editEmail.trim() || undefined,
          phone: editPhone.trim() || undefined,
          monthlyTarget: editTarget ? Number(editTarget) : undefined,
          active: editActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      await mutate();
      setEditMember(null);
      showToast("Team member updated", true);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error saving", false);
    } finally {
      setEditSaving(false);
    }
  }

  const { toast, showToast } = useToast();

  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data: members, mutate } = useSWR<TeamMemberPerf[]>(
    `/api/team/performance?from=${from}&to=${to}`
  );

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function resetForm() {
    setFormFirst("");
    setFormLast("");
    setFormEmail("");
    setFormPhone("");
    setFormTarget("");
    setFormDept("");
  }

  async function handleAddMember() {
    if (!formFirst.trim() || !formLast.trim()) {
      showToast("First and last name are required", false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formFirst.trim(),
          lastName: formLast.trim(),
          email: formEmail.trim() || undefined,
          phone: formPhone.trim() || undefined,
          monthlyTarget: formTarget ? Number(formTarget) : undefined,
          department: formDept || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add member");
      }
      await mutate();
      setAddModalOpen(false);
      resetForm();
      showToast("Team member added", true);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error adding member", false);
    } finally {
      setSaving(false);
    }
  }

  if (!members) return <PageLoader />;

  // Summary stats
  const totalRevenue = members.reduce((s, m) => s + m.totalRevenue, 0);
  const totalCommission = members.reduce((s, m) => s + m.totalCommission, 0);
  const totalDeals = members.reduce((s, m) => s + m.dealCount, 0);
  const totalLive = members.reduce((s, m) => s + m.liveCustomerCount, 0);

  return (
    <div style={{ flex: 1, overflowY: "auto", background: Z.bg }}>
      <Toast toast={toast} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 28px" }}>
        {/* Page Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 28,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: Z.textPrimary,
                margin: 0,
                letterSpacing: -0.5,
              }}
            >
              Team
            </h1>
            <p
              style={{
                fontSize: 14,
                color: Z.textSecondary,
                margin: "4px 0 0",
                fontWeight: 500,
              }}
            >
              Performance &amp; Commissions
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {/* Month selector */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: Z.card,
                border: `1px solid ${Z.border}`,
                borderRadius: 10,
                padding: "6px 12px",
              }}
            >
              <button
                onClick={prevMonth}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: Z.textSecondary,
                  fontSize: 16,
                  padding: "0 4px",
                  lineHeight: 1,
                }}
              >
                ‹
              </button>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: Z.textPrimary,
                  minWidth: 110,
                  textAlign: "center",
                }}
              >
                {MONTH_NAMES[month]} {year}
              </span>
              <button
                onClick={nextMonth}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: Z.textSecondary,
                  fontSize: 16,
                  padding: "0 4px",
                  lineHeight: 1,
                }}
              >
                ›
              </button>
            </div>

            <Btn onClick={() => setAddModalOpen(true)}>+ Add Team Member</Btn>
          </div>
        </div>

        {/* Summary Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
            marginBottom: 28,
          }}
        >
          {[
            { label: "Total Revenue", value: fmt(totalRevenue) },
            { label: "Total Commission", value: fmt(totalCommission) },
            { label: "Deals Won", value: String(totalDeals) },
            { label: "Live Customers", value: String(totalLive) },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: Z.card,
                border: `1px solid ${Z.border}`,
                borderRadius: 12,
                padding: "16px 20px",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: Z.textMuted,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: Z.textPrimary }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Team Cards Grid */}
        {members.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: Z.textMuted,
              fontSize: 15,
            }}
          >
            No team members found.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 20,
            }}
          >
            {members.map((m, i) => (
              <MemberCard key={m.id} member={m} index={i} onEdit={openEdit} />
            ))}
          </div>
        )}
      </div>

      {/* Edit Team Member Modal */}
      <Modal
        open={!!editMember}
        onClose={() => setEditMember(null)}
        title="Edit Team Member"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="First Name *">
              <Input value={editFirst} onChange={setEditFirst} placeholder="First name" />
            </FormField>
            <FormField label="Last Name *">
              <Input value={editLast} onChange={setEditLast} placeholder="Last name" />
            </FormField>
          </div>
          <FormField label="Email">
            <Input value={editEmail} onChange={setEditEmail} placeholder="email@example.com" type="email" />
          </FormField>
          <FormField label="Phone">
            <Input value={editPhone} onChange={setEditPhone} placeholder="+1 (555) 000-0000" type="tel" />
          </FormField>
          <FormField label="Monthly Target ($)">
            <Input value={editTarget} onChange={setEditTarget} placeholder="e.g. 5000" type="number" />
          </FormField>
          <FormField label="Status">
            <div style={{ display: "flex", gap: 10 }}>
              {[{ label: "Active", value: true }, { label: "Inactive", value: false }].map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => setEditActive(opt.value)}
                  style={{
                    padding: "7px 20px",
                    borderRadius: 8,
                    border: `1px solid ${editActive === opt.value ? Z.ultramarine : Z.border}`,
                    background: editActive === opt.value ? `${Z.ultramarine}15` : "transparent",
                    color: editActive === opt.value ? Z.ultramarine : Z.textSecondary,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FormField>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn variant="secondary" onClick={() => setEditMember(null)}>Cancel</Btn>
            <Btn onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? "Saving..." : "Save Changes"}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Add Team Member Modal */}
      <Modal
        open={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          resetForm();
        }}
        title="Add Team Member"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="First Name *">
              <Input
                value={formFirst}
                onChange={(v) => setFormFirst(v)}
                placeholder="First name"
              />
            </FormField>
            <FormField label="Last Name *">
              <Input
                value={formLast}
                onChange={(v) => setFormLast(v)}
                placeholder="Last name"
              />
            </FormField>
          </div>
          <FormField label="Email">
            <Input
              value={formEmail}
              onChange={(v) => setFormEmail(v)}
              placeholder="email@example.com"
              type="email"
            />
          </FormField>
          <FormField label="Phone">
            <Input
              value={formPhone}
              onChange={(v) => setFormPhone(v)}
              placeholder="+1 (555) 000-0000"
              type="tel"
            />
          </FormField>
          <FormField label="Monthly Target ($)">
            <Input
              value={formTarget}
              onChange={(v) => setFormTarget(v)}
              placeholder="e.g. 5000"
              type="number"
            />
          </FormField>
          <FormField label="Department">
            <Select
              value={formDept}
              onChange={setFormDept}
              options={[
                { value: "", label: "Select department..." },
                { value: "Sales", label: "Sales" },
                { value: "Marketing", label: "Marketing" },
                { value: "Admin", label: "Admin" },
                { value: "Design", label: "Design" },
                { value: "Support", label: "Support" },
                { value: "Product Development", label: "Product Development" },
                { value: "Executive", label: "Executive" },
              ]}
            />
          </FormField>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn
              variant="secondary"
              onClick={() => {
                setAddModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Btn>
            <Btn
              onClick={handleAddMember}
              disabled={saving}
            >
              {saving ? "Adding..." : "Add Member"}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
