"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { PageLoader } from "@/components/PageLoader";
import { Badge, Btn, Modal, FormField, Input, Select } from "@/components/ui";
import { Z, CAMPAIGN_TYPE_COLORS } from "@/lib/constants";
import { useAuthContext } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  contactCount: number;
  _count?: { contacts: number };
}

interface ApiTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

function TemplateForm({
  name,
  subject,
  body,
  onName,
  onSubject,
  onBody,
  onSave,
  onCancel,
  saving,
}: {
  name: string;
  subject: string;
  body: string;
  onName: (v: string) => void;
  onSubject: (v: string) => void;
  onBody: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder="Template name (e.g. Website Draft Ready)"
        style={{
          padding: "8px 12px",
          borderRadius: 6,
          border: `1px solid ${Z.border}`,
          background: Z.bg,
          color: Z.textPrimary,
          fontSize: 13,
          outline: "none",
        }}
      />
      <input
        value={subject}
        onChange={(e) => onSubject(e.target.value)}
        placeholder="Email subject"
        style={{
          padding: "8px 12px",
          borderRadius: 6,
          border: `1px solid ${Z.border}`,
          background: Z.bg,
          color: Z.textPrimary,
          fontSize: 13,
          outline: "none",
        }}
      />
      <textarea
        value={body}
        onChange={(e) => onBody(e.target.value)}
        placeholder={"Email body. Use {{name}} for customer name, {{sender}} for sender name."}
        rows={6}
        style={{
          padding: "8px 12px",
          borderRadius: 6,
          border: `1px solid ${Z.border}`,
          background: Z.bg,
          color: Z.textPrimary,
          fontSize: 13,
          resize: "vertical",
          fontFamily: "inherit",
          outline: "none",
        }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onSave}
          disabled={saving || !name || !subject || !body}
          style={{
            padding: "7px 18px",
            borderRadius: 6,
            border: "none",
            background: `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {saving ? "Saving..." : "Save Template"}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: "7px 18px",
            borderRadius: 6,
            border: `1px solid ${Z.border}`,
            background: "transparent",
            color: Z.textSecondary,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function MarketingPage() {
  const { isAdmin, loading: authLoading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAdmin, router]);

  const { data: campaigns, mutate: mutateCampaigns } = useSWR<Campaign[]>("/api/campaigns");
  const { data: templateData, mutate: mutateTemplates } = useSWR<{
    templates: ApiTemplate[];
  }>("/api/email-templates");
  const templates = templateData?.templates ?? [];

  // Campaign state
  const [campModalOpen, setCampModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [campName, setCampName] = useState("");
  const [campType, setCampType] = useState("email");
  const [campStatus, setCampStatus] = useState("active");

  // Email template state
  const [editingTemplate, setEditingTemplate] = useState<ApiTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState(false);
  const [tmplName, setTmplName] = useState("");
  const [tmplSubject, setTmplSubject] = useState("");
  const [tmplBody, setTmplBody] = useState("");
  const [savingTmpl, setSavingTmpl] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const resetCampForm = () => {
    setCampName("");
    setCampType("email");
    setCampStatus("active");
    setEditingCampaign(null);
  };

  const openEditCampaign = (c: Campaign) => {
    setEditingCampaign(c);
    setCampName(c.name);
    setCampType(c.type);
    setCampStatus(c.status);
    setCampModalOpen(true);
  };

  const handleSaveCampaign = async () => {
    if (!campName) return;
    const body = { name: campName, type: campType, status: campStatus };
    try {
      const res = editingCampaign
        ? await fetch(`/api/campaigns/${editingCampaign.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/campaigns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (!res.ok) throw new Error("Failed");
      mutateCampaigns();
      setCampModalOpen(false);
      resetCampForm();
    } catch {
      showToast("Failed to save campaign");
    }
  };

  const saveTemplate = async () => {
    setSavingTmpl(true);
    if (editingTemplate) {
      await fetch(`/api/email-templates/${editingTemplate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tmplName, subject: tmplSubject, body: tmplBody }),
      });
    } else {
      await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tmplName, subject: tmplSubject, body: tmplBody }),
      });
    }
    await mutateTemplates();
    setEditingTemplate(null);
    setNewTemplate(false);
    setTmplName("");
    setTmplSubject("");
    setTmplBody("");
    setSavingTmpl(false);
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/email-templates/${id}`, { method: "DELETE" });
    mutateTemplates();
  };

  const startEditTemplate = (t: ApiTemplate) => {
    setEditingTemplate(t);
    setNewTemplate(false);
    setTmplName(t.name);
    setTmplSubject(t.subject);
    setTmplBody(t.body);
  };

  const startNewTemplate = () => {
    setEditingTemplate(null);
    setNewTemplate(true);
    setTmplName("");
    setTmplSubject("");
    setTmplBody("");
  };

  if (!isAdmin) return null;
  if (!campaigns) return <PageLoader />;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 2000,
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
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: Z.textPrimary,
            margin: 0,
            letterSpacing: -0.5,
          }}
        >
          Marketing
        </h1>
        <p style={{ fontSize: 14, color: Z.textSecondary, margin: "4px 0 0 0" }}>
          Manage campaigns and email templates
        </p>
      </div>

      {/* ── Campaigns ── */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 14, color: Z.textSecondary }}>
            {campaigns.length} campaigns
          </div>
          <Btn
            onClick={() => {
              resetCampForm();
              setCampModalOpen(true);
            }}
          >
            + Add Campaign
          </Btn>
        </div>

        <div
          style={{
            background: Z.card,
            borderRadius: 16,
            border: `1px solid ${Z.border}`,
            overflow: "hidden",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 100px",
              padding: "14px 24px",
              borderBottom: `1px solid ${Z.border}`,
              background: Z.bg,
            }}
          >
            {["Name", "Type", "Status", "Contacts", "Actions"].map((h) => (
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

          {campaigns.map((c) => (
            <div
              key={c.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 100px",
                padding: "14px 24px",
                alignItems: "center",
                borderBottom: `1px solid ${Z.borderLight}`,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: Z.textPrimary }}>
                {c.name}
              </div>
              <div>
                <Badge label={c.type} color={CAMPAIGN_TYPE_COLORS[c.type] || Z.grey} />
              </div>
              <div>
                <Badge
                  label={c.status}
                  color={
                    c.status === "active"
                      ? "#10b981"
                      : c.status === "paused"
                      ? "#f59e0b"
                      : Z.grey
                  }
                />
              </div>
              <div style={{ fontSize: 13, color: Z.textSecondary }}>
                {c._count?.contacts ?? c.contactCount ?? 0}
              </div>
              <div>
                <Btn small variant="secondary" onClick={() => openEditCampaign(c)}>
                  Edit
                </Btn>
              </div>
            </div>
          ))}

          {campaigns.length === 0 && (
            <div
              style={{
                padding: 48,
                textAlign: "center",
                color: Z.textMuted,
                fontSize: 14,
              }}
            >
              No campaigns found
            </div>
          )}
        </div>
      </div>

      {/* ── Email Templates ── */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: Z.textPrimary }}>
              Email Templates
            </div>
            <div style={{ fontSize: 13, color: Z.textMuted, marginTop: 2 }}>
              Reusable templates for customer emails. Use {"{{"} name {"}}"}  and {"{{"} sender {"}}"} as merge fields.
            </div>
          </div>
          <button
            onClick={startNewTemplate}
            style={{
              padding: "8px 16px",
              background: `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`,
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + New Template
          </button>
        </div>

        <div
          style={{
            background: Z.card,
            border: `1px solid ${Z.border}`,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {templates.length === 0 && !newTemplate ? (
            <div
              style={{
                padding: "32px 24px",
                textAlign: "center",
                color: Z.textMuted,
                fontSize: 13,
              }}
            >
              No templates yet. Click &quot;New Template&quot; to create one.
            </div>
          ) : (
            templates.map((t, i) => (
              <div key={t.id}>
                {editingTemplate?.id === t.id ? (
                  <div style={{ padding: 20, background: `${Z.ultramarine}06` }}>
                    <TemplateForm
                      name={tmplName}
                      subject={tmplSubject}
                      body={tmplBody}
                      onName={setTmplName}
                      onSubject={setTmplSubject}
                      onBody={setTmplBody}
                      onSave={saveTemplate}
                      onCancel={() => setEditingTemplate(null)}
                      saving={savingTmpl}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 16,
                      padding: "14px 20px",
                      borderBottom:
                        i < templates.length - 1
                          ? `1px solid ${Z.borderLight}`
                          : "none",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: Z.textPrimary,
                        }}
                      >
                        {t.name}
                      </div>
                      <div style={{ fontSize: 12, color: Z.textMuted, marginTop: 2 }}>
                        {t.subject}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => startEditTemplate(t)}
                        style={{
                          padding: "4px 12px",
                          borderRadius: 6,
                          border: `1px solid ${Z.border}`,
                          background: "transparent",
                          color: Z.textSecondary,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTemplate(t.id)}
                        style={{
                          padding: "4px 12px",
                          borderRadius: 6,
                          border: "1px solid #ef444440",
                          background: "transparent",
                          color: "#ef4444",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {newTemplate && (
            <div
              style={{
                padding: 20,
                borderTop: templates.length > 0 ? `1px solid ${Z.border}` : "none",
              }}
            >
              <TemplateForm
                name={tmplName}
                subject={tmplSubject}
                body={tmplBody}
                onName={setTmplName}
                onSubject={setTmplSubject}
                onBody={setTmplBody}
                onSave={saveTemplate}
                onCancel={() => setNewTemplate(false)}
                saving={savingTmpl}
              />
            </div>
          )}
        </div>
      </div>

      {/* Campaign Modal */}
      <Modal
        open={campModalOpen}
        onClose={() => {
          setCampModalOpen(false);
          resetCampForm();
        }}
        title={editingCampaign ? "Edit Campaign" : "Add Campaign"}
      >
        <FormField label="Name">
          <Input value={campName} onChange={setCampName} placeholder="Campaign name" />
        </FormField>
        <FormField label="Type">
          <Select
            value={campType}
            onChange={setCampType}
            options={[
              { value: "sms-blast", label: "SMS Blast" },
              { value: "email", label: "Email" },
              { value: "paid-ads", label: "Paid Ads" },
              { value: "purchased-list", label: "Purchased List" },
              { value: "referral", label: "Referral" },
              { value: "organic", label: "Organic" },
              { value: "direct-mail", label: "Direct Mail" },
            ]}
          />
        </FormField>
        <FormField label="Status">
          <Select
            value={campStatus}
            onChange={setCampStatus}
            options={[
              { value: "active", label: "Active" },
              { value: "paused", label: "Paused" },
              { value: "completed", label: "Completed" },
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
              setCampModalOpen(false);
              resetCampForm();
            }}
          >
            Cancel
          </Btn>
          <Btn onClick={handleSaveCampaign}>
            {editingCampaign ? "Save Changes" : "Add Campaign"}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
