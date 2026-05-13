"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import Link from "next/link";
import { PageLoader } from "@/components/PageLoader";
import { Badge, Btn, Modal, FormField, Input, Select } from "@/components/ui";
import { Z, fmt } from "@/lib/constants";
import { useAuthContext } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

interface TeamMember {
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
  supabaseUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

const DEPARTMENT_OPTIONS = [
  { value: "all", label: "All (Generalist)" },
  { value: "designer", label: "Designer" },
  { value: "onboarding", label: "Onboarding" },
  { value: "publishing", label: "Publishing" },
  { value: "sales", label: "Sales" },
];

const POSITION_OPTIONS = [
  { value: "", label: "None" },
  { value: "sales_rep", label: "Sales Rep" },
  { value: "designer_offshore", label: "Designer (Offshore)" },
  { value: "designer_us", label: "Designer (US)" },
  { value: "publishing", label: "Publishing" },
  { value: "onboarding_specialist", label: "Onboarding Specialist" },
  { value: "marketing", label: "Marketing" },
  { value: "admin", label: "Admin" },
];

function positionLabel(value: string | null): string {
  if (!value) return "";
  const opt = POSITION_OPTIONS.find((o) => o.value === value);
  return opt?.label ?? value;
}

function deptLabel(value: string | null): string {
  if (!value) return "General";
  const opt = DEPARTMENT_OPTIONS.find((o) => o.value === value);
  return opt?.label ?? value;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error: ${r.status}`);
    return r.json();
  });

export default function UsersPage() {
  const { isAdmin, loading: authLoading } = useAuthContext();
  const router = useRouter();

  // Fetch all team members (including inactive ones for admin view)
  const { data: team, mutate: mutateTeam } = useSWR<TeamMember[]>("/api/team", fetcher);

  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("Member");
  const [editPosition, setEditPosition] = useState("");
  const [editDepartment, setEditDepartment] = useState("all");
  const [editTarget, setEditTarget] = useState("");
  const [saving, setSaving] = useState(false);

  // Confirm modals
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Redirect non-admins
  if (!authLoading && !isAdmin) {
    router.replace("/dashboard");
    return null;
  }

  if (authLoading || !team) return <PageLoader />;

  const openUser = (m: TeamMember) => {
    setSelectedUser(m);
    setPanelOpen(true);
  };

  const openEdit = (m: TeamMember) => {
    setEditFirstName(m.firstName ?? "");
    setEditLastName(m.lastName ?? "");
    setEditEmail(m.email ?? "");
    setEditPhone(m.phone ?? "");
    setEditRole(m.role ?? "Member");
    setEditPosition(m.position ?? "");
    setEditDepartment(m.department ?? "all");
    setEditTarget(String(m.monthlyTarget ?? 0));
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/team/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          email: editEmail || undefined,
          phone: editPhone || undefined,
          role: editRole,
          position: editPosition || null,
          department: editDepartment,
          monthlyTarget: parseFloat(editTarget) || 0,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      setSelectedUser(updated);
      await mutateTeam();
      setEditOpen(false);
      showToast("User updated");
    } catch {
      showToast("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/team/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      setSelectedUser(updated);
      await mutateTeam();
      setDeactivateConfirmOpen(false);
      showToast(`${selectedUser.firstName} deactivated`);
    } catch {
      showToast("Failed to deactivate user");
    }
  };

  const handleReactivate = async () => {
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/team/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      setSelectedUser(updated);
      await mutateTeam();
      showToast(`${selectedUser.firstName} reactivated`);
    } catch {
      showToast("Failed to reactivate user");
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/team/${selectedUser.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      await mutateTeam();
      setDeleteConfirmOpen(false);
      setPanelOpen(false);
      setSelectedUser(null);
      showToast("User permanently removed");
    } catch {
      showToast("Failed to delete user");
    }
  };

  const fullName = (m: TeamMember) =>
    [m.firstName, m.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 3000,
            background: Z.oxford,
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          }}
        >
          {toast}
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Link
            href="/settings"
            style={{ fontSize: 13, color: Z.textMuted, textDecoration: "none" }}
          >
            Settings
          </Link>
          <span style={{ color: Z.textMuted }}>›</span>
          <span style={{ fontSize: 13, color: Z.textSecondary, fontWeight: 600 }}>
            User Management
          </span>
        </div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: Z.textPrimary,
            margin: 0,
            letterSpacing: -0.5,
          }}
        >
          User Management
        </h1>
        <p style={{ fontSize: 14, color: Z.textSecondary, margin: "4px 0 0 0" }}>
          Manage team access, roles, and permissions. Admin only.
        </p>
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
            gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 80px",
            padding: "14px 24px",
            borderBottom: `1px solid ${Z.border}`,
            background: Z.bg,
          }}
        >
          {["Name", "Email", "Role", "Department", "Status", ""].map((h) => (
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
          ))}
        </div>

        {team.map((m) => (
          <div
            key={m.id}
            onClick={() => openUser(m)}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 80px",
              padding: "14px 24px",
              alignItems: "center",
              borderBottom: `1px solid ${Z.borderLight}`,
              cursor: "pointer",
              transition: "background 0.1s",
              opacity: m.active ? 1 : 0.6,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = Z.bg;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = "transparent";
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: Z.textPrimary }}>
              {fullName(m)}
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
              {m.email || "—"}
            </div>
            <div>
              <Badge
                label={m.role ?? "Member"}
                color={m.role === "Admin" ? Z.violet : Z.ultramarine}
              />
            </div>
            <div style={{ fontSize: 12, color: Z.textSecondary }}>
              {deptLabel(m.department)}
            </div>
            <div>
              <Badge
                label={m.active ? "Active" : "Inactive"}
                color={m.active ? "#10b981" : Z.grey}
              />
            </div>
            <div style={{ fontSize: 12, color: Z.textMuted }}>
              View →
            </div>
          </div>
        ))}

        {team.length === 0 && (
          <div
            style={{
              padding: 48,
              textAlign: "center",
              color: Z.textMuted,
              fontSize: 14,
            }}
          >
            No team members found
          </div>
        )}
      </div>

      {/* Summary */}
      <div style={{ marginTop: 12, fontSize: 12, color: Z.textMuted }}>
        {team.filter((m) => m.active).length} active, {team.filter((m) => !m.active).length} inactive
      </div>

      {/* Slide-over panel */}
      {panelOpen && selectedUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
          }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setPanelOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(5,5,54,0.35)",
              backdropFilter: "blur(2px)",
            }}
          />
          {/* Panel */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: 420,
              background: Z.card,
              boxShadow: "-8px 0 40px rgba(5,5,54,0.15)",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
            }}
          >
            {/* Panel header */}
            <div
              style={{
                padding: "24px 28px 20px",
                borderBottom: `1px solid ${Z.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: Z.textPrimary }}>
                  {fullName(selectedUser)}
                </div>
                <div style={{ fontSize: 13, color: Z.textSecondary, marginTop: 4 }}>
                  {selectedUser.email || "No email"}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Badge
                    label={selectedUser.role ?? "Member"}
                    color={selectedUser.role === "Admin" ? Z.violet : Z.ultramarine}
                  />
                  <Badge
                    label={selectedUser.active ? "Active" : "Inactive"}
                    color={selectedUser.active ? "#10b981" : Z.grey}
                  />
                </div>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 18,
                  color: Z.textMuted,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* User details */}
            <div style={{ padding: "20px 28px", flex: 1 }}>
              {[
                { label: "Department", value: deptLabel(selectedUser.department) },
                { label: "Position", value: positionLabel(selectedUser.position) || "—" },
                { label: "Phone", value: selectedUser.phone || "—" },
                { label: "Monthly Target", value: fmt(selectedUser.monthlyTarget ?? 0) },
                { label: "Has Login", value: selectedUser.supabaseUserId ? "Yes" : "No" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom: `1px solid ${Z.borderLight}`,
                  }}
                >
                  <div style={{ fontSize: 12, color: Z.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 13, color: Z.textPrimary, fontWeight: 600 }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div
              style={{
                padding: "20px 28px",
                borderTop: `1px solid ${Z.border}`,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <Btn
                onClick={() => openEdit(selectedUser)}
                variant="secondary"
              >
                Edit Profile
              </Btn>
              {selectedUser.active ? (
                <Btn
                  onClick={() => setDeactivateConfirmOpen(true)}
                  variant="secondary"
                >
                  Deactivate User
                </Btn>
              ) : (
                <Btn
                  onClick={handleReactivate}
                  variant="secondary"
                >
                  Reactivate User
                </Btn>
              )}
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                style={{
                  padding: "9px 16px",
                  borderRadius: 8,
                  border: "1px solid #ef444440",
                  background: "#fef2f2",
                  color: "#ef4444",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={selectedUser ? `Edit ${fullName(selectedUser)}` : "Edit User"}
      >
        <FormField label="First Name">
          <Input value={editFirstName} onChange={setEditFirstName} placeholder="First name" />
        </FormField>
        <FormField label="Last Name">
          <Input value={editLastName} onChange={setEditLastName} placeholder="Last name" />
        </FormField>
        <FormField label="Email">
          <Input value={editEmail} onChange={setEditEmail} placeholder="Email" type="email" />
        </FormField>
        <FormField label="Phone">
          <Input value={editPhone} onChange={setEditPhone} placeholder="Phone" type="tel" />
        </FormField>
        <FormField label="Role">
          <Select
            value={editRole}
            onChange={setEditRole}
            options={[
              { value: "Member", label: "Member" },
              { value: "Admin", label: "Admin" },
            ]}
          />
        </FormField>
        <FormField label="Department">
          <Select value={editDepartment} onChange={setEditDepartment} options={DEPARTMENT_OPTIONS} />
        </FormField>
        <FormField label="Monthly Target ($)">
          <Input value={editTarget} onChange={setEditTarget} placeholder="0" type="number" />
        </FormField>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <Btn variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Btn>
          <Btn onClick={handleSaveEdit} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Btn>
        </div>
      </Modal>

      {/* Deactivate Confirm Modal */}
      <Modal
        open={deactivateConfirmOpen}
        onClose={() => setDeactivateConfirmOpen(false)}
        title="Deactivate User"
      >
        <p style={{ fontSize: 14, color: Z.textSecondary, marginBottom: 20, lineHeight: 1.6 }}>
          Deactivate <strong>{selectedUser ? fullName(selectedUser) : "this user"}</strong>? They will lose access but their history will be preserved.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setDeactivateConfirmOpen(false)}>Cancel</Btn>
          <Btn onClick={handleDeactivate}>Deactivate</Btn>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete User"
      >
        <p style={{ fontSize: 14, color: Z.textSecondary, marginBottom: 20, lineHeight: 1.6 }}>
          Are you sure you want to permanently remove <strong>{selectedUser ? fullName(selectedUser) : "this user"}</strong>? This cannot be undone.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Btn>
          <button
            onClick={handleDelete}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: "none",
              background: "#ef4444",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Delete Permanently
          </button>
        </div>
      </Modal>
    </div>
  );
}
