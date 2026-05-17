"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Btn, FormField, Input, Select } from "@/components/ui";
import { Z } from "@/lib/constants";
import { useAuthContext } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

interface ImportResult {
  dryRun: boolean;
  dealsFound: number;
  dealsImported: number;
  contactsCreated: number;
  contactsUpdated: number;
  dealsCreated: number;
  skipped: number;
  errors: string[];
  aborted?: boolean;
  reason?: string;
}

function ImportTab() {
  const [preview, setPreview] = useState<{
    estimatedDeals: number;
    estimatedContacts: number;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [dryResult, setDryResult] = useState<ImportResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [dryRunning, setDryRunning] = useState(false);

  useEffect(() => {
    setPreviewLoading(true);
    fetch("/api/import/hubspot")
      .then((r) => r.json())
      .then((d) => setPreview(d))
      .catch(() => setPreview(null))
      .finally(() => setPreviewLoading(false));
  }, []);

  const runDryRun = async () => {
    setDryRunning(true);
    setDryResult(null);
    try {
      const res = await fetch("/api/import/hubspot?dryRun=true", { method: "POST" });
      const data = await res.json();
      setDryResult(data);
    } catch {
      setDryResult(null);
    } finally {
      setDryRunning(false);
    }
  };

  const runImport = async () => {
    if (
      !confirm(
        "Are you sure you want to run the import? This will create/update contacts and deals."
      )
    )
      return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/import/hubspot?dryRun=false", { method: "POST" });
      const data = await res.json();
      setImportResult(data);
    } catch {
      setImportResult(null);
    } finally {
      setImporting(false);
    }
  };

  const summaryCard = (result: ImportResult, label: string) => (
    <div
      style={{
        background: Z.bg,
        borderRadius: 12,
        border: `1px solid ${Z.border}`,
        padding: 20,
        marginTop: 16,
      }}
    >
      <div
        style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: Z.textPrimary }}
      >
        {label}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 12,
        }}
      >
        {[
          { label: "Contacts Created", value: result.contactsCreated, color: "#10b981" },
          { label: "Contacts Updated", value: result.contactsUpdated, color: Z.bluejeans },
          { label: "Deals Created", value: result.dealsCreated, color: Z.ultramarine },
          { label: "Skipped", value: result.skipped, color: Z.grey },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: Z.textMuted }}>{s.label}</div>
          </div>
        ))}
      </div>
      {result.errors.length > 0 && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: "#fef2f2",
            borderRadius: 8,
            fontSize: 12,
            color: "#b91c1c",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {result.errors.length} error(s):
          </div>
          {result.errors.slice(0, 5).map((e, i) => (
            <div key={i}>{e}</div>
          ))}
          {result.errors.length > 5 && (
            <div>...and {result.errors.length - 5} more</div>
          )}
        </div>
      )}
      {result.aborted && (
        <div
          style={{
            marginTop: 8,
            padding: 8,
            background: "#fef2f2",
            borderRadius: 8,
            fontSize: 12,
            color: "#b91c1c",
            fontWeight: 600,
          }}
        >
          Import aborted: {result.reason}
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        background: Z.card,
        borderRadius: 16,
        border: `1px solid ${Z.border}`,
        padding: 32,
        maxWidth: 720,
      }}
    >
      <h3 style={{ fontSize: 18, fontWeight: 700, color: Z.textPrimary, margin: 0 }}>
        Import Active Customers from HubSpot
      </h3>
      <p
        style={{
          fontSize: 13,
          color: Z.textSecondary,
          marginTop: 6,
          marginBottom: 20,
        }}
      >
        Imports contacts and deals for all active, past due, and unpaid subscribers.
        Skips cancelled accounts and historical records.
      </p>

      <div
        style={{
          display: "flex",
          gap: 24,
          marginBottom: 20,
          padding: 16,
          background: Z.bg,
          borderRadius: 10,
          border: `1px solid ${Z.borderLight}`,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: Z.textMuted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Estimated Contacts
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: Z.ultramarine }}>
            {previewLoading ? "..." : preview?.estimatedContacts ?? "—"}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              color: Z.textMuted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Estimated Deals
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: Z.ultramarine }}>
            {previewLoading ? "..." : preview?.estimatedDeals ?? "—"}
          </div>
        </div>
      </div>

      <div
        style={{
          background: "#fffbeb",
          border: "1px solid #fbbf24",
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 13,
          color: "#92400e",
          marginBottom: 20,
        }}
      >
        ⚠️ Run Preview first. Import is safe to re-run (upserts, no duplicates), but
        review the preview counts before proceeding.
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <Btn variant="secondary" onClick={runDryRun} disabled={dryRunning || importing}>
          {dryRunning ? "Previewing..." : "Preview Import"}
        </Btn>
        <Btn variant="danger" onClick={runImport} disabled={importing || dryRunning}>
          {importing ? "Importing..." : "Run Import"}
        </Btn>
      </div>

      {dryResult && summaryCard(dryResult, "Preview Results (Dry Run — nothing written)")}

      {importResult && (
        <>
          {summaryCard(importResult, "Import Results")}
          <div style={{ marginTop: 16 }}>
            <a
              href="/contacts"
              style={{
                display: "inline-block",
                padding: "8px 20px",
                background: Z.ultramarine,
                color: "#fff",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              View Contacts →
            </a>
          </div>
        </>
      )}
    </div>
  );
}

const TABS = ["Company Info", "Import"] as const;
type Tab = (typeof TABS)[number];

export default function SettingsPage() {
  const { isAdmin, loading: authLoading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAdmin, router]);

  const [activeTab, setActiveTab] = useState<Tab>("Company Info");

  // Company info
  const [companyName, setCompanyName] = useState("ZING Website Design");
  const [companyTimezone, setCompanyTimezone] = useState("America/New_York");
  const [companySaved, setCompanySaved] = useState(false);

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: "10px 24px",
    fontSize: 13,
    fontWeight: 700,
    color: activeTab === t ? Z.ultramarine : Z.textSecondary,
    borderBottom: activeTab === t ? `2px solid ${Z.ultramarine}` : "2px solid transparent",
    background: "none",
    border: "none",
    borderBottomWidth: 2,
    borderBottomStyle: "solid",
    borderBottomColor: activeTab === t ? Z.ultramarine : "transparent",
    cursor: "pointer",
    transition: "all 0.2s",
    letterSpacing: 0.3,
  });

  if (!isAdmin) return null;

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: Z.textPrimary,
            margin: 0,
            letterSpacing: -0.5,
          }}
        >
          Settings
        </h1>
        <p style={{ fontSize: 14, color: Z.textSecondary, margin: "4px 0 0 0" }}>
          Manage company settings and data imports
        </p>
      </div>

      {/* Quick-link cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Team", href: "/team", icon: "👥" },
          { label: "Products", href: "/products", icon: "📦" },
          { label: "Marketing", href: "/marketing", icon: "📣" },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 20px",
              background: Z.card,
              border: `1px solid ${Z.border}`,
              borderRadius: 12,
              textDecoration: "none",
              color: Z.textPrimary,
              fontSize: 14,
              fontWeight: 700,
              transition: "all 0.15s",
              flex: 1,
              maxWidth: 200,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = Z.ultramarine;
              (e.currentTarget as HTMLElement).style.color = Z.ultramarine;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = Z.border;
              (e.currentTarget as HTMLElement).style.color = Z.textPrimary;
            }}
          >
            <span style={{ fontSize: 20 }}>{card.icon}</span>
            {card.label} →
          </Link>
        ))}
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `1px solid ${Z.border}`,
          marginBottom: 28,
        }}
      >
        {TABS.map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} style={tabStyle(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* Company Info Tab */}
      {activeTab === "Company Info" && (
        <div
          style={{
            background: Z.card,
            borderRadius: 16,
            border: `1px solid ${Z.border}`,
            padding: 32,
            maxWidth: 600,
          }}
        >
          <FormField label="Company Name">
            <Input
              value={companyName}
              onChange={setCompanyName}
              placeholder="Company name"
            />
          </FormField>
          <FormField label="Logo">
            <div
              style={{
                width: "100%",
                height: 120,
                background: Z.bg,
                border: `2px dashed ${Z.border}`,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: Z.textMuted,
                fontSize: 13,
              }}
            >
              Logo upload coming in Phase 2
            </div>
          </FormField>
          <FormField label="Timezone">
            <Select
              value={companyTimezone}
              onChange={setCompanyTimezone}
              options={[
                { value: "America/New_York", label: "Eastern (ET)" },
                { value: "America/Chicago", label: "Central (CT)" },
                { value: "America/Denver", label: "Mountain (MT)" },
                { value: "America/Los_Angeles", label: "Pacific (PT)" },
              ]}
            />
          </FormField>
          <div style={{ marginTop: 12 }}>
            <Btn
              onClick={() => {
                setCompanySaved(true);
                setTimeout(() => setCompanySaved(false), 2000);
              }}
            >
              {companySaved ? "Saved!" : "Save Changes"}
            </Btn>
          </div>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === "Import" && <ImportTab />}
    </div>
  );
}
