"use client";

import { Badge, StatCard, Btn, Modal, FormField, Input, Select, FilterBtn } from "@/components/ui";
import { Z, fmt, STAGES, PRIORITY_COLORS, PRODUCT_COLORS } from "@/lib/constants";
import { useAuthContext } from "@/lib/auth-context";
import { PageLoader } from "@/components/PageLoader";
import { Toast, useToast } from "@/components/Toast";
import useSWR, { mutate } from "swr";
import { useState, useMemo, useCallback, useEffect, DragEvent } from "react";
import Link from "next/link";
import { WonDealModal } from "@/components/WonDealModal";
import FloatingEmailCompose from "@/components/FloatingEmailCompose";
import ContactLink from "@/components/ContactLink";
import { CopyableText } from "@/components/CopyableText";

// Inline contact search for Add Lead modal
type ContactSearchResult = { id: string; name: string | null; company: string | null; email: string | null };
function ContactSearchResults({ query, contacts, onSelect }: {
  query: string;
  contacts: ContactSearchResult[];
  onSelect: (id: string, name: string) => void;
}) {
  const q = query.toLowerCase();
  const results = contacts.filter((c) =>
    c.name?.toLowerCase().includes(q) ||
    c.company?.toLowerCase().includes(q) ||
    c.email?.toLowerCase().includes(q)
  ).slice(0, 6);
  if (!results.length) return <div style={{ fontSize: 12, color: Z.textMuted, marginTop: 4 }}>No matches found</div>;
  return (
    <div style={{ border: `1px solid ${Z.border}`, borderRadius: 8, marginTop: 4, overflow: "hidden", background: "#fff", position: "absolute", zIndex: 50, width: "100%" }}>
      {results.map((c) => (
        <button key={c.id} onClick={() => onSelect(c.id, c.name || c.company || "")} style={{ width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 13, background: "none", border: "none", borderBottom: `1px solid ${Z.borderLight}`, cursor: "pointer" }}>
          <span style={{ fontWeight: 600 }}>{c.name || "—"}</span>
          {c.company && <span style={{ color: Z.textMuted, marginLeft: 6 }}>{c.company}</span>}
          {c.email && <span style={{ color: Z.textMuted, marginLeft: 6, fontSize: 11 }}>{c.email}</span>}
        </button>
      ))}
    </div>
  );
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error: ${r.status}`);
    return r.json();
  });

/* ── helpers ── */

function countBizDays(from: Date, to: Date): number {
  let count = 0;
  const d = new Date(from);
  while (d <= to) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count || 1;
}

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function getPresetRange(preset: string): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case "this-month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "last-month": {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { from: d, to: endOfMonth(d) };
    }
    case "last-7": {
      const f = new Date(now);
      f.setDate(f.getDate() - 6);
      return { from: f, to: now };
    }
    case "last-30": {
      const f = new Date(now);
      f.setDate(f.getDate() - 29);
      return { from: f, to: now };
    }
    case "ytd":
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    default:
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Deal = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TeamMember = any;

const DEPT_TABS = ["Reps", "Designer", "Publishing", "Accounts", "Support", "Marketing", "Referrals"] as const;
type DeptTab = typeof DEPT_TABS[number];

/* ── main component ── */

export default function PipelinePage() {
  const { user } = useAuthContext();
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(toYMD(startOfMonth(now)));
  const [dateTo, setDateTo] = useState(toYMD(endOfMonth(now)));
  const [activePreset, setActivePreset] = useState("this-month");
  // Sales reps default to their own tab; admins see All
  const myRepName = user?.teamMember
    ? `${user.teamMember.firstName || ""} ${user.teamMember.lastName || ""}`.trim()
    : "";
  const isSalesRep = user?.teamMember?.role?.toLowerCase().includes("sales") || user?.teamMember?.role?.toLowerCase().includes("rep");
  const [activeRep, setActiveRep] = useState("All");

  // Once user loads, default sales reps to their own tab
  useEffect(() => {
    if (isSalesRep && myRepName) {
      setActiveRep(myRepName);
    }
  }, [isSalesRep, myRepName]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [wonModalDeal, setWonModalDeal] = useState<Deal | null>(null);
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [addLeadOpen, setAddLeadOpen] = useState(false);

  // Add Lead modal state
  const [leadName, setLeadName] = useState("");
  const [leadCompany, setLeadCompany] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadStage, setLeadStage] = useState("call-now");
  const [leadRep, setLeadRep] = useState("");
  const [leadContactSearch, setLeadContactSearch] = useState("");
  const [leadContactId, setLeadContactId] = useState("");
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [dragDealId, setDragDealId] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<"sms" | "email" | "calendar">("sms");


  // Notes state for slide-out panel
  // Department notes tab
  const [activeDeptTab, setActiveDeptTab] = useState<DeptTab>("Reps");
  const [deptNotes, setDeptNotes] = useState<Record<string, { notes: {id:string;author:string|null;content:string;createdAt:string}[]; count: number }>>({});
  const [deptNoteInput, setDeptNoteInput] = useState("");
  const [deptNoteSaving, setDeptNoteSaving] = useState(false);
  // Email compose
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [emailComposeTo, setEmailComposeTo] = useState<{ id: string; name: string; email: string } | null>(null);
  // BoldSign contract modal
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractSending, setContractSending] = useState(false);
  const { toast, showToast } = useToast();

  /* ── data fetching ── */
  const repParam = activeRep !== "All" ? `&rep=${activeRep}` : "";
  const pipelineUrl = `/api/pipeline?from=${dateFrom}&to=${dateTo}${repParam}`;
  // Pipeline API available but we use allDeals with client-side filtering for Kanban
  useSWR<Deal[]>(pipelineUrl, fetcher); // warm cache
  const { data: allDeals } = useSWR<Deal[]>("/api/deals", fetcher);
  const { data: allContacts } = useSWR<ContactSearchResult[]>("/api/contacts", fetcher);
  const { data: teamMembers } = useSWR<TeamMember[]>("/api/team", fetcher);
  // products and designers are fetched inside WonDealModal — not needed here

  const salesTeam = useMemo(
    () =>
      (teamMembers ?? []).filter(
        (m: TeamMember) => m.position === "sales_rep" || !m.position || m.role?.toLowerCase().includes("sales") || m.role?.toLowerCase().includes("rep")
      ),
    [teamMembers]
  );

  /* ── build visible deals: won deals filtered by date range, active pipeline always visible ── */
  const visibleDeals = useMemo(() => {
    const deals = allDeals ?? [];
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    const filtered = deals.filter((d: Deal) => {
      // Filter by rep
      if (activeRep !== "All" && d.rep !== activeRep) return false;

      if (d.stage === "won") {
        // Won deals filtered by date range
        const parseDate = (s: string) => new Date(s.includes("T") ? s : s + "T12:00:00Z");
        const wonDate = d.wonDate ? parseDate(d.wonDate) : d.createdAt ? new Date(d.createdAt) : null;
        if (!wonDate) return true;
        return wonDate >= from && wonDate <= to;
      }
      // Active pipeline deals always visible
      return true;
    });

    return filtered;
  }, [allDeals, dateFrom, dateTo, activeRep]);

  /* ── stats computation ── */
  const stats = useMemo(() => {
    const deals = visibleDeals;
    const wonDeals = deals.filter((d: Deal) => d.stage === "won");
    const totalWonValue = wonDeals.reduce(
      (s: number, d: Deal) => s + Number(d.value || 0),
      0
    );
    const avgMrr = wonDeals.length ? totalWonValue / wonDeals.length : 0;
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const bizDays = countBizDays(from, to);

    // Subscription MRR: consider all won deals as subscription
    const subscriptionMRR = totalWonValue;
    const mrrPerBizDay = subscriptionMRR / bizDays;

    const apptCount = deals.filter(
      (d: Deal) => d.stage === "appointment" || d.stage === "marketing-appt"
    ).length;

    return {
      avgMrr,
      mrrPerBizDay,
      wonCount: wonDeals.length,
      apptCount,
    };
  }, [visibleDeals, dateFrom, dateTo]);

  /* ── deals by stage for kanban ── */
  const dealsByStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    STAGES.forEach((s) => (map[s.key] = []));
    visibleDeals.forEach((d: Deal) => {
      const stage = d.stage || "active";
      if (map[stage]) map[stage].push(d);
    });
    return map;
  }, [visibleDeals]);

  /* ── product breakdown ── */
  const productBreakdown = useMemo(() => {
    const map: Record<string, { name: string; count: number; total: number; productId: string }> = {};
    visibleDeals.forEach((d: Deal) => {
      const pName = d.product?.description || "Unknown";
      const pId = d.productId || "unknown";
      if (!map[pId]) map[pId] = { name: pName, count: 0, total: 0, productId: pId };
      map[pId].count++;
      map[pId].total += Number(d.value || 0);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [visibleDeals]);

  /* ── rep deal counts — active pipeline only (excludes won) ── */
  const repDealCounts = useMemo(() => {
    const pipelineDeals = (allDeals ?? []).filter((d: Deal) => d.stage !== "won");
    const map: Record<string, number> = { All: pipelineDeals.length };
    pipelineDeals.forEach((d: Deal) => {
      if (d.rep) {
        map[d.rep] = (map[d.rep] || 0) + 1;
      }
    });
    return map;
  }, [allDeals]);

  /* ── team leaderboard data ── */
  const leaderboard = useMemo(() => {
    return salesTeam.map((m: TeamMember, idx: number) => {
      const repName = `${m.firstName} ${m.lastName || ""}`.trim();
      const repDeals = visibleDeals.filter((d: Deal) => d.rep === repName);
      const wonDeals = repDeals.filter((d: Deal) => d.stage === "won");
      const totalRevenue = wonDeals.reduce(
        (s: number, d: Deal) => s + Number(d.value || 0),
        0
      );
      const apptCount = repDeals.filter(
        (d: Deal) => d.stage === "appointment" || d.stage === "marketing-appt"
      ).length;
      const target = Number(m.monthlyTarget || 10000);
      return {
        ...m,
        index: idx,
        totalRevenue,
        dealCount: wonDeals.length,
        apptCount,
        target,
        progress: Math.min((totalRevenue / target) * 100, 100),
      };
    });
  }, [salesTeam, visibleDeals]);

  /* ── handlers ── */

  const handlePreset = useCallback((preset: string) => {
    setActivePreset(preset);
    const range = getPresetRange(preset);
    setDateFrom(toYMD(range.from));
    setDateTo(toYMD(range.to));
  }, []);

  const handleDragStart = useCallback((e: DragEvent, dealId: string) => {
    setDragDealId(dealId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent, targetStage: string) => {
      e.preventDefault();
      if (!dragDealId) return;

      const deal = visibleDeals.find((d: Deal) => d.id === dragDealId);
      if (!deal || deal.stage === targetStage) {
        setDragDealId(null);
        return;
      }

      if (targetStage === "won") {
        // Show won modal instead of direct update
        setWonModalDeal(deal);
        setDragDealId(null);
        return;
      }

      try {
        await fetch(`/api/deals/${dragDealId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: targetStage }),
        });
        mutate(pipelineUrl);
        mutate("/api/deals");
      } catch {
        showToast("Failed to update deal stage", false);
      }
      setDragDealId(null);
    },
    [dragDealId, visibleDeals, pipelineUrl, showToast]
  );

  const handleStageChange = useCallback(
    async (deal: Deal, newStage: string) => {
      if (deal.stage === newStage) return;
      if (newStage === "won") {
        setWonModalDeal(deal);
        return;
      }
      try {
        await fetch(`/api/deals/${deal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: newStage }),
        });
        mutate(pipelineUrl);
        mutate("/api/deals");
        if (selectedDeal?.id === deal.id) {
          setSelectedDeal({ ...deal, stage: newStage });
        }
      } catch {
        showToast("Failed to update deal stage", false);
      }
    },
    [pipelineUrl, selectedDeal, showToast]
  );

  const handleRepAssign = useCallback(async (dealId: string, rep: string) => {
    await fetch(`/api/deals/${dealId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rep }),
    });
    mutate(pipelineUrl);
    mutate("/api/deals");
    if (selectedDeal?.id === dealId) setSelectedDeal((d: Deal | null) => d ? { ...d, rep } : d);
  }, [pipelineUrl, selectedDeal]);

  const submitAddLead = useCallback(async () => {
    if (!leadName.trim() && !leadCompany.trim()) return;
    setLeadSubmitting(true);
    try {
      let contactId = leadContactId || undefined;

      // Create new contact if not linking existing
      if (!contactId && (leadName.trim() || leadEmail.trim())) {
        const cRes = await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: leadName.trim() || leadCompany.trim(),
            company: leadCompany.trim() || undefined,
            email: leadEmail.trim() || undefined,
            phone: leadPhone.trim() || undefined,
          }),
        });
        if (cRes.ok) {
          const c = await cRes.json();
          contactId = c.id;
        }
      }

      const dealRes = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: leadCompany.trim() || leadName.trim(),
          contactName: leadName.trim() || undefined,
          company: leadCompany.trim() || undefined,
          contactId: contactId || undefined,
          stage: leadStage,
          rep: leadRep || undefined,
        }),
      });

      if (!dealRes.ok) {
        const err = await dealRes.json().catch(() => ({}));
        showToast((err as { error?: string }).error || `Failed to create lead (${dealRes.status})`, false);
        return;
      }

      await mutate("/api/deals");
      mutate(pipelineUrl);
      mutate("/api/contacts");
      setAddLeadOpen(false);
      setLeadName(""); setLeadCompany(""); setLeadEmail(""); setLeadPhone("");
      setLeadStage("call-now"); setLeadRep(""); setLeadContactSearch(""); setLeadContactId("");
      showToast("Lead added", true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add lead", false);
    } finally {
      setLeadSubmitting(false);
    }
  }, [leadName, leadCompany, leadEmail, leadPhone, leadStage, leadRep, leadContactId, pipelineUrl, showToast]);



  async function loadDeptNotes(dealId: string) {
    try {
      const res = await fetch(`/api/deals/${dealId}/notes`);
      if (!res.ok) return;
      const data = await res.json();
      setDeptNotes(data.grouped || {});
    } catch { /* non-fatal */ }
  }

  async function submitDeptNote(deal: Deal) {
    if (!deptNoteInput.trim()) return;
    setDeptNoteSaving(true);
    const noteContent = deptNoteInput.trim();
    try {
      await fetch(`/api/deals/${deal.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department: activeDeptTab, content: noteContent }),
      });
      // Mirror note to contact record so it appears on the contact page
      if (deal.contactId) {
        fetch(`/api/contacts/${deal.contactId}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: `[${activeDeptTab}] ${noteContent}` }),
        }).catch(() => {}); // non-fatal
      }
      setDeptNoteInput("");
      await loadDeptNotes(deal.id);
    } catch { showToast("Failed to save note", false); }
    setDeptNoteSaving(false);
  }

  const repOptions = useMemo(
    () => [
      { value: "", label: "Select rep..." },
      ...salesTeam.map((m: TeamMember) => ({
        value: `${m.firstName} ${m.lastName || ""}`.trim(),
        label: `${m.firstName} ${m.lastName || ""}`.trim(),
      })),
    ],
    [salesTeam]
  );

  const maxProductTotal = useMemo(
    () => Math.max(...productBreakdown.map((p) => p.total), 1),
    [productBreakdown]
  );

  /* ── Preset buttons config ── */
  const presets = [
    { key: "this-month", label: "This Month" },
    { key: "last-month", label: "Last Month" },
    { key: "last-7", label: "Last 7 Days" },
    { key: "last-30", label: "Last 30 Days" },
    { key: "ytd", label: "YTD" },
  ];

  /* ─────────── RENDER ─────────── */

  if (!allDeals) return <PageLoader />;

  return (
    <div style={{ padding: "0 8px 32px", maxWidth: "100%", overflow: "hidden" }}>
      {/* ── 1. Page Header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
              Sales Pipeline
            </h1>
            <p style={{ fontSize: 14, color: Z.textSecondary, margin: "4px 0 0" }}>
              Track and manage your deals
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => setNewSaleOpen(true)}>+ New Sale</Btn>
            <Btn variant="secondary" onClick={() => setAddLeadOpen(true)}>+ Add Lead</Btn>
          </div>
        </div>
      </div>

      {/* ── 2. Rep Tabs ── */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 8,
          marginBottom: 20,
          scrollbarWidth: "thin",
        }}
      >
        {["All", ...salesTeam.map((m: TeamMember) => `${m.firstName} ${m.lastName || ""}`.trim())].map(
          (name: string) => {
            const isActive = activeRep === name;
            const count = repDealCounts[name] || 0;
            const initials =
              name === "All"
                ? "A"
                : name
                    .split(" ")
                    .filter(Boolean)
                    .map((w: string) => w[0])
                    .join("")
                    .toUpperCase() || "?";
            return (
              <button
                key={name}
                onClick={() => setActiveRep(name)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: isActive ? "none" : `1px solid ${Z.border}`,
                  background: isActive
                    ? `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`
                    : Z.card,
                  color: isActive ? "#fff" : Z.textSecondary,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  boxShadow: isActive
                    ? `0 4px 16px ${Z.ultramarine}40`
                    : "none",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: isActive
                      ? "rgba(255,255,255,0.25)"
                      : Z.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 800,
                    color: isActive ? "#fff" : Z.textMuted,
                  }}
                >
                  {initials}
                </div>
                {name}
                <span
                  style={{
                    background: isActive
                      ? "rgba(255,255,255,0.25)"
                      : Z.bg,
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                    color: isActive ? "#fff" : Z.textMuted,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          }
        )}
      </div>

      {/* ── 3. Date Range Picker ── */}
      <div
        style={{
          background: Z.card,
          borderRadius: 16,
          border: `1px solid ${Z.border}`,
          padding: "16px 20px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: Z.textPrimary,
            marginRight: 8,
          }}
        >
          Won Deals
        </span>
        {presets.map((p) => (
          <FilterBtn
            key={p.key}
            active={activePreset === p.key}
            label={p.label}
            onClick={() => handlePreset(p.key)}
          />
        ))}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginLeft: "auto",
          }}
        >
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setActivePreset("custom");
            }}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1px solid ${Z.border}`,
              fontSize: 12,
              color: Z.textPrimary,
              background: Z.bg,
              outline: "none",
            }}
          />
          <span style={{ color: Z.textMuted, fontSize: 12 }}>to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setActivePreset("custom");
            }}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1px solid ${Z.border}`,
              fontSize: 12,
              color: Z.textPrimary,
              background: Z.bg,
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* ── 4. Stat Cards ── */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <StatCard
          label="Avg MRR / Deal"
          value={fmt(stats.avgMrr)}
          accent={Z.ultramarine}
        />
        <StatCard
          label="MRR / Biz Day"
          value={fmt(stats.mrrPerBizDay)}
          sub={`${countBizDays(new Date(dateFrom), new Date(dateTo))} business days in period`}
          accent={Z.violet}
        />
        <StatCard
          label="Won in Period"
          value={stats.wonCount}
          accent="#10b981"
        />
        <StatCard
          label="Appointments"
          value={stats.apptCount}
          sub="appointment + marketing-appt"
          accent={Z.turquoise}
        />
      </div>

      {/* ── 5. Team Leaderboard (only when All) ── */}
      {activeRep === "All" && leaderboard.length > 0 && (
        <div
          style={{
            background: Z.card,
            borderRadius: 16,
            border: `1px solid ${Z.border}`,
            padding: 20,
            marginBottom: 24,
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
            Team Leaderboard
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {leaderboard.map((rep: typeof leaderboard[0]) => (
              <div
                key={rep.id}
                onClick={() => setActiveRep(`${rep.firstName} ${rep.lastName || ""}`.trim())}
                style={{
                  background: Z.bg,
                  borderRadius: 12,
                  padding: 16,
                  cursor: "pointer",
                  border: `1px solid ${Z.borderLight}`,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = Z.ultramarine;
                  e.currentTarget.style.boxShadow = `0 2px 12px ${Z.ultramarine}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = Z.borderLight;
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    {(rep.firstName?.[0] || "")}{(rep.lastName?.[0] || "")}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: Z.textPrimary,
                      }}
                    >
                      {rep.firstName} {rep.lastName || ""}
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: Z.textPrimary,
                      }}
                    >
                      {fmt(rep.totalRevenue)}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    fontSize: 11,
                    color: Z.textMuted,
                    marginBottom: 8,
                  }}
                >
                  <span>
                    <strong style={{ color: Z.textSecondary }}>{rep.dealCount}</strong>{" "}
                    deals
                  </span>
                  <span>
                    <strong style={{ color: Z.textSecondary }}>{rep.apptCount}</strong>{" "}
                    appts
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 3,
                    background: Z.borderLight,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${rep.progress}%`,
                      borderRadius: 3,
                      background: `linear-gradient(90deg, ${Z.ultramarine}, ${Z.violet})`,
                      transition: "width 0.4s",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: Z.textMuted,
                    marginTop: 4,
                    textAlign: "right",
                  }}
                >
                  {Math.round(rep.progress)}% of {fmt(rep.target)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 6. Product Breakdown ── */}
      <div
        style={{
          background: Z.card,
          borderRadius: 16,
          border: `1px solid ${Z.border}`,
          padding: 20,
          marginBottom: 24,
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
          Product Breakdown
        </div>
        {productBreakdown.length === 0 && (
          <div style={{ color: Z.textMuted, fontSize: 13 }}>No deals to show.</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {productBreakdown.map((pb) => {
            const pColor =
              PRODUCT_COLORS[pb.productId] || Z.bluejeans;
            return (
              <div key={pb.productId}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: pColor,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: Z.textPrimary,
                      }}
                    >
                      {pb.name}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: Z.textMuted,
                      }}
                    >
                      ({pb.count} deals)
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: Z.textPrimary,
                    }}
                  >
                    {fmt(pb.total)}
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 3,
                    background: Z.borderLight,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(pb.total / maxProductTotal) * 100}%`,
                      borderRadius: 3,
                      background: pColor,
                      transition: "width 0.4s",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 7. Kanban Board ── */}
      <div
        style={{
          overflowX: "auto",
          paddingBottom: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            minWidth: (STAGES.length - 1) * 212, // won excluded from kanban
          }}
        >
          {STAGES.filter((stage) => stage.key !== "won").map((stage) => {
            const deals = dealsByStage[stage.key] || [];
            return (
              <div
                key={stage.key}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.key)}
                style={{
                  flex: "1 0 200px",
                  minWidth: 200,
                  maxWidth: 260,
                  background: Z.bg,
                  borderRadius: 12,
                  display: "flex",
                  flexDirection: "column",
                  maxHeight: 600,
                }}
              >
                {/* Column header */}
                <div
                  style={{
                    padding: "12px 14px 8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    borderBottom: `1px solid ${Z.borderLight}`,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: stage.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: Z.textPrimary,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {stage.label}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      background: `${stage.color}18`,
                      color: stage.color,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 10,
                      flexShrink: 0,
                    }}
                  >
                    {deals.length}
                  </span>
                </div>

                {/* Cards area */}
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {deals.map((deal: Deal) => {
                    const prodColor =
                      PRODUCT_COLORS[deal.productId] || Z.bluejeans;
                    const priorityColor =
                      PRIORITY_COLORS[deal.priority] || Z.textMuted;
                    return (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        onClick={() => {
                          setSelectedDeal(deal);
                          loadDeptNotes(deal.id);
                          setActiveDeptTab("Reps");
                          setDeptNoteInput("");
                        }}
                        style={{
                          background: Z.card,
                          borderRadius: 10,
                          padding: "10px 12px",
                          borderLeft: `4px solid ${prodColor}`,
                          border: `1px solid ${Z.borderLight}`,
                          borderLeftWidth: 4,
                          borderLeftColor: prodColor,
                          cursor: "pointer",
                          transition: "box-shadow 0.2s",
                          position: "relative",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = `0 2px 12px rgba(0,0,0,0.08)`;
                          const actions =
                            e.currentTarget.querySelector<HTMLElement>(
                              "[data-quick-actions]"
                            );
                          if (actions) actions.style.opacity = "1";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = "none";
                          const actions =
                            e.currentTarget.querySelector<HTMLElement>(
                              "[data-quick-actions]"
                            );
                          if (actions) actions.style.opacity = "0";
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: Z.ultramarine,
                            marginBottom: 4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {deal.title}
                        </div>
                        {deal.contactId ? (
                          <Link
                            href={`/contacts/${deal.contactId}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              fontSize: 11,
                              color: Z.textSecondary,
                              marginBottom: 2,
                              display: "block",
                              textDecoration: "none",
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "underline"; (e.currentTarget as HTMLElement).style.color = Z.ultramarine; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "none"; (e.currentTarget as HTMLElement).style.color = Z.textSecondary; }}
                          >
                            {deal.contact?.name || deal.contactName || "—"}
                          </Link>
                        ) : (
                          <div
                            style={{
                              fontSize: 11,
                              color: Z.textSecondary,
                              marginBottom: 2,
                            }}
                          >
                            {deal.contact?.name || deal.contactName || "—"}
                          </div>
                        )}
                        {(deal.contact?.phone || deal.contact?.email) && (
                          <div
                            style={{
                              fontSize: 11,
                              color: Z.textMuted,
                              marginBottom: 2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {deal.contact?.phone && deal.contact?.email
                              ? `${deal.contact.phone} · ${deal.contact.email}`
                              : deal.contact?.phone || deal.contact?.email}
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: 11,
                            color: Z.textMuted,
                            marginBottom: 6,
                          }}
                        >
                          {deal.rep || "Unassigned"}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          {deal.priority && (
                            <Badge
                              label={deal.priority}
                              color={priorityColor}
                            />
                          )}
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: Z.textPrimary,
                              marginLeft: "auto",
                            }}
                          >
                            {deal.value ? fmt(Number(deal.value)) : "—"}
                          </span>
                        </div>
                        {deal.stage === "won" && (
                          <div style={{ marginTop: 4 }}>
                            {deal.paymentStatus === "confirmed" ? (
                              <span style={{ fontSize: 10, fontWeight: 600, color: "#16a34a", background: "#dcfce7", padding: "2px 6px", borderRadius: 4 }}>✓ Paid</span>
                            ) : deal.paymentStatus === "failed" ? (
                              <span style={{ fontSize: 10, fontWeight: 600, color: "#dc2626", background: "#fef2f2", padding: "2px 6px", borderRadius: 4 }}>✗ Payment Failed</span>
                            ) : (
                              <span style={{ fontSize: 10, fontWeight: 600, color: "#d97706", background: "#fef3c7", padding: "2px 6px", borderRadius: 4 }}>⏳ Awaiting Payment</span>
                            )}
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                          <div style={{ fontSize: 11, color: "#8b90a8" }}>{deal.timeInStageDays ?? 0}d in stage</div>
                          {deal.heatScore !== undefined && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: deal.heatScore >= 70 ? "#10b981" : deal.heatScore >= 40 ? "#f59e0b" : "#ef4444" }}>🔥{deal.heatScore}</span>
                          )}
                        </div>

                        {/* Quick action buttons */}
                        <div
                          data-quick-actions
                          style={{
                            opacity: 0,
                            transition: "opacity 0.15s",
                            display: "flex",
                            gap: 4,
                            marginTop: 6,
                            paddingTop: 6,
                            borderTop: `1px solid ${Z.borderLight}`,
                          }}
                        >
                          {/* Call */}
                          {deal.contact?.phone && (
                            <a
                              href={`tel:${deal.contact.phone}`}
                              title="Call"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: `1px solid ${Z.borderLight}`,
                                background: Z.card,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: 0,
                                textDecoration: "none",
                                fontSize: 14,
                                lineHeight: 1,
                              }}
                            >
                              📞
                            </a>
                          )}
                          {/* Text — disabled, coming soon */}
                          {deal.contact?.phone && (
                            <button
                              disabled
                              title="SMS coming soon"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: `1px solid ${Z.borderLight}`,
                                background: Z.card,
                                cursor: "not-allowed",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: 0,
                                opacity: 0.4,
                                fontSize: 14,
                                lineHeight: 1,
                              }}
                            >
                              💬
                            </button>
                          )}
                          {/* Email */}
                          {deal.contact?.email && deal.contact?.id && deal.contact?.name && (
                            <button
                              title="Email"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEmailComposeTo({ id: deal.contact!.id, name: deal.contact!.name, email: deal.contact!.email! });
                                setShowEmailCompose(true);
                              }}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: `1px solid ${Z.borderLight}`,
                                background: Z.card,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: 0,
                                fontSize: 14,
                                lineHeight: 1,
                              }}
                            >
                              ✉️
                            </button>
                          )}
                          {/* Delete deal */}
                          <button
                            title="Delete deal"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!confirm(`Delete "${deal.title}"? This cannot be undone.`)) return;
                              await fetch(`/api/deals/${deal.id}`, { method: "DELETE" });
                              mutate(pipelineUrl);
                              mutate("/api/deals");
                            }}
                            style={{
                              width: 28, height: 28, borderRadius: 6,
                              border: `1px solid ${Z.borderLight}`,
                              background: Z.card, cursor: "pointer",
                              display: "flex", alignItems: "center",
                              justifyContent: "center", padding: 0,
                              fontSize: 14, lineHeight: 1, marginLeft: "auto",
                              color: "#ef4444",
                            }}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {deals.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        color: Z.textMuted,
                        fontSize: 11,
                        padding: "20px 0",
                      }}
                    >
                      No deals
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 8. Deal Slide-out Panel ── */}
      {selectedDeal && (
        <>
          <div
            onClick={() => setSelectedDeal(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(5,5,54,0.2)",
              zIndex: 900,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: 420,
              background: Z.card,
              zIndex: 910,
              borderLeft: `1px solid ${Z.border}`,
              boxShadow: "-8px 0 40px rgba(5,5,54,0.12)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Panel header */}
            <div
              style={{
                padding: "20px 24px 16px",
                borderBottom: `1px solid ${Z.border}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: Z.textPrimary,
                      marginBottom: 4,
                    }}
                  >
                    {selectedDeal.title}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      marginBottom: 6,
                    }}
                  >
                    <ContactLink
                      contactId={selectedDeal?.contact?.id || selectedDeal?.contactId}
                      name={selectedDeal?.contact?.name || selectedDeal?.contactName}
                    />
                  </div>
                  {/* Contact info block */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 8, fontSize: 12 }}>
                    {selectedDeal.contact?.email && (
                      <CopyableText value={selectedDeal.contact.email} type="email" style={{ fontSize: 12 }} />
                    )}
                    {selectedDeal.contact?.phone && (
                      <CopyableText value={selectedDeal.contact.phone} type="phone" style={{ fontSize: 12 }} />
                    )}
                    {selectedDeal.contact?.company && (
                      <span style={{ color: Z.textSecondary }}>🏢 {selectedDeal.contact.company}</span>
                    )}
                    {selectedDeal.value != null && (
                      <span style={{ color: Z.textSecondary }}>💰 {fmt(Number(selectedDeal.value))}</span>
                    )}
                    {selectedDeal.stage === "won" && selectedDeal.wonDate && (
                      <span style={{ color: "#10b981" }}>✓ Won {new Date(selectedDeal.wonDate.includes("T") ? selectedDeal.wonDate : selectedDeal.wonDate + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    )}
                    {selectedDeal.domainType && selectedDeal.domainName && (
                      <span style={{ color: Z.textSecondary }}>🌐 {selectedDeal.domainType === "existing" ? "Existing" : "New"}: {selectedDeal.domainName}</span>
                    )}
                  </div>
                  <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, color: Z.textMuted }}>Rep:</span>
                    <select
                      value={selectedDeal.rep || ""}
                      onChange={(e) => handleRepAssign(selectedDeal.id, e.target.value)}
                      style={{ fontSize: 12, color: Z.textPrimary, border: `1px solid ${Z.border}`, borderRadius: 6, padding: "2px 6px", background: Z.bg, cursor: "pointer" }}
                    >
                      <option value="">Unassigned</option>
                      {(teamMembers ?? []).map((m) => (
                        <option key={m.id} value={`${m.firstName} ${m.lastName || ""}`.trim()}>
                          {m.firstName} {m.lastName || ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedDeal.stage && (
                    <Badge
                      label={selectedDeal.stage}
                      color={
                        STAGES.find((s) => s.key === selectedDeal.stage)
                          ?.color || Z.textMuted
                      }
                    />
                  )}
                </div>
                <button
                  onClick={() => setSelectedDeal(null)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 20,
                    color: Z.textMuted,
                    cursor: "pointer",
                    padding: 4,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Stage mover */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 4,
                  marginTop: 8,
                }}
              >
                {STAGES.filter((s) => s.key !== "won").map((s) => (
                  <button
                    key={s.key}
                    onClick={() => handleStageChange(selectedDeal, s.key)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                      border:
                        selectedDeal.stage === s.key
                          ? "none"
                          : `1px solid ${Z.borderLight}`,
                      background:
                        selectedDeal.stage === s.key
                          ? `${s.color}20`
                          : "transparent",
                      color:
                        selectedDeal.stage === s.key
                          ? s.color
                          : Z.textMuted,
                      transition: "all 0.15s",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Quick action buttons */}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {selectedDeal.contact?.phone && (
                  <a
                    href={`tel:${selectedDeal.contact.phone}`}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", borderRadius: 8, border: `1px solid ${Z.turquoise}`, background: `${Z.turquoise}12`, cursor: "pointer", fontSize: 12, fontWeight: 700, color: Z.turquoise, textDecoration: "none" }}
                  >📞 Call</a>
                )}
                {selectedDeal.contact?.phone && (
                  <button
                    disabled
                    title="SMS coming soon"
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", borderRadius: 8, border: `1px solid ${Z.border}`, background: Z.bg, cursor: "not-allowed", fontSize: 12, fontWeight: 700, color: Z.textMuted, opacity: 0.6 }}
                  >💬 Text</button>
                )}
                {selectedDeal.contact?.email && (
                  <button
                    onClick={() => {
                      setEmailComposeTo({ id: selectedDeal.contact.id, name: selectedDeal.contact.name, email: selectedDeal.contact.email });
                      setShowEmailCompose(true);
                    }}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", borderRadius: 8, border: `1px solid ${Z.border}`, background: Z.card, cursor: "pointer", fontSize: 12, fontWeight: 600, color: Z.textSecondary, transition: "all 0.15s" }}
                  >✉️ Email</button>
                )}
                {selectedDeal.stage !== "won" ? (
                  <button
                    onClick={() => setWonModalDeal(selectedDeal)}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", borderRadius: 8, border: "1px solid #10b981", background: "#10b98112", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#10b981", transition: "all 0.15s" }}
                  >✓ Raise Sale</button>
                ) : (
                  <button
                    onClick={() => setShowContractModal(true)}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", borderRadius: 8, border: `1px solid ${Z.violet}`, background: `${Z.violet}12`, cursor: "pointer", fontSize: 12, fontWeight: 700, color: Z.violet, transition: "all 0.15s" }}
                  >📄 Send Contract</button>
                )}
              </div>
              {/* Time in stage + heat score in detail panel */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, fontSize: 12, color: Z.textMuted }}>
                <span>{selectedDeal.timeInStageDays ?? 0}d in stage</span>
                {selectedDeal.heatScore !== undefined && (
                  <span style={{ fontWeight: 700, color: selectedDeal.heatScore >= 70 ? "#10b981" : selectedDeal.heatScore >= 40 ? "#f59e0b" : "#ef4444" }}>🔥 Heat: {selectedDeal.heatScore}</span>
                )}
              </div>
            </div>

            {/* Tabbed content */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "0 24px 24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  borderBottom: `1px solid ${Z.border}`,
                  marginBottom: 16,
                  paddingTop: 12,
                }}
              >
                {(["sms", "email", "calendar"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setPanelTab(tab)}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      color:
                        panelTab === tab
                          ? Z.ultramarine
                          : Z.textMuted,
                      borderBottom:
                        panelTab === tab
                          ? `2px solid ${Z.ultramarine}`
                          : "2px solid transparent",
                      transition: "all 0.15s",
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab content placeholder */}
              <div
                style={{
                  background: Z.bg,
                  borderRadius: 10,
                  padding: 16,
                  minHeight: 80,
                  marginBottom: 20,
                }}
              >
                {panelTab === "sms" && (
                  <div style={{ fontSize: 13, color: Z.textMuted }}>
                    {selectedDeal.smsTrail
                      ? JSON.stringify(selectedDeal.smsTrail)
                      : "No SMS messages yet."}
                  </div>
                )}
                {panelTab === "email" && (
                  <div style={{ fontSize: 13, color: Z.textMuted }}>
                    {selectedDeal.emailTrail
                      ? JSON.stringify(selectedDeal.emailTrail)
                      : "No email threads yet."}
                  </div>
                )}
                {panelTab === "calendar" && (
                  <div style={{ fontSize: 13, color: Z.textMuted }}>
                    {selectedDeal.calendarHistory
                      ? JSON.stringify(selectedDeal.calendarHistory)
                      : "No calendar events yet."}
                  </div>
                )}
              </div>

              {/* Department Notes Tabs (Item 4) */}
              <div style={{ fontSize: 14, fontWeight: 800, color: Z.textPrimary, marginBottom: 10, marginTop: 8 }}>Notes by Department</div>
              {/* Tab bar */}
              <div style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 12, paddingBottom: 4 }}>
                {DEPT_TABS.map((tab) => {
                  const count = deptNotes[tab]?.count ?? 0;
                  const isActive = activeDeptTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveDeptTab(tab)}
                      style={{
                        flexShrink: 0,
                        padding: "4px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        border: isActive ? "none" : `1px solid ${Z.borderLight}`,
                        background: isActive ? Z.ultramarine : "transparent",
                        color: isActive ? "#fff" : Z.textMuted,
                        cursor: "pointer",
                        position: "relative",
                      }}
                    >
                      {tab}
                      {count > 0 && (
                        <span style={{ marginLeft: 4, background: isActive ? "rgba(255,255,255,0.3)" : "#ef4444", color: "#fff", borderRadius: 10, padding: "0 5px", fontSize: 10, fontWeight: 800 }}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Notes list for active dept */}
              <div style={{ minHeight: 60, marginBottom: 10 }}>
                {(deptNotes[activeDeptTab]?.notes ?? []).length === 0 ? (
                  <div style={{ fontSize: 12, color: Z.textMuted, padding: "8px 0" }}>No {activeDeptTab} notes yet.</div>
                ) : (
                  (deptNotes[activeDeptTab]?.notes ?? []).map((n) => (
                    <div key={n.id} style={{ background: Z.bg, borderRadius: 8, padding: "8px 12px", marginBottom: 6, fontSize: 12, color: Z.textPrimary }}>
                      <div style={{ fontWeight: 600 }}>{n.content}</div>
                      <div style={{ fontSize: 10, color: Z.textMuted, marginTop: 2 }}>{n.author || "Unknown"} &middot; {new Date(n.createdAt).toLocaleDateString()}</div>
                    </div>
                  ))
                )}
              </div>
              {/* Note input */}
              <textarea
                value={deptNoteInput}
                onChange={(e) => setDeptNoteInput(e.target.value)}
                placeholder={`Add ${activeDeptTab} note...`}
                style={{ width: "100%", minHeight: 60, padding: 10, borderRadius: 8, border: `1px solid ${Z.border}`, background: Z.bg, fontSize: 12, color: Z.textPrimary, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 8 }}
              />
              <div style={{ marginTop: 4, display: "flex", gap: 8 }}>
                <Btn small onClick={() => submitDeptNote(selectedDeal)} variant="primary" disabled={deptNoteSaving}>
                  {deptNoteSaving ? "Saving..." : "Add Note"}
                </Btn>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Add Lead Modal ── */}
      <Modal open={addLeadOpen} onClose={() => setAddLeadOpen(false)} title="Add Lead">
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Contact Name">
              <Input value={leadName} onChange={setLeadName} placeholder="Jane Smith" />
            </FormField>
            <FormField label="Company">
              <Input value={leadCompany} onChange={setLeadCompany} placeholder="Acme Corp" />
            </FormField>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Email">
              <Input value={leadEmail} onChange={setLeadEmail} placeholder="jane@acme.com" type="email" />
            </FormField>
            <FormField label="Phone">
              <Input value={leadPhone} onChange={setLeadPhone} placeholder="(555) 123-4567" />
            </FormField>
          </div>
          <FormField label="Stage">
            <Select
              value={leadStage}
              onChange={setLeadStage}
              options={STAGES.filter(s => s.key !== "won").map(s => ({ value: s.key, label: s.label }))}
            />
          </FormField>
          <FormField label="Rep">
            <Select value={leadRep} onChange={setLeadRep} options={repOptions} />
          </FormField>
          <FormField label="Link to Existing Contact (optional)">
            <div style={{ position: "relative" }}>
              <Input value={leadContactSearch} onChange={(v) => { setLeadContactSearch(v); setLeadContactId(""); }} placeholder="Search by name or email..." />
              {leadContactSearch.length >= 2 && !leadContactId && (
                <ContactSearchResults
                  query={leadContactSearch}
                  contacts={allContacts ?? []}
                  onSelect={(id, name) => { setLeadContactId(id); setLeadContactSearch(name); }}
                />
              )}
            </div>
            {leadContactId && (
              <div style={{ fontSize: 11, color: "#10b981", marginTop: 4 }}>✓ Linked to existing contact — <button onClick={() => { setLeadContactId(""); setLeadContactSearch(""); }} style={{ background: "none", border: "none", color: Z.textMuted, cursor: "pointer", fontSize: 11 }}>clear</button></div>
            )}
          </FormField>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn variant="secondary" onClick={() => setAddLeadOpen(false)}>Cancel</Btn>
            <Btn
              onClick={submitAddLead}
              disabled={leadSubmitting || (!leadName.trim() && !leadCompany.trim())}
            >
              {leadSubmitting ? "Adding..." : "Add Lead"}
            </Btn>
          </div>
        </div>
      </Modal>

      <WonDealModal
        open={newSaleOpen}
        onClose={() => setNewSaleOpen(false)}
        onSuccess={(title) => { setNewSaleOpen(false); showToast(`Sale created — ${title}`, true); mutate(pipelineUrl); mutate("/api/deals"); }}
      />
      <WonDealModal
        open={!!wonModalDeal}
        existingDeal={wonModalDeal}
        onClose={() => setWonModalDeal(null)}
        onSuccess={() => { setWonModalDeal(null); showToast("Sale raised", true); mutate(pipelineUrl); mutate("/api/deals"); }}
      />
      <Toast toast={toast} />
      {showEmailCompose && emailComposeTo && (
        <FloatingEmailCompose
          contactId={emailComposeTo.id}
          contactName={emailComposeTo.name}
          contactEmail={emailComposeTo.email}
          onClose={() => { setShowEmailCompose(false); setEmailComposeTo(null); }}
          onEmailSent={() => showToast("Email sent", true)}
        />
      )}

      {/* BoldSign Send Contract Modal */}
      <Modal
        open={showContractModal && !!selectedDeal}
        onClose={() => setShowContractModal(false)}
        title="Send Contract"
      >
        {selectedDeal && (
          <div>
            <div style={{ marginBottom: 16, fontSize: 14, color: Z.textSecondary }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 600, color: Z.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Contact</span>
                <div style={{ fontWeight: 700, color: Z.textPrimary, marginTop: 2 }}>
                  {selectedDeal.contact?.name || selectedDeal.contactName || "—"}
                </div>
                <div style={{ color: Z.textSecondary, fontSize: 13 }}>
                  {selectedDeal.contact?.email
                    ? <CopyableText value={selectedDeal.contact.email} type="email" style={{ fontSize: 13 }} />
                    : "No email on file"}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontWeight: 600, color: Z.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Deal</span>
                <div style={{ fontWeight: 700, color: Z.textPrimary, marginTop: 2 }}>
                  {selectedDeal.title}
                </div>
              </div>
              <div style={{ padding: "10px 12px", borderRadius: 8, background: `${Z.violet}10`, border: `1px solid ${Z.violet}30`, fontSize: 13, color: Z.textSecondary }}>
                This will open BoldSign in a new tab. Log in and select your template to send the agreement.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="secondary" onClick={() => setShowContractModal(false)}>Cancel</Btn>
              <Btn
                onClick={async () => {
                  if (contractSending) return;
                  setContractSending(true);
                  window.open("https://app.boldsign.com/document/send", "_blank");
                  try {
                    if (selectedDeal.contact?.id || selectedDeal.contactId) {
                      await fetch("/api/activity", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          contactId: selectedDeal.contact?.id || selectedDeal.contactId,
                          type: "note",
                          subject: "Contract sent via BoldSign",
                          metadata: {
                            source: "manual_boldsign_deeplink",
                            sentBy: myRepName || undefined,
                            dealId: selectedDeal.id,
                          },
                        }),
                      });
                    }
                  } catch {
                    // Non-fatal — activity log failure should not block the rep
                  } finally {
                    setContractSending(false);
                    setShowContractModal(false);
                    showToast("Opened BoldSign — activity logged", true);
                  }
                }}
              >
                {contractSending ? "Opening..." : "Open in BoldSign"}
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
