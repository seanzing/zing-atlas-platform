"use client";
import { useState, useCallback } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageLoader } from "@/components/PageLoader";
import { Toast, useToast } from "@/components/Toast";
import { SearchBar, Btn } from "@/components/ui";
import { Z, fmt } from "@/lib/constants";

const WEBSITE_STAGES = [
  { value: "not_started", label: "Not Started", color: "#ef4444" },
  { value: "website-started", label: "Website Started", color: "#f59e0b" },
  { value: "first-draft", label: "First Draft Ready", color: "#f59e0b" },
  { value: "website-sent", label: "Website Sent", color: "#00AEFF" },
  { value: "edits-mode", label: "Edits Mode", color: "#9600FF" },
  { value: "ready-qa", label: "Ready for QA", color: "#8b5cf6" },
  { value: "ready-publishing", label: "Ready for Publishing", color: "#06b6d4" },
  { value: "complete", label: "Published", color: "#10b981" },
];

const NAV_TABS = [
  { label: "By Rep", href: "/onboarding" },
  { label: "By Task", href: "/onboarding/by-task" },
  { label: "By View", href: "/onboarding/full" },
  { label: "Work Funnel", href: "/onboarding/funnel" },
];

interface FullRow {
  onboardingId: string;
  customerName: string | null;
  businessName: string | null;
  email: string | null;
  contactId: string | null;
  websiteStatus: string | null;
  offshoreDesigner: string | null;
  usDesigner: string | null;
  designer: string | null;
  product: string | null;
  wonDate: string | null;
  rep: string | null;
  value: number | null;
  launchFeeAmount: number | null;
  domainType: string | null;
  domainName: string | null;
  designBrief: string | null;
  googleAccess: string | null;
  launchFeeCollected: string | null;
  designerNotes: string | null;
  items: {
    id: string;
    taskType: string | null;
    stage: string | null;
    dueDate: string | null;
    completedAt: string | null;
    owner: string | null;
  }[];
}

function getItem(items: FullRow["items"], taskType: string) {
  return items.find((i) => i.taskType === taskType) ?? null;
}

function taskStatus(items: FullRow["items"], taskType: string): string {
  const item = getItem(items, taskType);
  if (!item) return "outstanding";
  return item.stage === "complete" ? "completed" : "outstanding";
}

function fmtDate(d: string | Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function OnboardingFullPage() {
  const { data: rows, mutate: refresh } = useSWR<FullRow[]>("/api/onboarding/full");
  const { data: teamMembers } = useSWR<{ id: string; firstName: string | null; lastName: string | null; department: string | null }[]>("/api/team");
  const designers = (teamMembers ?? []).filter((m) => m.department === "Design" || m.department === "design").map((m) => `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim()).filter(Boolean);
  const { toast, showToast } = useToast();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [notesPanel, setNotesPanel] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const emptyFilters = {
    webStatus: "", designer: "", dealOwner: "", feeCollected: "",
    designBrief: "", domainType: "", googleAccess: "", gbp: "",
    directories: "", landingPages: "", aiChat: "", blogs: "",
    socialMedia: "", ecommerce: "",
  };
  const [filters, setFilters] = useState(emptyFilters);
  const setFilter = (k: string, v: string) => setFilters((prev) => ({ ...prev, [k]: v }));
  const hasFilters = Object.values(filters).some((v) => v) || !!search;

  const saveField = useCallback(async (obId: string, field: string, value: string) => {
    setSaving(`${obId}-${field}`);
    try {
      await fetch(`/api/onboarding/${obId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      refresh();
    } catch {
      showToast("Failed to save", false);
    } finally {
      setSaving(null);
    }
  }, [refresh, showToast]);

  const saveItemStatus = useCallback(async (itemId: string, stage: string) => {
    try {
      await fetch(`/api/onboarding/items/${itemId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: stage === "completed" ? "completed" : "not_started" }),
      });
      refresh();
    } catch {
      showToast("Failed to save", false);
    }
  }, [refresh, showToast]);

  if (!rows) return <PageLoader />;

  const filtered = rows.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      if (!(r.businessName ?? "").toLowerCase().includes(q) &&
          !(r.customerName ?? "").toLowerCase().includes(q)) return false;
    }
    if (filters.webStatus && (r.websiteStatus ?? "not_started") !== filters.webStatus) return false;
    if (filters.designer && (r.offshoreDesigner ?? "") !== filters.designer) return false;
    if (filters.dealOwner && (r.rep ?? "") !== filters.dealOwner) return false;
    if (filters.feeCollected && (r.launchFeeCollected ?? "no") !== filters.feeCollected) return false;
    if (filters.designBrief && (r.designBrief ?? "no") !== filters.designBrief) return false;
    if (filters.domainType && (r.domainType ?? "new") !== filters.domainType) return false;
    if (filters.googleAccess && (r.googleAccess ?? "no") !== filters.googleAccess) return false;
    if (filters.gbp && taskStatus(r.items, "gbp") !== filters.gbp) return false;
    if (filters.directories && taskStatus(r.items, "directories") !== filters.directories) return false;
    if (filters.landingPages && taskStatus(r.items, "landing_pages") !== filters.landingPages) return false;
    if (filters.aiChat && taskStatus(r.items, "ai_chat") !== filters.aiChat) return false;
    if (filters.blogs && taskStatus(r.items, "blogs") !== filters.blogs) return false;
    if (filters.socialMedia && taskStatus(r.items, "social_media") !== filters.socialMedia) return false;
    if (filters.ecommerce && taskStatus(r.items, "ecommerce") !== filters.ecommerce) return false;
    return true;
  });

  const uniqueDesigners = designers.length > 0
    ? designers
    : Array.from(new Set(rows.map((r) => r.offshoreDesigner).filter(Boolean) as string[])).sort();
  const uniqueOwners = Array.from(new Set(rows.map((r) => r.rep).filter(Boolean) as string[])).sort();

  const statusOpts = [{ value: "completed", label: "Completed" }, { value: "outstanding", label: "Outstanding" }];
  const yesNoOpts = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }];

  const cellSt: React.CSSProperties = {
    padding: "10px 12px",
    borderBottom: `1px solid ${Z.borderLight}`,
    fontSize: 12,
    whiteSpace: "nowrap",
    color: Z.textPrimary,
    verticalAlign: "middle",
  };
  const headSt: React.CSSProperties = {
    padding: "10px 12px",
    fontWeight: 700,
    fontSize: 10,
    color: Z.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    borderBottom: `1px solid ${Z.border}`,
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    background: Z.bg,
    zIndex: 2,
    textAlign: "left",
  };
  const filterSt: React.CSSProperties = {
    padding: "4px 8px",
    borderBottom: `1px solid ${Z.border}`,
    position: "sticky",
    top: 37,
    background: Z.bg,
    zIndex: 2,
  };

  const FilterSel = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%", padding: "3px 4px", borderRadius: 5, fontSize: 10, fontWeight: 600,
        border: `1px solid ${value ? Z.ultramarine + "60" : Z.border}`,
        background: value ? `${Z.ultramarine}08` : Z.bg,
        color: value ? Z.ultramarine : Z.textMuted,
        outline: "none", cursor: "pointer",
      }}
    >
      <option value="">All</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  const MiniSel = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "4px 6px", borderRadius: 5, fontSize: 11, fontWeight: 600,
        border: `1px solid ${Z.border}`,
        background: value === "completed" || value === "yes" || value === "existing" ? "#10b98112" : "transparent",
        color: value === "completed" || value === "yes" ? "#10b981" : Z.textPrimary,
        outline: "none", cursor: "pointer",
      }}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  const COL_HEADERS = [
    "Business Name", "Deal Type", "Amount", "1st Draft Due", "Website Status",
    "Assigned Designer", "Notes for Designer", "Deal Owner", "Close Date",
    "Launch Fee", "Fee Collected", "Design Brief", "Domain Type", "Google Access",
    "Published URL", "Published Date", "Published By",
    "Social Media", "Ecommerce", "GBP", "Directories", "Landing Pages", "AI Chat", "Blogs",
  ];

  return (
    <div>
      <Toast toast={toast} />

      {/* Tab Nav */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
        {NAV_TABS.map((t) => (
          <Link key={t.href} href={t.href} style={{
            padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700,
            textDecoration: "none",
            background: t.href === "/onboarding/full" ? `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})` : "transparent",
            color: t.href === "/onboarding/full" ? "#fff" : Z.textSecondary,
            border: t.href === "/onboarding/full" ? "none" : `1px solid ${Z.border}`,
          }}>
            {t.label}
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: Z.textPrimary }}>Onboarding</h1>
        <div style={{ fontSize: 13, color: Z.textMuted, fontWeight: 600 }}>{filtered.length} of {rows.length} customers</div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by business or customer name..." />
        </div>
        {hasFilters && (
          <Btn variant="secondary" onClick={() => { setSearch(""); setFilters(emptyFilters); }}>
            Clear Filters
          </Btn>
        )}
      </div>

      {/* Table */}
      <div style={{
        background: Z.card,
        borderRadius: 12,
        border: `1px solid ${Z.border}`,
        overflow: "auto",
        maxHeight: "calc(100vh - 280px)",
      }}>
        <table style={{ width: "max-content", minWidth: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              {COL_HEADERS.map((h) => (
                <th key={h} style={headSt as React.CSSProperties}>{h}</th>
              ))}
            </tr>
            <tr>
              {/* Business Name filter cell — sticky */}
              <td style={{ ...filterSt, position: "sticky" as const, left: 0, zIndex: 3, minWidth: 160 }} />
              <td style={filterSt} />
              <td style={filterSt} />
              <td style={filterSt} />
              <td style={filterSt}>
                <FilterSel value={filters.webStatus} onChange={(v) => setFilter("webStatus", v)}
                  options={WEBSITE_STAGES.map((s) => ({ value: s.value, label: s.label }))} />
              </td>
              <td style={filterSt}>
                <FilterSel value={filters.designer} onChange={(v) => setFilter("designer", v)}
                  options={uniqueDesigners.map((d) => ({ value: d, label: d }))} />
              </td>
              <td style={filterSt} />
              <td style={filterSt}>
                <FilterSel value={filters.dealOwner} onChange={(v) => setFilter("dealOwner", v)}
                  options={uniqueOwners.map((o) => ({ value: o, label: o }))} />
              </td>
              <td style={filterSt} />
              <td style={filterSt} />
              <td style={filterSt}>
                <FilterSel value={filters.feeCollected} onChange={(v) => setFilter("feeCollected", v)} options={yesNoOpts} />
              </td>
              <td style={filterSt}>
                <FilterSel value={filters.designBrief} onChange={(v) => setFilter("designBrief", v)} options={yesNoOpts} />
              </td>
              <td style={filterSt}>
                <FilterSel value={filters.domainType} onChange={(v) => setFilter("domainType", v)}
                  options={[{ value: "new", label: "New" }, { value: "existing", label: "Existing" }]} />
              </td>
              <td style={filterSt}>
                <FilterSel value={filters.googleAccess} onChange={(v) => setFilter("googleAccess", v)} options={yesNoOpts} />
              </td>
              <td style={filterSt} />
              <td style={filterSt} />
              <td style={filterSt} />
              <td style={filterSt}>
                <FilterSel value={filters.socialMedia} onChange={(v) => setFilter("socialMedia", v)} options={yesNoOpts} />
              </td>
              <td style={filterSt}>
                <FilterSel value={filters.ecommerce} onChange={(v) => setFilter("ecommerce", v)} options={yesNoOpts} />
              </td>
              <td style={filterSt}>
                <FilterSel value={filters.gbp} onChange={(v) => setFilter("gbp", v)} options={statusOpts} />
              </td>
              <td style={filterSt}>
                <FilterSel value={filters.directories} onChange={(v) => setFilter("directories", v)} options={statusOpts} />
              </td>
              <td style={filterSt}>
                <FilterSel value={filters.landingPages} onChange={(v) => setFilter("landingPages", v)} options={statusOpts} />
              </td>
              <td style={filterSt}>
                <FilterSel value={filters.aiChat} onChange={(v) => setFilter("aiChat", v)} options={statusOpts} />
              </td>
              <td style={filterSt}>
                <FilterSel value={filters.blogs} onChange={(v) => setFilter("blogs", v)} options={statusOpts} />
              </td>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const websiteItem = getItem(r.items, "website");
              const publishingItem = getItem(r.items, "publishing");
              const webStage = WEBSITE_STAGES.find((s) => s.value === (r.websiteStatus ?? "not_started")) ?? WEBSITE_STAGES[0];
              const gbpStatus = taskStatus(r.items, "gbp");
              const dirStatus = taskStatus(r.items, "directories");
              const lpStatus = taskStatus(r.items, "landing_pages");
              const aiStatus = taskStatus(r.items, "ai_chat");
              const blogStatus = taskStatus(r.items, "blogs");
              const smStatus = taskStatus(r.items, "social_media");
              const ecStatus = taskStatus(r.items, "ecommerce");
              const draftDue = websiteItem?.dueDate ?? null;
              const publishedDate = publishingItem?.completedAt ?? null;
              const publishedBy = publishingItem?.owner ?? null;

              return (
                <tr key={r.onboardingId}
                  onMouseEnter={(e) => (e.currentTarget.style.background = Z.borderLight)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Business Name — sticky */}
                  <td
                    style={{ ...cellSt, fontWeight: 700, color: Z.ultramarine, position: "sticky", left: 0, background: Z.card, zIndex: 1, cursor: "pointer", minWidth: 160 }}
                    onClick={() => r.contactId && router.push(`/contacts/${r.contactId}`)}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                  >
                    <div>{r.businessName ?? r.customerName ?? "—"}</div>
                    {r.businessName && r.customerName && r.businessName !== r.customerName && (
                      <div style={{ fontSize: 10, fontWeight: 500, color: Z.textMuted, marginTop: 2 }}>{r.customerName}</div>
                    )}
                  </td>

                  {/* Deal Type */}
                  <td style={cellSt}>{r.product ? r.product.split(" ")?.[0] : "—"}</td>

                  {/* Amount */}
                  <td style={{ ...cellSt, fontWeight: 700 }}>{r.value ? fmt(r.value) : "—"}</td>

                  {/* 1st Draft Due */}
                  <td style={cellSt}>
                    <input
                      type="date"
                      defaultValue={draftDue ? new Date(draftDue).toISOString().split("T")[0] : ""}
                      onBlur={(e) => {
                        if (websiteItem?.id) {
                          fetch(`/api/onboarding/items/${websiteItem.id}/status`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ dueDate: e.target.value }),
                          }).then(() => refresh());
                        }
                      }}
                      style={{
                        padding: "4px 6px", borderRadius: 5, fontSize: 11,
                        border: `1px solid ${Z.border}`,
                        background: "transparent",
                        color: draftDue && new Date(draftDue) < new Date() ? "#ef4444" : Z.textPrimary,
                        outline: "none",
                      }}
                    />
                  </td>

                  {/* Website Status */}
                  <td style={cellSt}>
                    <select
                      value={r.websiteStatus ?? "not_started"}
                      onChange={(e) => saveField(r.onboardingId, "websiteStatus", e.target.value)}
                      style={{
                        padding: "4px 6px", borderRadius: 5, fontSize: 11, fontWeight: 600,
                        border: `1px solid ${webStage.color}40`,
                        background: `${webStage.color}12`,
                        color: webStage.color,
                        outline: "none", cursor: "pointer",
                      }}
                    >
                      {WEBSITE_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>

                  {/* Assigned Designer */}
                  <td style={cellSt}>
                    <select
                      value={r.offshoreDesigner ?? ""}
                      onChange={(e) => saveField(r.onboardingId, "offshoreDesigner", e.target.value)}
                      style={{
                        padding: "4px 6px", borderRadius: 5, fontSize: 11, fontWeight: 600,
                        border: `1px solid ${Z.border}`, background: "transparent",
                        color: r.offshoreDesigner ? Z.textPrimary : Z.textMuted,
                        outline: "none", cursor: "pointer", minWidth: 120,
                      }}
                    >
                      <option value="">— Assign —</option>
                      {designers.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </td>

                  {/* Notes for Designer */}
                  <td style={{ ...cellSt, cursor: "pointer" }} onClick={() => { setNotesPanel(r.onboardingId); setNotesDraft(""); }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, maxWidth: 140 }}>
                      {r.designerNotes ? (
                        <span style={{ fontSize: 11, color: Z.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
                          {r.designerNotes}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: Z.textMuted, fontStyle: "italic" }}>Add notes...</span>
                      )}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={Z.textMuted} strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </div>
                  </td>

                  {/* Deal Owner */}
                  <td style={cellSt}>{r.rep ?? "—"}</td>

                  {/* Close Date */}
                  <td style={cellSt}>{r.wonDate ? fmtDate(r.wonDate) : "—"}</td>

                  {/* Launch Fee */}
                  <td style={{ ...cellSt, fontWeight: 600 }}>{r.launchFeeAmount ? fmt(r.launchFeeAmount) : "—"}</td>

                  {/* Fee Collected */}
                  <td style={cellSt}>
                    <MiniSel
                      value={r.launchFeeCollected ?? "no"}
                      onChange={(v) => saveField(r.onboardingId, "launchFeeCollected", v)}
                      options={yesNoOpts}
                    />
                  </td>

                  {/* Design Brief */}
                  <td style={cellSt}>
                    <MiniSel
                      value={r.designBrief ?? "no"}
                      onChange={(v) => saveField(r.onboardingId, "designBrief", v)}
                      options={yesNoOpts}
                    />
                  </td>

                  {/* Domain Type */}
                  <td style={cellSt}>
                    <MiniSel
                      value={r.domainType ?? "new"}
                      onChange={(v) => saveField(r.onboardingId, "domainType", v)}
                      options={[{ value: "new", label: "New" }, { value: "existing", label: "Existing" }]}
                    />
                  </td>

                  {/* Google Access */}
                  <td style={cellSt}>
                    <MiniSel
                      value={r.googleAccess ?? "no"}
                      onChange={(v) => saveField(r.onboardingId, "googleAccess", v)}
                      options={yesNoOpts}
                    />
                  </td>

                  {/* Published URL */}
                  <td style={cellSt}>
                    <input
                      type="text"
                      defaultValue={r.domainName ?? ""}
                      onBlur={(e) => saveField(r.onboardingId, "newUrl", e.target.value)}
                      placeholder="URL..."
                      style={{
                        width: 140, padding: "4px 6px", borderRadius: 5, fontSize: 11,
                        border: `1px solid ${Z.border}`, background: "transparent",
                        color: Z.textPrimary, outline: "none",
                      }}
                    />
                  </td>

                  {/* Published Date */}
                  <td style={cellSt}>{publishedDate ? fmtDate(publishedDate) : "—"}</td>

                  {/* Published By */}
                  <td style={cellSt}>{publishedBy ?? "—"}</td>

                  {/* Social Media */}
                  <td style={cellSt}>
                    <MiniSel
                      value={smStatus === "completed" ? "yes" : "no"}
                      onChange={(v) => {
                        const item = getItem(r.items, "social_media");
                        if (item?.id) saveItemStatus(item.id, v === "yes" ? "completed" : "outstanding");
                      }}
                      options={yesNoOpts}
                    />
                  </td>

                  {/* Ecommerce */}
                  <td style={cellSt}>
                    <MiniSel
                      value={ecStatus === "completed" ? "yes" : "no"}
                      onChange={(v) => {
                        const item = getItem(r.items, "ecommerce");
                        if (item?.id) saveItemStatus(item.id, v === "yes" ? "completed" : "outstanding");
                      }}
                      options={yesNoOpts}
                    />
                  </td>

                  {/* GBP */}
                  <td style={cellSt}>
                    <MiniSel
                      value={gbpStatus}
                      onChange={(v) => {
                        const item = getItem(r.items, "gbp");
                        if (item?.id) saveItemStatus(item.id, v);
                      }}
                      options={statusOpts}
                    />
                  </td>

                  {/* Directories */}
                  <td style={cellSt}>
                    <MiniSel
                      value={dirStatus}
                      onChange={(v) => {
                        const item = getItem(r.items, "directories");
                        if (item?.id) saveItemStatus(item.id, v);
                      }}
                      options={statusOpts}
                    />
                  </td>

                  {/* Landing Pages */}
                  <td style={cellSt}>
                    <MiniSel
                      value={lpStatus}
                      onChange={(v) => {
                        const item = getItem(r.items, "landing_pages");
                        if (item?.id) saveItemStatus(item.id, v);
                      }}
                      options={statusOpts}
                    />
                  </td>

                  {/* AI Chat */}
                  <td style={cellSt}>
                    <MiniSel
                      value={aiStatus}
                      onChange={(v) => {
                        const item = getItem(r.items, "ai_chat");
                        if (item?.id) saveItemStatus(item.id, v);
                      }}
                      options={statusOpts}
                    />
                  </td>

                  {/* Blogs */}
                  <td style={cellSt}>
                    <MiniSel
                      value={blogStatus}
                      onChange={(v) => {
                        const item = getItem(r.items, "blogs");
                        if (item?.id) saveItemStatus(item.id, v);
                      }}
                      options={statusOpts}
                    />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={24} style={{ padding: 48, textAlign: "center", color: Z.textMuted, fontSize: 13 }}>
                  No customers match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Notes Panel */}
      {notesPanel && (() => {
        const row = rows.find((r) => r.onboardingId === notesPanel);
        if (!row) return null;
        return (
          <div style={{
            position: "fixed", right: 0, top: 0, bottom: 0, width: 400,
            background: Z.card, borderLeft: `1px solid ${Z.border}`,
            boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
            zIndex: 100, display: "flex", flexDirection: "column",
          }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${Z.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: Z.textPrimary }}>{row.businessName ?? row.customerName}</div>
                <div style={{ fontSize: 12, color: Z.textMuted, marginTop: 2 }}>Notes for Designer</div>
              </div>
              <button onClick={() => setNotesPanel(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: Z.textMuted }}>×</button>
            </div>
            <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
              {row.designerNotes && (
                <div style={{ marginBottom: 16, padding: "12px 14px", background: Z.bg, borderRadius: 8, fontSize: 13, color: Z.textPrimary, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {row.designerNotes}
                </div>
              )}
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Add a note for the designer..."
                rows={4}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 8,
                  border: `1px solid ${Z.border}`, background: Z.bg,
                  color: Z.textPrimary, fontSize: 13, resize: "vertical",
                  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${Z.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={() => { setNotesPanel(null); setNotesDraft(""); }}>Cancel</Btn>
              <Btn onClick={async () => {
                const existing = row.designerNotes ?? "";
                const combined = existing ? `${existing}\n${notesDraft}` : notesDraft;
                await saveField(notesPanel, "designerNotes", combined);
                setNotesDraft("");
                setNotesPanel(null);
              }}>Save Note</Btn>
            </div>
          </div>
        );
      })()}

      {/* Suppress unused var warning */}
      {saving && null}
    </div>
  );
}
