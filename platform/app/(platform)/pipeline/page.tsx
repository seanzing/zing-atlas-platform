"use client";

import { Badge, StatCard, Btn, Modal, FormField, Input, Select, FilterBtn } from "@/components/ui";
import { Z, fmt, STAGES, PRIORITY_COLORS, PRODUCT_COLORS } from "@/lib/constants";
import useSWR, { mutate } from "swr";
import { useState, useMemo, useCallback, DragEvent } from "react";

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Product = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Designer = any;

const NOTE_SECTIONS = ["Reps", "Designer", "Publishing", "Accounts", "Support"] as const;

/* ── main component ── */

export default function PipelinePage() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(toYMD(startOfMonth(now)));
  const [dateTo, setDateTo] = useState(toYMD(endOfMonth(now)));
  const [activePreset, setActivePreset] = useState("this-month");
  const [activeRep, setActiveRep] = useState("All");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [wonModalDeal, setWonModalDeal] = useState<Deal | null>(null);
  const [addWonOpen, setAddWonOpen] = useState(false);
  const [dragDealId, setDragDealId] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<"sms" | "email" | "calendar">("sms");
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});

  // Won modal state
  const [wonDealType, setWonDealType] = useState("new");
  const [wonProductId, setWonProductId] = useState("");
  const [wonAmount, setWonAmount] = useState("");
  const [wonDeliveryDate, setWonDeliveryDate] = useState("");
  const [wonDesigner, setWonDesigner] = useState("");
  const [wonLaunchFee, setWonLaunchFee] = useState("");
  const [wonSplitPayments, setWonSplitPayments] = useState(false);
  const [wonSplitCount, setWonSplitCount] = useState("2");

  // Add Won modal state
  const [addWonTitle, setAddWonTitle] = useState("");
  const [addWonContactName, setAddWonContactName] = useState("");
  const [addWonRep, setAddWonRep] = useState("");
  const [addWonDealType, setAddWonDealType] = useState("new");
  const [addWonProductId, setAddWonProductId] = useState("");
  const [addWonAmount, setAddWonAmount] = useState("");
  const [addWonDeliveryDate, setAddWonDeliveryDate] = useState("");
  const [addWonDesigner, setAddWonDesigner] = useState("");
  const [addWonLaunchFee, setAddWonLaunchFee] = useState("");
  const [addWonSplitPayments, setAddWonSplitPayments] = useState(false);
  const [addWonSplitCount, setAddWonSplitCount] = useState("2");

  // Notes state for slide-out panel
  const [dealNotes, setDealNotes] = useState<Record<string, string>>({});

  /* ── data fetching ── */
  const repParam = activeRep !== "All" ? `&rep=${activeRep}` : "";
  const pipelineUrl = `/api/pipeline?from=${dateFrom}&to=${dateTo}${repParam}`;
  // Pipeline API available but we use allDeals with client-side filtering for Kanban
  useSWR<Deal[]>(pipelineUrl, fetcher); // warm cache
  const { data: allDeals } = useSWR<Deal[]>("/api/deals", fetcher);
  const { data: teamMembers } = useSWR<TeamMember[]>("/api/team", fetcher);
  const { data: products } = useSWR<Product[]>("/api/products", fetcher);
  const { data: designers } = useSWR<Designer[]>("/api/designers", fetcher);

  const salesTeam = useMemo(
    () =>
      (teamMembers ?? []).filter(
        (m: TeamMember) => m.role === "sales" || m.role === "rep" || !m.role
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
        const wonDate = d.wonDate ? new Date(d.wonDate) : d.createdAt ? new Date(d.createdAt) : null;
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

  /* ── rep deal counts ── */
  const repDealCounts = useMemo(() => {
    const map: Record<string, number> = { All: (allDeals ?? []).length };
    (allDeals ?? []).forEach((d: Deal) => {
      if (d.rep) {
        map[d.rep] = (map[d.rep] || 0) + 1;
      }
    });
    return map;
  }, [allDeals]);

  /* ── team leaderboard data ── */
  const leaderboard = useMemo(() => {
    return salesTeam.map((m: TeamMember, idx: number) => {
      const repName = m.firstName;
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
        setWonAmount(deal.value ? String(Number(deal.value)) : "");
        setWonProductId(deal.productId || "");
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
      } catch (err) {
        console.error("Failed to update deal stage:", err);
      }
      setDragDealId(null);
    },
    [dragDealId, visibleDeals, pipelineUrl]
  );

  const handleStageChange = useCallback(
    async (deal: Deal, newStage: string) => {
      if (deal.stage === newStage) return;
      if (newStage === "won") {
        setWonModalDeal(deal);
        setWonAmount(deal.value ? String(Number(deal.value)) : "");
        setWonProductId(deal.productId || "");
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
      } catch (err) {
        console.error("Failed to update deal stage:", err);
      }
    },
    [pipelineUrl, selectedDeal]
  );

  const submitWonDeal = useCallback(async () => {
    if (!wonModalDeal) return;
    try {
      const body: Record<string, unknown> = {
        stage: "won",
        dealType: wonDealType,
        value: wonAmount ? Number(wonAmount) : undefined,
        deliveryDate: wonDeliveryDate || undefined,
        assignedDesigner: wonDesigner || undefined,
        launchFeeAmount: wonLaunchFee ? Number(wonLaunchFee) : undefined,
      };
      if (wonProductId) body.productId = wonProductId;

      await fetch(`/api/deals/${wonModalDeal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      mutate(pipelineUrl);
      mutate("/api/deals");
      setWonModalDeal(null);
      resetWonForm();
    } catch (err) {
      console.error("Failed to submit won deal:", err);
    }
  }, [wonModalDeal, wonDealType, wonProductId, wonAmount, wonDeliveryDate, wonDesigner, wonLaunchFee, pipelineUrl]);

  const submitAddWonDeal = useCallback(async () => {
    try {
      const body: Record<string, unknown> = {
        title: addWonTitle,
        contactName: addWonContactName || undefined,
        rep: addWonRep || undefined,
        stage: "won",
        dealType: addWonDealType,
        value: addWonAmount ? Number(addWonAmount) : undefined,
        deliveryDate: addWonDeliveryDate || undefined,
        assignedDesigner: addWonDesigner || undefined,
        launchFeeAmount: addWonLaunchFee ? Number(addWonLaunchFee) : undefined,
      };
      if (addWonProductId) body.productId = addWonProductId;

      await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      mutate(pipelineUrl);
      mutate("/api/deals");
      setAddWonOpen(false);
      resetAddWonForm();
    } catch (err) {
      console.error("Failed to create won deal:", err);
    }
  }, [addWonTitle, addWonContactName, addWonRep, addWonDealType, addWonProductId, addWonAmount, addWonDeliveryDate, addWonDesigner, addWonLaunchFee, pipelineUrl]);

  const handleSaveNotes = useCallback(
    async (deal: Deal) => {
      try {
        const notes: Record<string, string> = {};
        NOTE_SECTIONS.forEach((s) => {
          notes[s] = dealNotes[`${deal.id}-${s}`] || "";
        });
        await fetch(`/api/deals/${deal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allNotes: notes }),
        });
        mutate(pipelineUrl);
        mutate("/api/deals");
      } catch (err) {
        console.error("Failed to save notes:", err);
      }
    },
    [dealNotes, pipelineUrl]
  );

  function resetWonForm() {
    setWonDealType("new");
    setWonProductId("");
    setWonAmount("");
    setWonDeliveryDate("");
    setWonDesigner("");
    setWonLaunchFee("");
    setWonSplitPayments(false);
    setWonSplitCount("2");
  }

  function resetAddWonForm() {
    setAddWonTitle("");
    setAddWonContactName("");
    setAddWonRep("");
    setAddWonDealType("new");
    setAddWonProductId("");
    setAddWonAmount("");
    setAddWonDeliveryDate("");
    setAddWonDesigner("");
    setAddWonLaunchFee("");
    setAddWonSplitPayments(false);
    setAddWonSplitCount("2");
  }

  function loadDealNotes(deal: Deal) {
    const notes = deal.allNotes || {};
    const loaded: Record<string, string> = {};
    NOTE_SECTIONS.forEach((s) => {
      loaded[`${deal.id}-${s}`] = notes[s] || "";
    });
    setDealNotes((prev) => ({ ...prev, ...loaded }));
  }

  const productOptions = useMemo(
    () => [
      { value: "", label: "Select product..." },
      ...(products ?? []).map((p: Product) => ({
        value: p.id,
        label: `${p.description} — ${fmt(Number(p.price))}`,
      })),
    ],
    [products]
  );

  const designerOptions = useMemo(
    () => [
      { value: "", label: "Select designer..." },
      ...(designers ?? []).map((d: Designer) => ({
        value: d.name || d.id,
        label: d.name || "Unknown",
      })),
    ],
    [designers]
  );

  const repOptions = useMemo(
    () => [
      { value: "", label: "Select rep..." },
      ...salesTeam.map((m: TeamMember) => ({
        value: m.firstName,
        label: `${m.firstName} ${m.lastName || ""}`.trim(),
      })),
    ],
    [salesTeam]
  );

  // When selecting product, pre-fill amount
  const handleWonProductChange = useCallback(
    (pid: string) => {
      setWonProductId(pid);
      const p = (products ?? []).find((pr: Product) => pr.id === pid);
      if (p) setWonAmount(String(Number(p.price)));
    },
    [products]
  );

  const handleAddWonProductChange = useCallback(
    (pid: string) => {
      setAddWonProductId(pid);
      const p = (products ?? []).find((pr: Product) => pr.id === pid);
      if (p) setAddWonAmount(String(Number(p.price)));
    },
    [products]
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
          <Btn onClick={() => setAddWonOpen(true)}>+ Add Won Deal</Btn>
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
        {["All", ...salesTeam.map((m: TeamMember) => m.firstName)].map(
          (name: string) => {
            const isActive = activeRep === name;
            const count = repDealCounts[name] || 0;
            const initials =
              name === "All"
                ? "A"
                : name
                    .split(" ")
                    .map((w: string) => w[0])
                    .join("")
                    .toUpperCase();
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
                onClick={() => setActiveRep(rep.firstName)}
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
            minWidth: STAGES.length * 212,
          }}
        >
          {STAGES.map((stage) => {
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
                        style={{
                          background: Z.card,
                          borderRadius: 10,
                          padding: "10px 12px",
                          borderLeft: `4px solid ${prodColor}`,
                          border: `1px solid ${Z.borderLight}`,
                          borderLeftWidth: 4,
                          borderLeftColor: prodColor,
                          cursor: "grab",
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
                          onClick={() => {
                            setSelectedDeal(deal);
                            loadDealNotes(deal);
                          }}
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: Z.ultramarine,
                            cursor: "pointer",
                            marginBottom: 4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {deal.title}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: Z.textSecondary,
                            marginBottom: 2,
                          }}
                        >
                          {deal.contact?.name || deal.contactName || "—"}
                        </div>
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
                          {[
                            { icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z", title: "Call" },
                            { icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", title: "Message" },
                            { icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", title: "Email" },
                            { icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", title: "Calendar" },
                          ].map((action) => (
                            <button
                              key={action.title}
                              title={action.title}
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
                              }}
                            >
                              <svg
                                width={14}
                                height={14}
                                fill="none"
                                stroke={Z.textMuted}
                                strokeWidth={1.5}
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d={action.icon}
                                />
                              </svg>
                            </button>
                          ))}
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
                      color: Z.textSecondary,
                      marginBottom: 2,
                    }}
                  >
                    {selectedDeal.contact?.name ||
                      selectedDeal.contactName ||
                      "No contact"}
                  </div>
                  <div
                    style={{ fontSize: 12, color: Z.textMuted, marginBottom: 8 }}
                  >
                    Rep: {selectedDeal.rep || "Unassigned"}
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
                {STAGES.map((s) => (
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
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                {[
                  { label: "Call", icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
                  { label: "Text", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
                  { label: "Email", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
                  { label: "Appt", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
                ].map((action) => (
                  <button
                    key={action.label}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "8px 0",
                      borderRadius: 8,
                      border: `1px solid ${Z.border}`,
                      background: Z.card,
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      color: Z.textSecondary,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = Z.ultramarine;
                      e.currentTarget.style.color = Z.ultramarine;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = Z.border;
                      e.currentTarget.style.color = Z.textSecondary;
                    }}
                  >
                    <svg
                      width={14}
                      height={14}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={action.icon}
                      />
                    </svg>
                    {action.label}
                  </button>
                ))}
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

              {/* Notes sections */}
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: Z.textPrimary,
                  marginBottom: 12,
                }}
              >
                Notes
              </div>
              {NOTE_SECTIONS.map((section) => {
                const noteKey = `${selectedDeal.id}-${section}`;
                const isOpen = openNotes[noteKey] ?? false;
                return (
                  <div
                    key={section}
                    style={{
                      marginBottom: 8,
                      border: `1px solid ${Z.borderLight}`,
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    <button
                      onClick={() =>
                        setOpenNotes((prev) => ({
                          ...prev,
                          [noteKey]: !prev[noteKey],
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: Z.bg,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                        color: Z.textPrimary,
                      }}
                    >
                      {section}
                      <span
                        style={{
                          transform: isOpen
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                          transition: "transform 0.2s",
                          fontSize: 10,
                          color: Z.textMuted,
                        }}
                      >
                        ▼
                      </span>
                    </button>
                    {isOpen && (
                      <div style={{ padding: 12 }}>
                        <textarea
                          value={dealNotes[noteKey] || ""}
                          onChange={(e) =>
                            setDealNotes((prev) => ({
                              ...prev,
                              [noteKey]: e.target.value,
                            }))
                          }
                          placeholder={`${section} notes...`}
                          style={{
                            width: "100%",
                            minHeight: 80,
                            padding: 10,
                            borderRadius: 8,
                            border: `1px solid ${Z.border}`,
                            background: Z.bg,
                            fontSize: 12,
                            color: Z.textPrimary,
                            outline: "none",
                            resize: "vertical",
                            boxSizing: "border-box",
                            fontFamily: "inherit",
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{ marginTop: 12 }}>
                <Btn
                  small
                  onClick={() => handleSaveNotes(selectedDeal)}
                  variant="primary"
                >
                  Save Notes
                </Btn>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── 9. Won Deal Modal ── */}
      <Modal
        open={!!wonModalDeal}
        onClose={() => {
          setWonModalDeal(null);
          resetWonForm();
        }}
        title="Mark Deal as Won"
      >
        {wonModalDeal && (
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: Z.textPrimary,
                marginBottom: 16,
              }}
            >
              {wonModalDeal.title}
            </div>

            {/* Deal Type */}
            <FormField label="Deal Type">
              <div style={{ display: "flex", gap: 8 }}>
                {["new", "upgrade", "add-on"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setWonDealType(t)}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 8,
                      border:
                        wonDealType === t
                          ? `2px solid ${Z.ultramarine}`
                          : `1px solid ${Z.border}`,
                      background:
                        wonDealType === t
                          ? `${Z.ultramarine}10`
                          : "transparent",
                      color:
                        wonDealType === t
                          ? Z.ultramarine
                          : Z.textSecondary,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {t === "add-on" ? "Add-on" : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="Product">
              <Select
                value={wonProductId}
                onChange={handleWonProductChange}
                options={productOptions}
              />
            </FormField>

            <FormField label="Amount (MRR)">
              <Input
                value={wonAmount}
                onChange={setWonAmount}
                placeholder="0"
                type="number"
              />
            </FormField>

            <FormField label="Delivery Date">
              <Input
                value={wonDeliveryDate}
                onChange={setWonDeliveryDate}
                type="date"
              />
            </FormField>

            <FormField label="Designer">
              <Select
                value={wonDesigner}
                onChange={setWonDesigner}
                options={designerOptions}
              />
            </FormField>

            {/* Launch Fee */}
            <FormField label="Launch Fee">
              <Input
                value={wonLaunchFee}
                onChange={setWonLaunchFee}
                placeholder="0"
                type="number"
              />
            </FormField>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <input
                type="checkbox"
                checked={wonSplitPayments}
                onChange={(e) => setWonSplitPayments(e.target.checked)}
                style={{ accentColor: Z.ultramarine }}
              />
              <span style={{ fontSize: 12, color: Z.textSecondary }}>
                Split into payments
              </span>
              {wonSplitPayments && (
                <input
                  type="number"
                  value={wonSplitCount}
                  onChange={(e) => setWonSplitCount(e.target.value)}
                  min="2"
                  max="12"
                  style={{
                    width: 60,
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: `1px solid ${Z.border}`,
                    fontSize: 12,
                    outline: "none",
                    color: Z.textPrimary,
                  }}
                />
              )}
            </div>

            {wonSplitPayments && wonLaunchFee && (
              <div
                style={{
                  background: Z.bg,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  fontSize: 12,
                  color: Z.textSecondary,
                }}
              >
                {Number(wonSplitCount) > 0 &&
                  Array.from({ length: Number(wonSplitCount) }).map(
                    (_, i) => (
                      <div key={i} style={{ marginBottom: 4 }}>
                        Payment {i + 1}:{" "}
                        <strong>
                          {fmt(
                            Number(wonLaunchFee) / Number(wonSplitCount)
                          )}
                        </strong>
                      </div>
                    )
                  )}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 8,
              }}
            >
              <Btn
                variant="secondary"
                onClick={() => {
                  setWonModalDeal(null);
                  resetWonForm();
                }}
              >
                Cancel
              </Btn>
              <Btn onClick={submitWonDeal}>Mark as Won</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* ── 10. Add Won Deal Modal ── */}
      <Modal
        open={addWonOpen}
        onClose={() => {
          setAddWonOpen(false);
          resetAddWonForm();
        }}
        title="Add Won Deal"
      >
        <FormField label="Deal Title">
          <Input
            value={addWonTitle}
            onChange={setAddWonTitle}
            placeholder="Deal title"
          />
        </FormField>

        <FormField label="Contact Name">
          <Input
            value={addWonContactName}
            onChange={setAddWonContactName}
            placeholder="Contact name"
          />
        </FormField>

        <FormField label="Sales Rep">
          <Select
            value={addWonRep}
            onChange={setAddWonRep}
            options={repOptions}
          />
        </FormField>

        {/* Deal Type */}
        <FormField label="Deal Type">
          <div style={{ display: "flex", gap: 8 }}>
            {["new", "upgrade", "add-on"].map((t) => (
              <button
                key={t}
                onClick={() => setAddWonDealType(t)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 8,
                  border:
                    addWonDealType === t
                      ? `2px solid ${Z.ultramarine}`
                      : `1px solid ${Z.border}`,
                  background:
                    addWonDealType === t
                      ? `${Z.ultramarine}10`
                      : "transparent",
                  color:
                    addWonDealType === t
                      ? Z.ultramarine
                      : Z.textSecondary,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {t === "add-on" ? "Add-on" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="Product">
          <Select
            value={addWonProductId}
            onChange={handleAddWonProductChange}
            options={productOptions}
          />
        </FormField>

        <FormField label="Amount (MRR)">
          <Input
            value={addWonAmount}
            onChange={setAddWonAmount}
            placeholder="0"
            type="number"
          />
        </FormField>

        <FormField label="Delivery Date">
          <Input
            value={addWonDeliveryDate}
            onChange={setAddWonDeliveryDate}
            type="date"
          />
        </FormField>

        <FormField label="Designer">
          <Select
            value={addWonDesigner}
            onChange={setAddWonDesigner}
            options={designerOptions}
          />
        </FormField>

        {/* Launch Fee */}
        <FormField label="Launch Fee">
          <Input
            value={addWonLaunchFee}
            onChange={setAddWonLaunchFee}
            placeholder="0"
            type="number"
          />
        </FormField>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <input
            type="checkbox"
            checked={addWonSplitPayments}
            onChange={(e) => setAddWonSplitPayments(e.target.checked)}
            style={{ accentColor: Z.ultramarine }}
          />
          <span style={{ fontSize: 12, color: Z.textSecondary }}>
            Split into payments
          </span>
          {addWonSplitPayments && (
            <input
              type="number"
              value={addWonSplitCount}
              onChange={(e) => setAddWonSplitCount(e.target.value)}
              min="2"
              max="12"
              style={{
                width: 60,
                padding: "4px 8px",
                borderRadius: 6,
                border: `1px solid ${Z.border}`,
                fontSize: 12,
                outline: "none",
                color: Z.textPrimary,
              }}
            />
          )}
        </div>

        {addWonSplitPayments && addWonLaunchFee && (
          <div
            style={{
              background: Z.bg,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              fontSize: 12,
              color: Z.textSecondary,
            }}
          >
            {Number(addWonSplitCount) > 0 &&
              Array.from({ length: Number(addWonSplitCount) }).map(
                (_, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>
                    Payment {i + 1}:{" "}
                    <strong>
                      {fmt(
                        Number(addWonLaunchFee) / Number(addWonSplitCount)
                      )}
                    </strong>
                  </div>
                )
              )}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 8,
          }}
        >
          <Btn
            variant="secondary"
            onClick={() => {
              setAddWonOpen(false);
              resetAddWonForm();
            }}
          >
            Cancel
          </Btn>
          <Btn onClick={submitAddWonDeal}>Create Won Deal</Btn>
        </div>
      </Modal>
    </div>
  );
}
