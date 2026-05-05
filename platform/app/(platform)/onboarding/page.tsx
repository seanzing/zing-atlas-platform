"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Badge, StatCard, SearchBar, Btn } from "@/components/ui";
import { PageLoader } from "@/components/PageLoader";
import { Toast, useToast } from "@/components/Toast";
import { NewSaleModal } from "@/components/NewSaleModal";
import { Z } from "@/lib/constants";
import { mutate } from "swr";

interface OnboardingItem {
  id: string;
  itemName: string | null;
  taskType: string | null;
  ownerRole: string | null;
  currentStatus: string | null;
  statusOptions: { value: string; label: string }[] | null;
  stage: string | null;
  owner: string | null;
  dueDate: string | null;
  completedAt: string | null;
  isActive: boolean;
  notes: string | null;
}

interface Onboarding {
  id: string;
  customerName: string | null;
  businessName: string | null;
  rep: string | null;
  wonDate: string | null;
  status: string | null;
  items: OnboardingItem[];
  product?: { description: string } | null;
}

const ROLE_COLORS: Record<string, string> = {
  designer: Z.violet,
  onboarding_specialist: Z.bluejeans,
  marketing: Z.turquoise,
  publishing: Z.ultramarine,
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getStatusLabel(options: { value: string; label: string }[] | null, value: string | null): string {
  if (!options || !value) return value ?? "—";
  const found = options.find((o) => o.value === value);
  return found?.label ?? value;
}

const NAV_TABS = [
  { label: "By Customer", href: "/onboarding" },
  { label: "By Task", href: "/onboarding/by-task" },
  { label: "Full View", href: "/onboarding/full" },
  { label: "Work Funnel", href: "/onboarding/funnel" },
];

export default function OnboardingByCustomerPage() {
  const { data: onboardings } = useSWR<Onboarding[]>("/api/onboarding?status=active");
  const [search, setSearch] = useState("");
  const [selectedOb, setSelectedOb] = useState<Onboarding | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [, setSavingNote] = useState<string | null>(null);
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [creatingPixelSite, setCreatingPixelSite] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  if (!onboardings) return <PageLoader />;

  const list = onboardings ?? [];

  // Stats
  const totalActive = list.length;
  const now = new Date();
  const allItems = list.flatMap((o) => o.items);
  const onTrack = allItems.filter((i) => i.dueDate && new Date(i.dueDate) >= now && i.stage !== "complete").length;
  const overdue = allItems.filter((i) => i.dueDate && new Date(i.dueDate) < now && i.stage !== "complete").length;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const publishedThisMonth = allItems.filter(
    (i) => i.taskType === "publishing" && i.completedAt && new Date(i.completedAt) >= monthStart
  ).length;

  // Filter
  const filtered = list.filter((o) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (o.businessName ?? "").toLowerCase().includes(q) ||
      (o.customerName ?? "").toLowerCase().includes(q) ||
      (o.rep ?? "").toLowerCase().includes(q)
    );
  });

  function getDesigner(ob: Onboarding): string {
    const websiteItem = ob.items.find((i) => i.taskType === "website");
    return websiteItem?.owner ?? "—";
  }

  function getProgress(ob: Onboarding): { done: number; total: number } {
    const total = ob.items.length;
    const done = ob.items.filter((i) => i.stage === "complete").length;
    return { done, total };
  }

  function getDerivedStatus(ob: Onboarding): { label: string; color: string } {
    const hasOverdue = ob.items.some((i) => i.dueDate && new Date(i.dueDate) < now && i.stage !== "complete");
    const allComplete = ob.items.every((i) => i.stage === "complete");
    if (allComplete) return { label: "Complete", color: "#10b981" };
    if (hasOverdue) return { label: "Overdue", color: "#ef4444" };
    return { label: "In Progress", color: Z.bluejeans };
  }

  async function saveNote(itemId: string, notes: string) {
    setSavingNote(itemId);
    try {
      const res = await fetch(`/api/onboarding/items/${itemId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "note_only", notes }),
      });
      if (!res.ok) {
        console.error("Failed to save note:", res.status);
      }
    } catch (err) {
      console.error("Failed to save note:", err);
    }
    setSavingNote(null);
  }

  async function updateItemStatus(itemId: string, status: string) {
    try {
      const res = await fetch(`/api/onboarding/items/${itemId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        showToast("Failed to update status", false);
        return;
      }
      mutate("/api/onboarding?status=active");
      // Update selectedOb in place for immediate UI feedback
      if (selectedOb) {
        const updated = {
          ...selectedOb,
          items: selectedOb.items.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  currentStatus: status,
                  stage: status.includes("completed") || status.includes("published") ? "complete" : "in_progress",
                  completedAt: status.includes("completed") || status.includes("published") ? new Date().toISOString() : null,
                }
              : i
          ),
        };
        setSelectedOb(updated);
      }
    } catch {
      showToast("Failed to update status", false);
    }
  }

  async function markComplete(itemId: string) {
    try {
      const res = await fetch(`/api/onboarding/items/${itemId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (!res.ok) {
        showToast("Failed to mark complete", false);
        return;
      }
      mutate("/api/onboarding?status=active");
      if (selectedOb) {
        const updated = {
          ...selectedOb,
          items: selectedOb.items.map((i) =>
            i.id === itemId
              ? { ...i, currentStatus: "completed", stage: "complete", completedAt: new Date().toISOString() }
              : i
          ),
        };
        setSelectedOb(updated);
      }
      showToast("Task marked complete", true);
    } catch {
      showToast("Failed to mark complete", false);
    }
  }

  async function handleCreatePixelSite(obId: string) {
    setCreatingPixelSite(obId);
    try {
      const res = await fetch(`/api/onboarding/${obId}/create-pixel-site`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Could not create site in Pixel. Try again or create manually.", false);
        return;
      }
      const data = await res.json();
      mutate("/api/onboarding?status=active");
      // Update selectedOb
      if (selectedOb) {
        const updated = {
          ...selectedOb,
          items: selectedOb.items.map((i) =>
            i.taskType === "website"
              ? { ...i, currentStatus: "in_progress", stage: "in_progress", notes: JSON.stringify({ pixelSiteId: data.siteId }) }
              : i
          ),
        };
        setSelectedOb(updated);
      }
      showToast("Site created in Pixel", true);
    } catch {
      showToast("Could not create site in Pixel. Try again or create manually.", false);
    } finally {
      setCreatingPixelSite(null);
    }
  }

  function getPixelSiteId(ob: Onboarding): string | null {
    const websiteItem = ob.items.find((i) => i.taskType === "website");
    if (!websiteItem?.notes) return null;
    try {
      const parsed = JSON.parse(websiteItem.notes);
      return parsed.pixelSiteId ?? null;
    } catch {
      return null;
    }
  }

  return (
    <div>
      {/* Tab Nav */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
        {NAV_TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              background: t.href === "/onboarding" ? `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})` : "transparent",
              color: t.href === "/onboarding" ? "#fff" : Z.textSecondary,
              border: t.href === "/onboarding" ? "none" : `1px solid ${Z.border}`,
            }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Onboarding</h1>
        <Btn onClick={() => setNewSaleOpen(true)}>+ New Sale</Btn>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard label="Total Active" value={totalActive} accent={Z.ultramarine} />
        <StatCard label="On Track" value={onTrack} accent={Z.turquoise} />
        <StatCard label="Overdue" value={overdue} accent="#ef4444" />
        <StatCard label="Published This Month" value={publishedThisMonth} accent="#10b981" />
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by business, customer, or rep..." />
      </div>

      {/* Table */}
      <div style={{ background: Z.card, borderRadius: 16, border: `1px solid ${Z.border}`, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 0.8fr 0.8fr 1fr 0.8fr 0.8fr",
            padding: "14px 20px",
            fontSize: 11,
            fontWeight: 700,
            color: Z.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            borderBottom: `1px solid ${Z.border}`,
          }}
        >
          <div>Business Name</div>
          <div>Customer</div>
          <div>Product</div>
          <div>Designer</div>
          <div>Progress</div>
          <div>Status</div>
          <div>Won Date</div>
        </div>

        {filtered.map((ob) => {
          const prog = getProgress(ob);
          const st = getDerivedStatus(ob);
          const pct = prog.total > 0 ? (prog.done / prog.total) * 100 : 0;
          return (
            <div
              key={ob.id}
              onClick={() => { setSelectedOb(ob); setPanelOpen(true); }}
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr 0.8fr 0.8fr 1fr 0.8fr 0.8fr",
                padding: "14px 20px",
                fontSize: 13,
                borderBottom: `1px solid ${Z.borderLight}`,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = Z.bg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ fontWeight: 700 }}>{ob.businessName ?? "—"}</div>
              <div style={{ color: Z.textSecondary }}>{ob.customerName ?? "—"}</div>
              <div><Badge label={ob.product?.description?.split(" - ")[0] ?? "—"} color={Z.ultramarine} /></div>
              <div style={{ color: Z.textSecondary }}>{getDesigner(ob)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: Z.borderLight, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: Z.turquoise, borderRadius: 3, transition: "width 0.3s" }} />
                </div>
                <span style={{ fontSize: 11, color: Z.textMuted, whiteSpace: "nowrap" }}>{prog.done}/{prog.total}</span>
              </div>
              <div><Badge label={st.label} color={st.color} /></div>
              <div style={{ color: Z.textMuted, fontSize: 12 }}>{fmtDate(ob.wonDate)}</div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: Z.textMuted }}>No onboarding records found</div>
        )}
      </div>

      {/* Slide-out Panel */}
      <NewSaleModal
        open={newSaleOpen}
        onClose={() => setNewSaleOpen(false)}
        onSuccess={(biz) => {
          setNewSaleOpen(false);
          showToast(`Onboarding created for ${biz}`, true);
          mutate("/api/onboarding?status=active");
        }}
      />

      {panelOpen && selectedOb && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
          <div
            onClick={() => setPanelOpen(false)}
            style={{ position: "absolute", inset: 0, background: "rgba(5,5,54,0.3)", backdropFilter: "blur(2px)" }}
          />
          <div
            style={{
              position: "relative",
              width: 560,
              background: Z.card,
              borderLeft: `1px solid ${Z.border}`,
              overflowY: "auto",
              padding: "28px 32px",
              boxShadow: "-8px 0 40px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{selectedOb.businessName}</div>
                <div style={{ fontSize: 13, color: Z.textSecondary }}>{selectedOb.customerName}</div>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                style={{ background: "none", border: "none", color: Z.textMuted, cursor: "pointer", fontSize: 18 }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: Z.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
              Tasks ({selectedOb.items.length})
            </div>

            {selectedOb.items.map((item) => {
              const statusLabel = getStatusLabel(item.statusOptions, item.currentStatus);
              const isOverdue = item.dueDate && new Date(item.dueDate) < now && item.stage !== "complete";
              const isComplete = item.stage === "complete";
              const statusColor = isComplete ? "#10b981" : isOverdue ? "#ef4444" : Z.bluejeans;
              const pixelSiteId = getPixelSiteId(selectedOb);

              return (
                <div
                  key={item.id}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 10,
                    border: `1px solid ${Z.border}`,
                    marginBottom: 8,
                    background: isComplete ? "#10b98108" : isOverdue ? "#ef444408" : "transparent",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{item.itemName}</span>
                      {item.ownerRole && (
                        <Badge label={item.ownerRole.replace("_", " ")} color={ROLE_COLORS[item.ownerRole] ?? Z.grey} />
                      )}
                    </div>
                    {/* Status dropdown — saves immediately on change */}
                    {item.statusOptions && item.statusOptions.length > 0 ? (
                      <select
                        value={item.currentStatus ?? ""}
                        onChange={(e) => updateItemStatus(item.id, e.target.value)}
                        style={{
                          padding: "3px 8px",
                          borderRadius: 6,
                          border: `1px solid ${statusColor}40`,
                          background: `${statusColor}12`,
                          color: statusColor,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          outline: "none",
                        }}
                      >
                        {item.statusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Badge label={statusLabel} color={statusColor} />
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 11, color: Z.textMuted }}>
                    <span>Due: {fmtDate(item.dueDate)}</span>
                    {item.owner && <span>Owner: {item.owner}</span>}
                    {item.completedAt && <span>Completed: {fmtDate(item.completedAt)}</span>}
                  </div>

                  {/* Task 2: Website → Pixel integration */}
                  {item.taskType === "website" && (
                    <div style={{ marginTop: 8 }}>
                      {item.currentStatus === "not_started" || item.currentStatus === "pending" || !item.currentStatus ? (
                        <button
                          onClick={() => handleCreatePixelSite(selectedOb.id)}
                          disabled={creatingPixelSite === selectedOb.id}
                          style={{
                            padding: "6px 14px",
                            borderRadius: 8,
                            border: "none",
                            background: `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`,
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: creatingPixelSite === selectedOb.id ? "not-allowed" : "pointer",
                            opacity: creatingPixelSite === selectedOb.id ? 0.6 : 1,
                          }}
                        >
                          {creatingPixelSite === selectedOb.id ? "Creating..." : "Create Site in Pixel \u2192"}
                        </button>
                      ) : (
                        <a
                          href={
                            pixelSiteId
                              ? `https://pixel.yourwebsiteexample.com/dashboard/sites/${pixelSiteId}`
                              : "https://pixel.yourwebsiteexample.com"
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-block",
                            padding: "6px 14px",
                            borderRadius: 8,
                            background: `${Z.ultramarine}12`,
                            color: Z.ultramarine,
                            fontSize: 12,
                            fontWeight: 700,
                            textDecoration: "none",
                          }}
                        >
                          Open in Pixel {"\u2192"}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Task 3: Landing pages → Pixel location generator */}
                  {item.taskType === "landing_pages" && (
                    <div style={{ marginTop: 8 }}>
                      {pixelSiteId ? (
                        <a
                          href={`https://pixel.yourwebsiteexample.com/dashboard/sites/${pixelSiteId}/locations`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-block",
                            padding: "6px 14px",
                            borderRadius: 8,
                            background: `${Z.turquoise}12`,
                            color: Z.turquoise,
                            fontSize: 12,
                            fontWeight: 700,
                            textDecoration: "none",
                          }}
                        >
                          Generate Location Pages {"\u2192"}
                        </a>
                      ) : (
                        <span
                          title="Build website first"
                          style={{
                            display: "inline-block",
                            padding: "6px 14px",
                            borderRadius: 8,
                            background: Z.bg,
                            color: Z.textMuted,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "not-allowed",
                            opacity: 0.5,
                          }}
                        >
                          Generate Location Pages {"\u2192"}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Task 4: Mark Complete button */}
                  {item.stage !== "complete" && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        onClick={() => markComplete(item.id)}
                        style={{
                          padding: "4px 12px",
                          borderRadius: 6,
                          border: `1px solid #10b98140`,
                          background: "#10b98112",
                          color: "#10b981",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Mark Complete
                      </button>
                    </div>
                  )}

                  {/* Notes textarea */}
                  <textarea
                    defaultValue={item.notes ?? ""}
                    placeholder="Add notes..."
                    onBlur={(e) => {
                      if (e.target.value !== (item.notes ?? "")) {
                        saveNote(item.id, e.target.value);
                      }
                    }}
                    style={{
                      width: "100%",
                      marginTop: 8,
                      padding: "8px 10px",
                      fontSize: 12,
                      border: `1px solid ${Z.borderLight}`,
                      borderRadius: 6,
                      background: Z.bg,
                      color: Z.textPrimary,
                      resize: "vertical",
                      minHeight: 36,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
      <Toast toast={toast} />
    </div>
  );
}
