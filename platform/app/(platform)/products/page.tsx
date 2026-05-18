"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { PageLoader } from "@/components/PageLoader";
import { Badge, Btn, Modal, FormField, Input, Select } from "@/components/ui";
import {
  Z,
  fmt,
  PRODUCT_COLORS,
  COMPONENT_LIBRARY,
  PRODUCT_BUNDLES,
  COMPONENT_GROUPS,
} from "@/lib/constants";
import type { StatusOption, ComponentKey } from "@/lib/constants";
import { useAuthContext } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  description: string;
  price: number;
  category: string;
  commissionType: string | null;
  commissionValue: number | null;
  launchFeeCommissionRate: number | null;
  _count?: { taskTemplates: number };
}

interface TaskTemplateRow {
  id?: string;
  taskType: string;
  taskName: string;
  taskOrder: number;
  ownerRole: string;
  daysOffset: number;
  isConditional: boolean;
  statusOptions: StatusOption[];
}

const TASK_TYPES = [
  { value: "website", label: "Website Design" },
  { value: "logo", label: "Logo" },
  { value: "gbp", label: "GBP Optimization" },
  { value: "landing_pages", label: "Landing Pages" },
  { value: "ai_chat", label: "AI Chat" },
  { value: "directories", label: "Local Directories" },
  { value: "blogs", label: "Blogs" },
  { value: "social_media", label: "Social Media" },
  { value: "email_marketing", label: "Email Marketing" },
  { value: "sms_marketing", label: "SMS Marketing" },
  { value: "bookings", label: "Online Bookings" },
  { value: "ecommerce", label: "Ecommerce" },
  { value: "publishing", label: "Publishing" },
  { value: "custom", label: "Custom" },
];

const ROLE_BADGE_COLORS: Record<string, string> = {
  designer: Z.violet,
  marketing: Z.bluejeans,
  onboarding_specialist: Z.turquoise,
  publishing: Z.ultramarine,
  custom: Z.grey,
};

const ROLE_LABELS: Record<string, string> = {
  designer: "Designer",
  marketing: "Marketing",
  onboarding_specialist: "Onboarding",
  publishing: "Publishing",
  custom: "Custom",
};

const OWNER_ROLES = [
  { value: "designer", label: "Designer" },
  { value: "onboarding_specialist", label: "Onboarding Specialist" },
  { value: "publishing", label: "Publishing" },
  { value: "marketing", label: "Marketing" },
  { value: "custom", label: "Custom" },
];

function defaultStatusOptions(): StatusOption[] {
  return [
    { value: "not_started", label: "Not Started", triggerEmail: false, triggerSms: false, triggerNextTask: false },
    { value: "in_progress", label: "In Progress", triggerEmail: false, triggerSms: false, triggerNextTask: false },
    { value: "completed", label: "Completed", triggerEmail: true, triggerSms: false, triggerNextTask: false },
  ];
}

function getComponentKeysFromBasePlan(basePlan: string): Set<ComponentKey> {
  const keys = PRODUCT_BUNDLES[basePlan];
  return keys ? new Set(keys) : new Set();
}

function componentKeysToTasks(keys: ComponentKey[]): TaskTemplateRow[] {
  return keys.map((key, idx) => {
    const comp = COMPONENT_LIBRARY[key];
    return {
      taskType: comp.taskType,
      taskName: comp.name,
      taskOrder: idx,
      ownerRole: comp.ownerRole,
      daysOffset: comp.daysOffset,
      isConditional: false,
      statusOptions: [...comp.statusOptions],
    };
  });
}

export default function ProductsPage() {
  const { isAdmin, loading: authLoading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAdmin, router]);

  const { data: products, mutate: mutateProducts } = useSWR<Product[]>("/api/products");

  // Product commission edit modal
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodCommValue, setProdCommValue] = useState("1");
  const [prodLaunchRate, setProdLaunchRate] = useState("20");

  // Product Builder modal
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderStep, setBuilderStep] = useState(1);
  const [builderMode, setBuilderMode] = useState<"new" | "clone" | "edit-tasks">("new");
  const [editProductId, setEditProductId] = useState<string | null>(null);

  // Product details (Step 1)
  const [pbName, setPbName] = useState("");
  const [pbPrice, setPbPrice] = useState("");
  const [pbCategory, setPbCategory] = useState("subscription-monthly");
  const [pbBasePlan, setPbBasePlan] = useState("Custom");
  const [pbCommValue, setPbCommValue] = useState("1");
  const [pbLaunchRate, setPbLaunchRate] = useState("20");
  const [pbStripePriceId, setPbStripePriceId] = useState("");

  // Tasks (Step 2)
  const [pbTasks, setPbTasks] = useState<TaskTemplateRow[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<Set<ComponentKey>>(new Set());
  const [showCustomTasks, setShowCustomTasks] = useState(false);
  const [customTasks, setCustomTasks] = useState<TaskTemplateRow[]>([]);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdCommValue(String(p.commissionValue ?? 0));
    setProdLaunchRate(String(Math.round((p.launchFeeCommissionRate ?? 0) * 100)));
    setProdModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commissionValue: isNaN(parseFloat(prodCommValue)) ? 0 : parseFloat(prodCommValue),
          launchFeeCommissionRate: isNaN(parseFloat(prodLaunchRate)) ? 0 : parseFloat(prodLaunchRate) / 100,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      mutateProducts();
      setProdModalOpen(false);
      setEditingProduct(null);
    } catch {
      showToast("Failed to save product");
    }
  };

  const openNewProduct = () => {
    setBuilderMode("new");
    setEditProductId(null);
    setPbName("");
    setPbPrice("");
    setPbCategory("subscription-monthly");
    setPbBasePlan("Custom");
    setPbCommValue("1");
    setPbLaunchRate("20");
    setPbStripePriceId("");
    setPbTasks([]);
    setSelectedComponents(new Set());
    setCustomTasks([]);
    setShowCustomTasks(false);
    setBuilderStep(1);
    setBuilderOpen(true);
  };

  const openCloneProduct = async (p: Product) => {
    setBuilderMode("clone");
    setEditProductId(null);
    setPbName(`Copy of ${p.description}`);
    setPbPrice(String(p.price));
    setPbCategory(p.category || "subscription-monthly");
    setPbBasePlan("Custom");
    setPbCommValue(String(p.commissionValue ?? 1));
    setPbLaunchRate(String(Math.round((p.launchFeeCommissionRate ?? 0.2) * 100)));
    setPbStripePriceId((p as Product & { stripePriceId?: string }).stripePriceId || "");
    setBuilderStep(1);
    setShowCustomTasks(false);

    const res = await fetch(`/api/products/${p.id}/tasks`);
    if (res.ok) {
      const tasks = await res.json();
      const loadedTasks = tasks.map((t: TaskTemplateRow & { id: string }) => ({
        taskType: t.taskType,
        taskName: t.taskName,
        taskOrder: t.taskOrder,
        ownerRole: t.ownerRole || "designer",
        daysOffset: t.daysOffset,
        isConditional: t.isConditional,
        statusOptions: (t.statusOptions || []) as StatusOption[],
      }));
      setPbTasks(loadedTasks);

      const compKeys = new Set<ComponentKey>();
      const customs: TaskTemplateRow[] = [];
      for (const task of loadedTasks) {
        const matchKey = (Object.keys(COMPONENT_LIBRARY) as ComponentKey[]).find(
          (k) => COMPONENT_LIBRARY[k].name === task.taskName
        );
        if (matchKey) {
          compKeys.add(matchKey);
        } else {
          customs.push(task);
        }
      }
      setSelectedComponents(compKeys);
      setCustomTasks(customs);
      if (customs.length > 0) setShowCustomTasks(true);
    } else {
      setPbTasks([]);
      setSelectedComponents(new Set());
      setCustomTasks([]);
    }

    setBuilderOpen(true);
  };

  const openEditTasks = async (p: Product) => {
    setBuilderMode("edit-tasks");
    setEditProductId(p.id);
    setPbName(p.description);
    setPbPrice(String(p.price));
    setPbCategory(p.category || "subscription-monthly");
    setPbBasePlan("Custom");
    setPbCommValue(String(p.commissionValue ?? 1));
    setPbLaunchRate(String(Math.round((p.launchFeeCommissionRate ?? 0.2) * 100)));
    setPbStripePriceId((p as Product & { stripePriceId?: string }).stripePriceId || "");
    setBuilderStep(2);
    setShowCustomTasks(false);

    const res = await fetch(`/api/products/${p.id}/tasks`);
    if (res.ok) {
      const tasks = await res.json();
      const loadedTasks = tasks.map((t: TaskTemplateRow & { id: string }) => ({
        id: t.id,
        taskType: t.taskType,
        taskName: t.taskName,
        taskOrder: t.taskOrder,
        ownerRole: t.ownerRole || "designer",
        daysOffset: t.daysOffset,
        isConditional: t.isConditional,
        statusOptions: (t.statusOptions || []) as StatusOption[],
      }));
      setPbTasks(loadedTasks);

      const compKeys = new Set<ComponentKey>();
      const customs: TaskTemplateRow[] = [];
      for (const task of loadedTasks) {
        const matchKey = (Object.keys(COMPONENT_LIBRARY) as ComponentKey[]).find(
          (k) => COMPONENT_LIBRARY[k].name === task.taskName
        );
        if (matchKey) {
          compKeys.add(matchKey);
        } else {
          customs.push(task);
        }
      }
      setSelectedComponents(compKeys);
      setCustomTasks(customs);
      if (customs.length > 0) setShowCustomTasks(true);
    }

    setBuilderOpen(true);
  };

  useEffect(() => {
    if (builderStep === 1 && pbBasePlan !== "Custom" && builderMode !== "edit-tasks") {
      setSelectedComponents(getComponentKeysFromBasePlan(pbBasePlan));
      setCustomTasks([]);
      setShowCustomTasks(false);
    } else if (builderStep === 1 && pbBasePlan === "Custom" && builderMode === "new") {
      setSelectedComponents(new Set());
      setCustomTasks([]);
    }
  }, [pbBasePlan, builderStep, builderMode]);

  useEffect(() => {
    const compTasks = componentKeysToTasks(Array.from(selectedComponents));
    const allTasks = [...compTasks, ...customTasks].map((t, i) => ({ ...t, taskOrder: i }));
    setPbTasks(allTasks);
  }, [selectedComponents, customTasks]);

  const toggleComponent = (key: ComponentKey) => {
    setSelectedComponents((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSaveBuilder = async () => {
    setSaving(true);
    try {
      if (builderMode === "edit-tasks" && editProductId) {
        const existingRes = await fetch(`/api/products/${editProductId}/tasks`);
        const existingTasks: (TaskTemplateRow & { id: string })[] = existingRes.ok ? await existingRes.json() : [];
        const existingIds = new Set(existingTasks.map((t) => t.id));
        const currentIds = new Set(pbTasks.filter((t) => t.id).map((t) => t.id));

        for (const t of existingTasks) {
          if (!currentIds.has(t.id)) {
            await fetch(`/api/products/${editProductId}/tasks/${t.id}`, { method: "DELETE" });
          }
        }

        for (const t of pbTasks) {
          if (t.id && existingIds.has(t.id)) {
            await fetch(`/api/products/${editProductId}/tasks/${t.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                taskType: t.taskType,
                taskName: t.taskName,
                taskOrder: t.taskOrder,
                ownerRole: t.ownerRole,
                daysOffset: t.daysOffset,
                isConditional: t.isConditional,
                statusOptions: t.statusOptions,
              }),
            });
          } else {
            await fetch(`/api/products/${editProductId}/tasks`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                taskType: t.taskType,
                taskName: t.taskName,
                taskOrder: t.taskOrder,
                ownerRole: t.ownerRole,
                daysOffset: t.daysOffset,
                isConditional: t.isConditional,
                statusOptions: t.statusOptions,
              }),
            });
          }
        }

        mutateProducts();
        showToast("Tasks updated successfully");
        setBuilderOpen(false);
      } else {
        const productRes = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: pbName,
            price: parseFloat(pbPrice) || 0,
            category: pbCategory,
            commissionType: pbCategory === "one-time" ? "one-time" : "subscription",
            commissionValue: isNaN(parseFloat(pbCommValue)) ? 0 : parseFloat(pbCommValue),
            launchFeeCommissionRate: isNaN(parseFloat(pbLaunchRate)) ? 0 : parseFloat(pbLaunchRate) / 100,
            stripePriceId: pbStripePriceId.trim() || null,
          }),
        });

        if (!productRes.ok) {
          showToast("Failed to create product");
          setSaving(false);
          return;
        }

        const newProduct = await productRes.json();

        for (const t of pbTasks) {
          await fetch(`/api/products/${newProduct.id}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              taskType: t.taskType,
              taskName: t.taskName,
              taskOrder: t.taskOrder,
              ownerRole: t.ownerRole,
              daysOffset: t.daysOffset,
              isConditional: t.isConditional,
              statusOptions: t.statusOptions,
            }),
          });
        }

        mutateProducts();
        showToast("Product created successfully");
        setBuilderOpen(false);
      }
    } catch {
      showToast("Error saving product");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return null;
  if (!products) return <PageLoader />;

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
          Products
        </h1>
        <p style={{ fontSize: 14, color: Z.textSecondary, margin: "4px 0 0 0" }}>
          Manage subscription tiers and onboarding task templates
        </p>
      </div>

      {/* Products list */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 14, color: Z.textSecondary }}>
          {products.length} products
        </div>
        <Btn onClick={openNewProduct}>+ New Product</Btn>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        {products.map((p) => {
          const color = PRODUCT_COLORS[p.id] || Z.ultramarine;
          const taskCount = p._count?.taskTemplates ?? 0;
          return (
            <div
              key={p.id}
              style={{
                background: Z.card,
                borderRadius: 16,
                border: `1px solid ${Z.border}`,
                padding: "24px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: `linear-gradient(90deg, ${color}, ${color}44)`,
                }}
              />
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: Z.textPrimary,
                  marginBottom: 12,
                }}
              >
                {p.description}
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color,
                  marginBottom: 16,
                }}
              >
                {fmt(p.price)}
                <span style={{ fontSize: 14, fontWeight: 600, color: Z.textMuted }}>
                  /mo
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                <Badge label={p.category || "subscription"} color={color} />
                <Badge
                  label={`${p.commissionValue ?? 1}× | ${Math.round((p.launchFeeCommissionRate ?? 0.2) * 100)}%`}
                  color={Z.textSecondary}
                />
                <Badge label={`${taskCount} tasks`} color={Z.bluejeans} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn small variant="secondary" onClick={() => openEditTasks(p)}>
                  Edit
                </Btn>
                <Btn small variant="secondary" onClick={() => openCloneProduct(p)}>
                  Clone
                </Btn>
                <Btn small variant="secondary" onClick={() => openEditProduct(p)}>
                  Commission
                </Btn>
              </div>
            </div>
          );
        })}

        {products.length === 0 && (
          <div
            style={{
              padding: 48,
              textAlign: "center",
              color: Z.textMuted,
              fontSize: 14,
            }}
          >
            No products found
          </div>
        )}
      </div>

      {/* Product Commission Modal */}
      <Modal
        open={prodModalOpen}
        onClose={() => {
          setProdModalOpen(false);
          setEditingProduct(null);
        }}
        title={editingProduct ? `Edit ${editingProduct.description}` : "Edit Product"}
      >
        <FormField label="Subscription Commission (multiplier)">
          <Input
            value={prodCommValue}
            onChange={setProdCommValue}
            placeholder="1"
            type="number"
          />
          <div style={{ fontSize: 11, color: Z.textMuted, marginTop: 4 }}>
            1 = 1x the subscription price (e.g. {fmt(editingProduct?.price ?? 0)} deal ={" "}
            {fmt((editingProduct?.price ?? 0) * (parseFloat(prodCommValue) || 1))} commission)
          </div>
        </FormField>
        <FormField label="Launch Fee Commission (%)">
          <Input
            value={prodLaunchRate}
            onChange={setProdLaunchRate}
            placeholder="20"
            type="number"
          />
          <div style={{ fontSize: 11, color: Z.textMuted, marginTop: 4 }}>
            Applied to the launch fee amount (e.g. 20% of {fmt(500)} ={" "}
            {fmt((500 * (parseFloat(prodLaunchRate) || 20)) / 100)})
          </div>
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
              setProdModalOpen(false);
              setEditingProduct(null);
            }}
          >
            Cancel
          </Btn>
          <Btn onClick={handleSaveProduct}>Save Changes</Btn>
        </div>
      </Modal>

      {/* Product Builder Full-Screen Modal */}
      {builderOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={() => setBuilderOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(5,5,54,0.4)",
              backdropFilter: "blur(4px)",
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: Z.card,
              border: `1px solid ${Z.border}`,
              borderRadius: 20,
              width: "90vw",
              maxWidth: 900,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 24px 80px rgba(5,5,54,0.25)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "24px 32px 20px",
                borderBottom: `1px solid ${Z.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: Z.textPrimary }}>
                  {builderMode === "edit-tasks"
                    ? `Edit Tasks — ${pbName}`
                    : builderMode === "clone"
                    ? "Clone Product"
                    : "New Product"}
                </div>
                {builderMode !== "edit-tasks" && (
                  <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                    {[1, 2, 3].map((step) => (
                      <div
                        key={step}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          color:
                            builderStep === step
                              ? Z.ultramarine
                              : builderStep > step
                              ? "#10b981"
                              : Z.textMuted,
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background:
                              builderStep === step
                                ? Z.ultramarine
                                : builderStep > step
                                ? "#10b981"
                                : Z.bg,
                            color: builderStep >= step ? "#fff" : Z.textMuted,
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {builderStep > step ? "✓" : step}
                        </div>
                        {step === 1 ? "Details" : step === 2 ? "Tasks" : "Review"}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setBuilderOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: Z.textMuted,
                  cursor: "pointer",
                  fontSize: 20,
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "24px 32px", overflowY: "auto", flex: 1 }}>
              {/* Step 1 — Product Details */}
              {builderStep === 1 && (
                <div style={{ maxWidth: 500 }}>
                  <FormField label="Product Name">
                    <Input
                      value={pbName}
                      onChange={setPbName}
                      placeholder="e.g. April BOOST Special"
                    />
                  </FormField>
                  <FormField
                    label={
                      pbCategory === "one-time"
                        ? "One-Time Fee ($)"
                        : "Price per month ($)"
                    }
                  >
                    <Input
                      value={pbPrice}
                      onChange={setPbPrice}
                      placeholder={pbCategory === "one-time" ? "999" : "149"}
                      type="number"
                    />
                  </FormField>
                  <FormField label="Category">
                    <Select
                      value={pbCategory}
                      onChange={setPbCategory}
                      options={[
                        { value: "subscription-monthly", label: "Subscription (Monthly)" },
                        { value: "subscription-annual", label: "Subscription (Annual)" },
                        { value: "one-time", label: "One-Time" },
                      ]}
                    />
                  </FormField>
                  <FormField label="Base Plan">
                    <Select
                      value={pbBasePlan}
                      onChange={setPbBasePlan}
                      options={[
                        { value: "Custom", label: "Custom (empty)" },
                        {
                          value: "DISCOVER",
                          label: `DISCOVER (${PRODUCT_BUNDLES.DISCOVER.length} components)`,
                        },
                        {
                          value: "BOOST",
                          label: `BOOST (${PRODUCT_BUNDLES.BOOST.length} components)`,
                        },
                        {
                          value: "DOMINATE",
                          label: `DOMINATE (${PRODUCT_BUNDLES.DOMINATE.length} components)`,
                        },
                      ]}
                    />
                    <div style={{ fontSize: 11, color: Z.textMuted, marginTop: 4 }}>
                      Selecting a base plan pre-selects its components in Step 2. You can
                      add or remove any.
                    </div>
                  </FormField>
                  {pbCategory === "one-time" ? (
                    <FormField label="Commission (% of sale)">
                      <Input
                        value={pbLaunchRate}
                        onChange={setPbLaunchRate}
                        placeholder="20"
                        type="number"
                      />
                    </FormField>
                  ) : (
                    <>
                      <FormField label="Subscription Commission (multiplier)">
                        <Input
                          value={pbCommValue}
                          onChange={setPbCommValue}
                          placeholder="1"
                          type="number"
                        />
                      </FormField>
                      <FormField label="Launch Fee Commission (%)">
                        <Input
                          value={pbLaunchRate}
                          onChange={setPbLaunchRate}
                          placeholder="20"
                          type="number"
                        />
                      </FormField>
                    </>
                  )}
                  <FormField label="Stripe Price ID">
                    <Input
                      value={pbStripePriceId}
                      onChange={setPbStripePriceId}
                      placeholder="price_1ABC... (from Stripe dashboard)"
                    />
                    <div style={{ fontSize: 11, color: Z.textMuted, marginTop: 4 }}>
                      Paste the Price ID from your Stripe product. Required for Take Payment and Send Link.
                    </div>
                  </FormField>
                </div>
              )}

              {/* Step 2 — Component Picker + Custom Tasks */}
              {builderStep === 2 && (
                <div>
                  <div style={{ marginBottom: 32 }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: Z.textPrimary,
                        marginBottom: 4,
                      }}
                    >
                      Select Components
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: Z.textSecondary,
                        marginBottom: 20,
                      }}
                    >
                      Click to add or remove. Each component comes pre-configured with the
                      right team, timeline, and status workflow.
                    </div>

                    {COMPONENT_GROUPS.map((group) => (
                      <div key={group.label} style={{ marginBottom: 20 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: Z.textMuted,
                            textTransform: "uppercase",
                            letterSpacing: 0.8,
                            marginBottom: 8,
                          }}
                        >
                          {group.label}
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: 10,
                          }}
                        >
                          {group.keys.map((key) => {
                            const comp = COMPONENT_LIBRARY[key];
                            const isSelected = selectedComponents.has(key);
                            return (
                              <button
                                key={key}
                                onClick={() => toggleComponent(key)}
                                style={{
                                  position: "relative",
                                  padding: "14px 16px",
                                  borderRadius: 12,
                                  border: `2px solid ${
                                    isSelected ? Z.turquoise : Z.border
                                  }`,
                                  background: isSelected
                                    ? `${Z.ultramarine}08`
                                    : Z.card,
                                  cursor: "pointer",
                                  textAlign: "left",
                                  transition: "all 0.15s",
                                }}
                              >
                                {isSelected && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: 8,
                                      right: 8,
                                      width: 20,
                                      height: 20,
                                      borderRadius: "50%",
                                      background: Z.turquoise,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "#fff",
                                      fontSize: 12,
                                      fontWeight: 800,
                                    }}
                                  >
                                    &#10003;
                                  </div>
                                )}
                                <div
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: Z.textPrimary,
                                    marginBottom: 8,
                                    paddingRight: isSelected ? 24 : 0,
                                  }}
                                >
                                  {comp.name}
                                </div>
                                <div
                                  style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                                >
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      padding: "2px 8px",
                                      borderRadius: 10,
                                      color: "#fff",
                                      background:
                                        ROLE_BADGE_COLORS[comp.ownerRole] || Z.grey,
                                    }}
                                  >
                                    {ROLE_LABELS[comp.ownerRole] || comp.ownerRole}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      padding: "2px 8px",
                                      borderRadius: 10,
                                      color: Z.textSecondary,
                                      background: Z.bg,
                                      border: `1px solid ${Z.border}`,
                                    }}
                                  >
                                    {comp.daysOffset} days
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: Z.ultramarine,
                        padding: "10px 0",
                      }}
                    >
                      {selectedComponents.size} component
                      {selectedComponents.size !== 1 ? "s" : ""} selected
                      {customTasks.length > 0 &&
                        ` + ${customTasks.length} custom task${
                          customTasks.length !== 1 ? "s" : ""
                        }`}
                    </div>
                  </div>

                  {/* Custom Tasks */}
                  <div style={{ borderTop: `1px solid ${Z.border}`, paddingTop: 20 }}>
                    {!showCustomTasks ? (
                      <button
                        onClick={() => setShowCustomTasks(true)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 700,
                          color: Z.ultramarine,
                          padding: 0,
                        }}
                      >
                        + Add Custom Task
                      </button>
                    ) : (
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: Z.textPrimary,
                            marginBottom: 12,
                          }}
                        >
                          Custom Tasks
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: Z.textSecondary,
                            marginBottom: 16,
                          }}
                        >
                          For one-off tasks not in the standard library.
                        </div>

                        {customTasks.map((task, idx) => (
                          <div
                            key={idx}
                            style={{
                              background: Z.bg,
                              border: `1px solid ${Z.border}`,
                              borderRadius: 12,
                              marginBottom: 12,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr 1fr 80px 80px",
                                gap: 8,
                                padding: "12px 16px",
                                alignItems: "center",
                              }}
                            >
                              <input
                                value={task.taskName}
                                onChange={(e) => {
                                  setCustomTasks((prev) =>
                                    prev.map((t, i) =>
                                      i === idx ? { ...t, taskName: e.target.value } : t
                                    )
                                  );
                                }}
                                placeholder="Task name"
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  border: `1px solid ${Z.border}`,
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: Z.textPrimary,
                                  background: Z.card,
                                  outline: "none",
                                  width: "100%",
                                  boxSizing: "border-box",
                                }}
                              />
                              <select
                                value={task.taskType}
                                onChange={(e) => {
                                  setCustomTasks((prev) =>
                                    prev.map((t, i) =>
                                      i === idx ? { ...t, taskType: e.target.value } : t
                                    )
                                  );
                                }}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  border: `1px solid ${Z.border}`,
                                  fontSize: 12,
                                  color: Z.textPrimary,
                                  background: Z.card,
                                  outline: "none",
                                  width: "100%",
                                  boxSizing: "border-box",
                                }}
                              >
                                {TASK_TYPES.map((t) => (
                                  <option key={t.value} value={t.value}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={task.ownerRole}
                                onChange={(e) => {
                                  setCustomTasks((prev) =>
                                    prev.map((t, i) =>
                                      i === idx ? { ...t, ownerRole: e.target.value } : t
                                    )
                                  );
                                }}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  border: `1px solid ${Z.border}`,
                                  fontSize: 12,
                                  color: Z.textPrimary,
                                  background: Z.card,
                                  outline: "none",
                                  width: "100%",
                                  boxSizing: "border-box",
                                }}
                              >
                                {OWNER_ROLES.map((r) => (
                                  <option key={r.value} value={r.value}>
                                    {r.label}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                value={task.daysOffset}
                                onChange={(e) => {
                                  setCustomTasks((prev) =>
                                    prev.map((t, i) =>
                                      i === idx
                                        ? { ...t, daysOffset: parseInt(e.target.value) || 0 }
                                        : t
                                    )
                                  );
                                }}
                                style={{
                                  padding: "6px 8px",
                                  borderRadius: 6,
                                  border: `1px solid ${Z.border}`,
                                  fontSize: 12,
                                  color: Z.textPrimary,
                                  background: Z.card,
                                  outline: "none",
                                  width: "100%",
                                  boxSizing: "border-box",
                                  textAlign: "center",
                                }}
                                title="Days to complete"
                              />
                              <button
                                onClick={() => {
                                  setCustomTasks((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                style={{
                                  background: "none",
                                  border: `1px solid #ef444425`,
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  color: "#ef4444",
                                  fontSize: 13,
                                  padding: "6px 12px",
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={() => {
                            setCustomTasks((prev) => [
                              ...prev,
                              {
                                taskType: "custom",
                                taskName: "",
                                taskOrder: 0,
                                ownerRole: "designer",
                                daysOffset: 14,
                                isConditional: false,
                                statusOptions: defaultStatusOptions(),
                              },
                            ]);
                          }}
                          style={{
                            background: "none",
                            border: `2px dashed ${Z.border}`,
                            borderRadius: 12,
                            padding: "14px",
                            fontSize: 13,
                            fontWeight: 700,
                            color: Z.ultramarine,
                            cursor: "pointer",
                            width: "100%",
                            transition: "border-color 0.2s",
                          }}
                        >
                          + Add Custom Task
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3 — Review */}
              {builderStep === 3 && (
                <div>
                  <div
                    style={{
                      background: Z.bg,
                      borderRadius: 12,
                      padding: 24,
                      border: `1px solid ${Z.border}`,
                      marginBottom: 24,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: Z.textPrimary,
                        marginBottom: 8,
                      }}
                    >
                      {pbName || "Untitled Product"}
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <div>
                        <span
                          style={{
                            fontSize: 11,
                            color: Z.textMuted,
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          Price
                        </span>
                        <div
                          style={{
                            fontSize: 24,
                            fontWeight: 800,
                            color: Z.ultramarine,
                          }}
                        >
                          {fmt(parseFloat(pbPrice) || 0)}
                          {pbCategory !== "one-time" ? "/mo" : ""}
                        </div>
                      </div>
                      <div>
                        <span
                          style={{
                            fontSize: 11,
                            color: Z.textMuted,
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          Commission
                        </span>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: Z.textPrimary,
                          }}
                        >
                          {pbCategory === "one-time"
                            ? `${pbLaunchRate}% of sale`
                            : `${pbCommValue}x sub | ${pbLaunchRate}% launch`}
                        </div>
                      </div>
                      <div>
                        <span
                          style={{
                            fontSize: 11,
                            color: Z.textMuted,
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          Tasks
                        </span>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: Z.textPrimary,
                          }}
                        >
                          {pbTasks.length} onboarding tasks
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: Z.textPrimary,
                      marginBottom: 12,
                    }}
                  >
                    Task List ({pbTasks.length})
                  </div>

                  {pbTasks.map((t, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 16px",
                        background: Z.card,
                        border: `1px solid ${Z.border}`,
                        borderRadius: 8,
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: Z.textMuted,
                            width: 20,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: Z.textPrimary,
                          }}
                        >
                          {t.taskName || "Untitled"}
                        </span>
                        {t.isConditional && <Badge label="Add-on" color={Z.violet} />}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Badge label={t.ownerRole} color={Z.bluejeans} />
                        <span style={{ fontSize: 11, color: Z.textMuted }}>
                          {t.daysOffset}d
                        </span>
                        <span style={{ fontSize: 11, color: Z.textMuted }}>
                          {t.statusOptions.length} statuses
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "16px 32px 24px",
                borderTop: `1px solid ${Z.border}`,
                display: "flex",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div>
                {builderStep > 1 && builderMode !== "edit-tasks" && (
                  <Btn variant="secondary" onClick={() => setBuilderStep((s) => s - 1)}>
                    Back
                  </Btn>
                )}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn variant="secondary" onClick={() => setBuilderOpen(false)}>
                  Cancel
                </Btn>
                {builderMode === "edit-tasks" ? (
                  <Btn onClick={handleSaveBuilder} style={{ opacity: saving ? 0.6 : 1 }}>
                    {saving ? "Saving..." : "Save Tasks"}
                  </Btn>
                ) : builderStep < 3 ? (
                  <Btn onClick={() => setBuilderStep((s) => s + 1)}>
                    {builderStep === 1 ? "Next: Tasks" : "Next: Review"}
                  </Btn>
                ) : (
                  <Btn onClick={handleSaveBuilder} style={{ opacity: saving ? 0.6 : 1 }}>
                    {saving ? "Saving..." : "Save Product"}
                  </Btn>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
