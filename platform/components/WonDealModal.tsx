"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Modal, FormField, Input, Select, Btn } from "@/components/ui";
import { Z, fmt, STRIPE_PRICE_IDS } from "@/lib/constants";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function toYMD(d: Date) { return d.toISOString().slice(0, 10); }

// ── Types ─────────────────────────────────────────────────────────────────────

interface Product { id: string; description: string; price: number; }
interface TeamMember { id: string; firstName: string; lastName: string | null; department: string | null; }
// Designer interface kept for future use
// interface Designer { id: string; name: string | null; }
interface ContactResult { id: string; name: string | null; company: string | null; email: string | null; }

export interface ExistingDeal {
  id: string;
  title: string;
  contactId: string | null;
  contactName: string | null;
  productId?: string | null;
  value?: number | null;
  rep?: string | null;
  contact?: { name?: string | null; email?: string | null; phone?: string | null; } | null;
}

// ── Contact search dropdown ────────────────────────────────────────────────────

function ContactSearch({
  query,
  contacts,
  onSelect,
}: {
  query: string;
  contacts: ContactResult[];
  onSelect: (id: string, name: string, company: string) => void;
}) {
  const q = query.toLowerCase();
  const results = contacts
    .filter((c) =>
      c.name?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
    .slice(0, 6);
  if (!results.length) return (
    <div style={{ fontSize: 12, color: Z.textMuted, marginTop: 4, padding: "6px 0" }}>No existing contacts found — will create new</div>
  );
  return (
    <div style={{ border: `1px solid ${Z.border}`, borderRadius: 8, marginTop: 4, overflow: "hidden", background: "#fff", position: "absolute", zIndex: 50, width: "100%", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      {results.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id, c.name || "", c.company || "")}
          style={{ width: "100%", textAlign: "left", padding: "10px 12px", fontSize: 13, background: "none", border: "none", borderBottom: `1px solid ${Z.borderLight}`, cursor: "pointer", display: "flex", flexDirection: "column", gap: 2 }}
        >
          <span style={{ fontWeight: 600, color: Z.textPrimary }}>{c.name || "—"}</span>
          {(c.company || c.email) && (
            <span style={{ fontSize: 11, color: Z.textMuted }}>{[c.company, c.email].filter(Boolean).join(" · ")}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── TakeSaleForm (Stripe card entry) ─────────────────────────────────────────

import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";

function TakeSaleForm({
  billingName, setBillingName, billingEmail, setBillingEmail,
  amount, priceId, dealId, contactId, phone,
  loading, setLoading, error, setError, onSuccess,
}: {
  billingName: string; setBillingName: (v: string) => void;
  billingEmail: string; setBillingEmail: (v: string) => void;
  amount: string; priceId: string | null; dealId: string; contactId: string | null;
  phone: string | undefined; loading: boolean; setLoading: (v: boolean) => void;
  error: string | null; setError: (v: string | null) => void;
  onSuccess: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async () => {
    if (!stripe || !elements || !priceId) return;
    setLoading(true);
    setError(null);
    const card = elements.getElement(CardElement);
    if (!card) { setLoading(false); return; }
    const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({ type: "card", card, billing_details: { name: billingName, email: billingEmail } });
    if (pmError) { setError(pmError.message || "Card error"); setLoading(false); return; }
    const res = await fetch("/api/stripe/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethodId: paymentMethod!.id, priceId, name: billingName, email: billingEmail, phone, dealId, contactId }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) { onSuccess("Payment successful — subscription active!"); mutate("/api/deals"); mutate("/api/ar"); }
    else setError(data.error || "Payment failed");
  };

  return (
    <div>
      <FormField label="Cardholder Name">
        <Input value={billingName} onChange={setBillingName} placeholder="Name on card" />
      </FormField>
      <FormField label="Email for Receipt">
        <Input value={billingEmail} onChange={setBillingEmail} placeholder="customer@example.com" type="email" />
      </FormField>
      <div style={{ border: `1px solid ${Z.border}`, borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
        <CardElement options={{ style: { base: { fontSize: "14px", color: Z.textPrimary } } }} />
      </div>
      {error && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 8 }}>{error}</div>}
      <Btn disabled={loading || !stripe || !priceId} onClick={handleSubmit}>
        {loading ? "Processing..." : `Charge ${amount ? fmt(Number(amount)) : ""}/mo`}
      </Btn>
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────

export function WonDealModal({
  open,
  onClose,
  onSuccess,
  existingDeal,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (title: string) => void;
  existingDeal?: ExistingDeal | null;
}) {
  const { data: products } = useSWR<Product[]>("/api/products", fetcher);
  const { data: team } = useSWR<TeamMember[]>("/api/team", fetcher);
  // designers endpoint replaced by team members filtered by Design dept
  // const { data: designers } = useSWR<Designer[]>("/api/designers", fetcher);
  const { data: allContacts } = useSWR<ContactResult[]>("/api/contacts", fetcher);

  const isMarkWon = !!existingDeal;

  // ── Contact fields (new sale mode only) ──
  const [contactSearch, setContactSearch] = useState("");
  const [linkedContactId, setLinkedContactId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // ── Deal fields ──
  const [rep, setRep] = useState("");
  const [wonDate, setWonDate] = useState(toYMD(new Date()));
  const [domainType, setDomainType] = useState<"" | "existing" | "new">("");
  const [domainName, setDomainName] = useState("");
  const [existingUrl, setExistingUrl] = useState("");

  // ── Product & value ──
  const [dealType, setDealType] = useState("new");
  const [productId, setProductId] = useState("");
  const [dealValue, setDealValue] = useState("");

  // ── Fulfillment ──
  const [designerCallDate, setDesignerCallDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [designer, setDesigner] = useState("");

  // ── Launch fee ──
  const [launchFee, setLaunchFee] = useState("");
  const [splitPayments, setSplitPayments] = useState(false);
  const [splitCount, setSplitCount] = useState("2");

  // ── Additional ──
  const [industry, setIndustry] = useState("");
  const [marketingComments, setMarketingComments] = useState("");
  const [colourSchemeNotes, setColourSchemeNotes] = useState("");
  const [service1, setService1] = useState("");
  const [service2, setService2] = useState("");
  const [service3, setService3] = useState("");
  const [service4, setService4] = useState("");
  const [service5, setService5] = useState("");
  const [service6, setService6] = useState("");
  const [designerBriefNotes, setDesignerBriefNotes] = useState("");

  // ── Submission / payment state ──
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdDeal, setCreatedDeal] = useState<{ id: string; contactId: string | null; contactName: string | null; contact?: ExistingDeal["contact"] } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"take-sale" | "send-link">("take-sale");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [paymentLinkUrl, setPaymentLinkUrl] = useState<string | null>(null);
  const [sendLinkEmail, setSendLinkEmail] = useState("");
  const [billingName, setBillingName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  // Pre-fill from existingDeal when in mark-won mode
  useEffect(() => {
    if (existingDeal && open) {
      setProductId(existingDeal.productId || "");
      setDealValue(existingDeal.value ? String(Number(existingDeal.value)) : "");
      setRep(existingDeal.rep || "");
      setBillingName(existingDeal.contactName || existingDeal.contact?.name || "");
      setSendLinkEmail(existingDeal.contact?.email || "");
      setBillingEmail(existingDeal.contact?.email || "");
    }
  }, [existingDeal, open]);

  function reset() {
    setContactSearch(""); setLinkedContactId(""); setCustomerName(""); setBusinessName(""); setEmail(""); setPhone("");
    setRep(""); setWonDate(toYMD(new Date())); setDomainType(""); setDomainName(""); setExistingUrl("");
    setDealType("new"); setProductId(""); setDealValue("");
    setDesignerCallDate(""); setDeliveryDate(""); setDesigner("");
    setLaunchFee(""); setSplitPayments(false); setSplitCount("2");
    setIndustry(""); setMarketingComments("");
    setSubmitting(false); setError(null); setCreatedDeal(null);
    setPaymentMethod("take-sale"); setPaymentLoading(false); setPaymentError(null);
    setPaymentSuccess(null); setPaymentLinkUrl(null); setSendLinkEmail(""); setBillingName(""); setBillingEmail(""); setLinkCopied(false);
  }

  const handleClose = useCallback(() => { reset(); onClose(); }, [onClose]);

  // Options
  const productOptions = useMemo(() => {
    const prods = (products ?? []).filter((p) => ["DISCOVER","BOOST","DOMINATE"].some((t) => (p.description ?? "").toUpperCase().includes(t)));
    prods.sort((a, b) => Number(a.price) - Number(b.price));
    return [{ value: "", label: "Select product..." }, ...prods.map((p) => ({ value: p.id, label: `${p.description} — $${Number(p.price)}/mo` }))];
  }, [products]);

  const repOptions = useMemo(() => [
    { value: "", label: "Select rep..." },
    ...(team ?? []).map((m) => ({ value: `${m.firstName} ${m.lastName || ""}`.trim(), label: `${m.firstName} ${m.lastName || ""}`.trim() })),
  ], [team]);

  const designerOptions = useMemo(() => [
    { value: "", label: "Select designer..." },
    ...(team ?? []).filter((m) => m.department === "Design").map((m) => ({
      value: `${m.firstName} ${m.lastName || ""}`.trim(),
      label: `${m.firstName} ${m.lastName || ""}`.trim(),
    })),
  ], [team]);

  function getStripePriceId(pid: string): string | null {
    const p = (products ?? []).find((pr) => pr.id === pid);
    const desc = p?.description?.toUpperCase() ?? "";
    if (desc.includes("DISCOVER")) return STRIPE_PRICE_IDS.DISCOVER;
    if (desc.includes("BOOST")) return STRIPE_PRICE_IDS.BOOST;
    if (desc.includes("DOMINATE")) return STRIPE_PRICE_IDS.DOMINATE;
    return null;
  }

  // Submit — create or mark won
  const handleSubmit = useCallback(async () => {
    if (!isMarkWon && !customerName.trim() && !businessName.trim()) {
      setError("Customer name or business name is required"); return;
    }
    if (!isMarkWon && !domainType) {
      setError("Domain preference is required"); return;
    }
    if (!isMarkWon && !domainName.trim()) {
      setError(domainType === "existing" ? "Existing domain is required" : "Requested domain is required"); return;
    }

    setSubmitting(true); setError(null);
    try {
      let contactId = linkedContactId || existingDeal?.contactId || null;

      // Create contact if needed (new sale, no existing linked)
      if (!isMarkWon && !contactId && (customerName.trim() || email.trim())) {
        const cRes = await fetch("/api/contacts", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: customerName.trim() || businessName.trim(), company: businessName.trim() || undefined, email: email.trim() || undefined, phone: phone.trim() || undefined }),
        });
        if (cRes.ok) { const c = await cRes.json(); contactId = c.id; }
        else { const err = await cRes.json(); throw new Error(err.error || "Failed to create contact"); }
      }

      let dealId: string;
      let dealContactId: string | null = contactId;
      let dealContactName: string | null = null;
      let dealContact: ExistingDeal["contact"] = null;

      if (isMarkWon && existingDeal) {
        // PATCH existing deal to won
        const res = await fetch(`/api/deals/${existingDeal.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage: "won", dealType, productId: productId || undefined, value: dealValue ? Number(dealValue) : undefined,
            deliveryDate: deliveryDate || undefined, designerCallDate: designerCallDate || undefined,
            assignedDesigner: designer || undefined,
            launchFeeAmount: launchFee ? Number(launchFee) : undefined, rep: rep || undefined,
            wonDate: wonDate || undefined, domainType: domainType || undefined, domainName: domainName.trim() || undefined,
            existingUrl: existingUrl.trim() || undefined,
            colourSchemeNotes: colourSchemeNotes.trim() || undefined,
            service1: service1.trim() || undefined, service2: service2.trim() || undefined,
            service3: service3.trim() || undefined, service4: service4.trim() || undefined,
            service5: service5.trim() || undefined, service6: service6.trim() || undefined,
            designerNotes: designerBriefNotes.trim() || undefined,
          }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to mark deal as won"); }
        dealId = existingDeal.id;
        dealContactId = existingDeal.contactId;
        dealContactName = existingDeal.contactName;
        dealContact = existingDeal.contact ?? null;
      } else {
        // POST new deal as won
        const title = businessName.trim() || customerName.trim();
        const res = await fetch("/api/deals", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title, contactName: customerName.trim() || undefined, contactId: contactId || undefined,
            stage: "won", dealType, productId: productId || undefined, value: dealValue ? Number(dealValue) : undefined,
            rep: rep || undefined, wonDate: wonDate || undefined, deliveryDate: deliveryDate || undefined,
            designerCallDate: designerCallDate || undefined,
            assignedDesigner: designer || undefined, launchFeeAmount: launchFee ? Number(launchFee) : undefined,
            domainType: domainType || undefined, domainName: domainName.trim() || undefined,
            existingUrl: existingUrl.trim() || undefined,
            colourSchemeNotes: colourSchemeNotes.trim() || undefined,
            service1: service1.trim() || undefined, service2: service2.trim() || undefined,
            service3: service3.trim() || undefined, service4: service4.trim() || undefined,
            service5: service5.trim() || undefined, service6: service6.trim() || undefined,
            designerNotes: designerBriefNotes.trim() || undefined,
          }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to create deal"); }
        const deal = await res.json();
        dealId = deal.id;
        dealContactName = deal.contactName;
      }

      await mutate("/api/deals");
      mutate("/api/onboarding?status=active");
      mutate("/api/contacts");

      setCreatedDeal({ id: dealId, contactId: dealContactId, contactName: dealContactName, contact: dealContact });
      setBillingName(dealContactName || customerName.trim() || "");
      setSendLinkEmail(dealContact?.email || email.trim() || "");
      setBillingEmail(dealContact?.email || email.trim() || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }, [isMarkWon, existingDeal, linkedContactId, customerName, businessName, email, phone, domainType, domainName, dealType, productId, dealValue, rep, wonDate, designerCallDate, deliveryDate, designer, launchFee, existingUrl, colourSchemeNotes, service1, service2, service3, service4, service5, service6, designerBriefNotes]);

  const activeDeal = createdDeal ?? (existingDeal ? { id: existingDeal.id, contactId: existingDeal.contactId, contactName: existingDeal.contactName, contact: existingDeal.contact } : null);
  const showPayment = !!createdDeal;

  return (
    <Modal open={open} onClose={handleClose} title={isMarkWon ? `Mark as Won — ${existingDeal?.title ?? ""}` : "New Sale"}>
      <div style={{ maxHeight: "75vh", overflowY: "auto", paddingRight: 4 }}>

        {/* ── SECTION: Contact ── */}
        {!isMarkWon && !createdDeal && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: Z.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Contact</div>

            {/* Existing contact search */}
            <FormField label="Search Existing Contact">
              <div style={{ position: "relative" }}>
                <Input
                  value={contactSearch}
                  onChange={(v) => { setContactSearch(v); setLinkedContactId(""); }}
                  placeholder="Type name, company, or email..."
                />
                {contactSearch.length >= 2 && !linkedContactId && (
                  <ContactSearch
                    query={contactSearch}
                    contacts={allContacts ?? []}
                    onSelect={(id, name, company) => {
                      setLinkedContactId(id);
                      setContactSearch(`${name}${company ? ` · ${company}` : ""}`);
                      if (!customerName) setCustomerName(name);
                      if (!businessName) setBusinessName(company);
                    }}
                  />
                )}
              </div>
              {linkedContactId && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: "#10b981", fontWeight: 700 }}>✓ Linked to existing contact</span>
                  <button onClick={() => { setLinkedContactId(""); setContactSearch(""); }} style={{ fontSize: 11, color: Z.textMuted, background: "none", border: "none", cursor: "pointer" }}>clear</button>
                </div>
              )}
            </FormField>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormField label="Customer Name *">
                <Input value={customerName} onChange={setCustomerName} placeholder="Jane Smith" />
              </FormField>
              <FormField label="Business Name *">
                <Input value={businessName} onChange={setBusinessName} placeholder="Acme Corp" />
              </FormField>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormField label="Email">
                <Input value={email} onChange={setEmail} placeholder="jane@acme.com" type="email" />
              </FormField>
              <FormField label="Phone">
                <Input value={phone} onChange={setPhone} placeholder="(555) 123-4567" />
              </FormField>
            </div>
          </div>
        )}

        {/* ── SECTION: Deal Info ── */}
        {!createdDeal && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: Z.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Deal</div>

            {/* Deal type */}
            <FormField label="Deal Type">
              <div style={{ display: "flex", gap: 8 }}>
                {["new", "upgrade", "add-on"].map((t) => (
                  <button key={t} onClick={() => setDealType(t)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: dealType === t ? `2px solid ${Z.ultramarine}` : `1px solid ${Z.border}`, background: dealType === t ? `${Z.ultramarine}10` : "transparent", color: dealType === t ? Z.ultramarine : Z.textSecondary, fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>
                    {t === "add-on" ? "Add-on" : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </FormField>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormField label="Product">
                <Select value={productId} onChange={(pid) => { setProductId(pid); const p = (products ?? []).find((pr) => pr.id === pid); if (p) setDealValue(String(Number(p.price))); }} options={productOptions} />
              </FormField>
              <FormField label="MRR ($)">
                <Input value={dealValue} onChange={setDealValue} placeholder="0" type="number" />
              </FormField>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormField label="Rep">
                <Select value={rep} onChange={setRep} options={repOptions} />
              </FormField>
              <FormField label="Won Date">
                <Input value={wonDate} onChange={setWonDate} type="date" />
              </FormField>
            </div>

            {/* Domain */}
            {!isMarkWon && (
              <>
                <FormField label="Domain Preference *">
                  <Select value={domainType} onChange={(v) => { setDomainType(v as "" | "existing" | "new"); setDomainName(""); }} options={[{ value: "", label: "Select..." }, { value: "existing", label: "Customer has an existing domain" }, { value: "new", label: "Customer needs a new domain" }]} />
                </FormField>
                {domainType !== "" && (
                  <FormField label={domainType === "existing" ? "Existing Domain *" : "Requested Domain *"}>
                    <Input value={domainName} onChange={setDomainName} placeholder={domainType === "existing" ? "acme.com" : "acmeplumbing.com"} />
                  </FormField>
                )}
                <FormField label="Existing Website URL">
                  <Input value={existingUrl} onChange={setExistingUrl} placeholder="https://acme.com" />
                </FormField>
              </>
            )}

            {/* Fulfillment */}
            <div style={{ fontSize: 11, fontWeight: 700, color: Z.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, marginTop: 8 }}>Fulfillment</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormField label="Designer Call Date">
                <Input value={designerCallDate} onChange={setDesignerCallDate} type="date" />
              </FormField>
              <FormField label="Delivery Date">
                <Input value={deliveryDate} onChange={setDeliveryDate} type="date" />
              </FormField>
              <FormField label="Designer">
                <Select value={designer} onChange={setDesigner} options={designerOptions} />
              </FormField>
            </div>

            {/* Launch fee */}
            <FormField label="Launch Fee ($)">
              <Input value={launchFee} onChange={setLaunchFee} placeholder="0" type="number" />
            </FormField>
            {launchFee && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <input type="checkbox" checked={splitPayments} onChange={(e) => setSplitPayments(e.target.checked)} style={{ accentColor: Z.ultramarine }} />
                <span style={{ fontSize: 12, color: Z.textSecondary }}>Split into</span>
                {splitPayments && (
                  <input type="number" value={splitCount} onChange={(e) => setSplitCount(e.target.value)} min="2" max="12" style={{ width: 50, padding: "4px 8px", borderRadius: 6, border: `1px solid ${Z.border}`, fontSize: 12, outline: "none", color: Z.textPrimary }} />
                )}
                <span style={{ fontSize: 12, color: Z.textSecondary }}>payments</span>
              </div>
            )}
            {splitPayments && launchFee && Number(splitCount) > 0 && (
              <div style={{ background: Z.bg, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: Z.textSecondary }}>
                {Array.from({ length: Number(splitCount) }).map((_, i) => (
                  <div key={i}>Payment {i + 1}: <strong>{fmt(Number(launchFee) / Number(splitCount))}</strong></div>
                ))}
              </div>
            )}

            {/* Additional info */}
            <div style={{ fontSize: 11, fontWeight: 700, color: Z.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, marginTop: 8 }}>Additional Info</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormField label="Industry">
                <Input value={industry} onChange={setIndustry} placeholder="e.g. Plumbing, HVAC" />
              </FormField>
              <FormField label="Marketing Comments">
                <Input value={marketingComments} onChange={setMarketingComments} placeholder="Notes for marketing team" />
              </FormField>
            </div>

            {/* Design Brief */}
            <div style={{ borderTop: `1px solid ${Z.border}`, paddingTop: 16, marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: Z.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Design Brief</div>
              <FormField label="Existing Website URL">
                <Input value={existingUrl} onChange={setExistingUrl} placeholder="https://theircurrentsite.com" />
              </FormField>
              <FormField label="Colour Scheme Notes">
                <Input value={colourSchemeNotes} onChange={setColourSchemeNotes} placeholder="e.g. Blues and greens, modern feel..." />
              </FormField>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormField label="Service 1"><Input value={service1} onChange={setService1} placeholder="e.g. Plumbing" /></FormField>
                <FormField label="Service 2"><Input value={service2} onChange={setService2} placeholder="e.g. Emergency repairs" /></FormField>
                <FormField label="Service 3"><Input value={service3} onChange={setService3} placeholder="Service 3" /></FormField>
                <FormField label="Service 4"><Input value={service4} onChange={setService4} placeholder="Service 4" /></FormField>
                <FormField label="Service 5"><Input value={service5} onChange={setService5} placeholder="Service 5" /></FormField>
                <FormField label="Service 6"><Input value={service6} onChange={setService6} placeholder="Service 6" /></FormField>
              </div>
              <FormField label="Notes for Designer">
                <Input value={designerBriefNotes} onChange={setDesignerBriefNotes} placeholder="Any design guidance for the team..." />
              </FormField>
            </div>

            {error && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 12, fontWeight: 600 }}>{error}</div>}

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button
                disabled={submitting}
                onClick={() => { setPaymentMethod("take-sale"); handleSubmit(); }}
                style={{
                  flex: 1, padding: "16px 0", borderRadius: 12,
                  background: `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`,
                  border: "none", color: "#fff", fontSize: 15, fontWeight: 800,
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                  boxShadow: "0 4px 14px rgba(58,90,255,0.35)",
                  transition: "all 0.15s",
                }}
              >
                {submitting ? "Processing..." : "💳 Take Payment"}
              </button>
              <button
                disabled={submitting}
                onClick={() => { setPaymentMethod("send-link"); handleSubmit(); }}
                style={{
                  flex: 1, padding: "16px 0", borderRadius: 12,
                  background: "transparent",
                  border: `2px solid ${Z.ultramarine}`,
                  color: Z.ultramarine, fontSize: 15, fontWeight: 800,
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                  transition: "all 0.15s",
                }}
              >
                {submitting ? "Processing..." : "🔗 Send Link"}
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
              <button onClick={handleClose} style={{ background: "none", border: "none", color: Z.textMuted, fontSize: 12, cursor: "pointer" }}>Cancel</button>
            </div>
          </>
        )}

        {/* ── SECTION: Payment (after won) ── */}
        {showPayment && activeDeal && (
          <div>
            <div style={{ background: "#d1fae5", border: "1px solid #10b981", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, fontWeight: 700, color: "#065f46" }}>
              ✓ Deal marked as won — onboarding created
            </div>

            {!paymentSuccess ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: Z.textPrimary, marginBottom: 16 }}>
                  {paymentMethod === "take-sale" ? "💳 Take Payment" : "🔗 Send Payment Link"}
                </div>

                {paymentMethod === "take-sale" && (
                  !stripePromise ? (
                    <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, padding: 12, fontSize: 12, color: "#92400e" }}>Stripe publishable key not configured.</div>
                  ) : (
                    <Elements stripe={stripePromise} options={{ appearance: { theme: "stripe" } } as StripeElementsOptions}>
                      <TakeSaleForm
                        billingName={billingName} setBillingName={setBillingName}
                        billingEmail={billingEmail} setBillingEmail={setBillingEmail}
                        amount={dealValue} priceId={getStripePriceId(productId)}
                        dealId={activeDeal.id} contactId={activeDeal.contactId}
                        phone={activeDeal.contact?.phone ?? undefined}
                        loading={paymentLoading} setLoading={setPaymentLoading}
                        error={paymentError} setError={setPaymentError}
                        onSuccess={(msg) => setPaymentSuccess(msg)}
                      />
                    </Elements>
                  )
                )}

                {paymentMethod === "send-link" && (
                  paymentSuccess ? null : (
                    <div>
                      <div style={{ fontSize: 13, color: Z.textSecondary, marginBottom: 12 }}>
                        A payment link will be emailed directly to the customer.
                      </div>
                      <FormField label="Customer Email">
                        <Input value={sendLinkEmail} onChange={setSendLinkEmail} placeholder="customer@example.com" />
                      </FormField>
                      {paymentLinkUrl && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ background: "#d1fae5", border: "1px solid #10b981", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#065f46", fontWeight: 600, marginBottom: 8 }}>
                            ✓ Payment link emailed to {sendLinkEmail}
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <input readOnly value={paymentLinkUrl} style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: `1px solid ${Z.border}`, fontSize: 11, outline: "none", background: Z.bg, color: Z.textMuted }} />
                            <Btn variant="secondary" onClick={() => { navigator.clipboard.writeText(paymentLinkUrl); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }}>
                              {linkCopied ? "Copied!" : "Copy"}
                            </Btn>
                          </div>
                        </div>
                      )}
                      {paymentError && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 8 }}>{paymentError}</div>}
                      {!paymentLinkUrl && (
                        <Btn disabled={paymentLoading || !sendLinkEmail || !productId} onClick={async () => {
                          setPaymentLoading(true); setPaymentError(null);
                          try {
                            const priceId = getStripePriceId(productId);
                            if (!priceId) { setPaymentError("No Stripe price for this product."); setPaymentLoading(false); return; }
                            const p = (products ?? []).find((pr) => pr.id === productId);
                            const res = await fetch("/api/stripe/payment-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: activeDeal.contactName || customerName, email: sendLinkEmail, priceId, dealId: activeDeal.id, productName: p?.description || "", sendEmail: true }) });
                            const data = await res.json();
                            if (data.success) setPaymentLinkUrl(data.checkoutUrl);
                            else setPaymentError(data.error || "Failed to send link");
                          } catch { setPaymentError("Network error"); }
                          setPaymentLoading(false);
                        }}>
                          {paymentLoading ? "Sending..." : "Send Payment Link"}
                        </Btn>
                      )}
                    </div>
                  )
                )}
              </>
            ) : (
              <div style={{ background: "#d1fae5", border: "1px solid #10b981", borderRadius: 10, padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>✓</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#065f46" }}>{paymentSuccess}</div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <Btn onClick={() => { onSuccess(existingDeal?.title || businessName || customerName); handleClose(); }}>
                {paymentSuccess ? "Done" : "Skip Payment"}
              </Btn>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
