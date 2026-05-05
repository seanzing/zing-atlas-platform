"use client";

import { useState, useMemo, useCallback } from "react";
import useSWR, { mutate } from "swr";
import { Modal, FormField, Input, Select, Btn } from "@/components/ui";

interface Product {
  id: string;
  description: string;
  price: number;
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string | null;
}

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function NewSaleModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (businessName: string) => void;
}) {
  const { data: products } = useSWR<Product[]>("/api/products");
  const { data: team } = useSWR<TeamMember[]>("/api/team");

  const [customerName, setCustomerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [existingUrl, setExistingUrl] = useState("");
  const [productId, setProductId] = useState("");
  const [rep, setRep] = useState("");
  const [wonDate, setWonDate] = useState(toYMD(new Date()));
  const [dealValue, setDealValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productOptions = useMemo(() => {
    const prods = products ?? [];
    const tiers = ["DISCOVER", "BOOST", "DOMINATE"];
    const filtered = prods.filter((p) =>
      tiers.some((t) => (p.description ?? "").toUpperCase().includes(t))
    );
    const sorted = filtered.sort((a, b) => Number(a.price) - Number(b.price));
    return [
      { value: "", label: "Select product..." },
      ...sorted.map((p) => {
        const price = Number(p.price);
        return {
          value: p.id,
          label: `${p.description} — $${price}/mo`,
        };
      }),
    ];
  }, [products]);

  const repOptions = useMemo(
    () => [
      { value: "", label: "Select rep..." },
      ...(team ?? []).map((m) => ({
        value: m.firstName,
        label: `${m.firstName} ${m.lastName || ""}`.trim(),
      })),
    ],
    [team]
  );

  const handleProductChange = useCallback(
    (pid: string) => {
      setProductId(pid);
      const p = (products ?? []).find((pr) => pr.id === pid);
      if (p) setDealValue(String(Number(p.price)));
    },
    [products]
  );

  function resetForm() {
    setCustomerName("");
    setBusinessName("");
    setEmail("");
    setPhone("");
    setExistingUrl("");
    setProductId("");
    setRep("");
    setWonDate(toYMD(new Date()));
    setDealValue("");
    setError(null);
  }

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!customerName.trim()) {
      setError("Customer name is required");
      return;
    }
    if (!businessName.trim()) {
      setError("Business name is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Create contact
      const contactRes = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          company: businessName.trim(),
        }),
      });

      if (!contactRes.ok) {
        const err = await contactRes.json();
        throw new Error(err.error || "Failed to create contact");
      }

      const contact = await contactRes.json();

      // 2. Create deal as won (auto-creates onboarding)
      const dealRes = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: businessName.trim(),
          contactName: customerName.trim(),
          company: businessName.trim(),
          contactId: contact.id,
          productId: productId || undefined,
          rep: rep || undefined,
          stage: "won",
          value: dealValue ? Number(dealValue) : undefined,
          wonDate: wonDate || undefined,
          existingUrl: existingUrl.trim() || undefined,
        }),
      });

      if (!dealRes.ok) {
        const err = await dealRes.json();
        throw new Error(err.error || "Failed to create deal");
      }

      // Refresh data
      mutate("/api/deals");
      mutate("/api/onboarding?status=active");
      mutate("/api/contacts");

      const bName = businessName.trim();
      resetForm();
      onSuccess(bName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }, [customerName, businessName, email, phone, existingUrl, productId, rep, wonDate, dealValue, onSuccess]);

  return (
    <Modal open={open} onClose={handleClose} title="New Sale">
      <div>
        <FormField label="Customer Name *">
          <Input value={customerName} onChange={setCustomerName} placeholder="John Smith" />
        </FormField>

        <FormField label="Business Name *">
          <Input value={businessName} onChange={setBusinessName} placeholder="Acme Corp" />
        </FormField>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="Email">
            <Input value={email} onChange={setEmail} placeholder="john@acme.com" type="email" />
          </FormField>
          <FormField label="Phone">
            <Input value={phone} onChange={setPhone} placeholder="(555) 123-4567" />
          </FormField>
        </div>

        <FormField label="Existing Website URL">
          <Input value={existingUrl} onChange={setExistingUrl} placeholder="https://acme.com" />
        </FormField>

        <FormField label="Product">
          <Select value={productId} onChange={handleProductChange} options={productOptions} />
        </FormField>

        <FormField label="Rep">
          <Select value={rep} onChange={setRep} options={repOptions} />
        </FormField>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="Won Date">
            <Input value={wonDate} onChange={setWonDate} type="date" />
          </FormField>
          <FormField label="Deal Value ($/mo)">
            <Input value={dealValue} onChange={setDealValue} placeholder="0" type="number" />
          </FormField>
        </div>

        {error && (
          <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 12, fontWeight: 600 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <Btn variant="secondary" onClick={handleClose}>
            Cancel
          </Btn>
          <Btn onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating..." : "Create Sale"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
