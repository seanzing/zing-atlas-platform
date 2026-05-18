"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { Modal, FormField, Input, Select, Btn } from "@/components/ui";
import { Z, fmt, STRIPE_PRICE_IDS } from "@/lib/constants";

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
    <div style={{ fontSize: 12, color: Z.textMuted, marginTop: 4, padding: "6px 0" }}>No existing contacts found - will create new</div>
  );
  return (
    <div style={{ border: `1px solid ${Z.border}`, borderRadius: 8, marginTop: 4, overflow: "hidden", background: "#fff", position: "absolute", zIndex: 50, width: "100%", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      {results.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id, c.name || "", c.company || "")}
          style={{ width: "100%", textAlign: "left", padding: "10px 12px", fontSize: 13, background: "none", border: "none", borderBottom: `1px solid ${Z.borderLight}`, cursor: "pointer", display: "flex", flexDirection: "column", gap: 2 }}
        >
          <span style={{ fontWeight: 600, color: Z.textPrimary }}>{c.name || "-"}</span>
          {(c.company || c.email) && (
            <span style={{ fontSize: 11, color: Z.textMuted }}>{[c.company, c.email].filter(Boolean).join(" · ")}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// TakeSaleForm removed - both payment flows now use Stripe Checkout
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
  // createdDeal removed — no longer needed (payment flows use Stripe Checkout)
  const [sendLinkEmail, setSendLinkEmail] = useState("");

  // Pre-fill from existingDeal when in raise-sale mode
  useEffect(() => {
    if (existingDeal && open) {
      setProductId(existingDeal.productId || "");
      setDealValue(existingDeal.value ? String(Number(existingDeal.value)) : "");
      setRep(existingDeal.rep || "");
      setSendLinkEmail(existingDeal.contact?.email || "");
    }
  }, [existingDeal, open]);

  function reset() {
    setContactSearch(""); setLinkedContactId(""); setCustomerName(""); setBusinessName(""); setEmail(""); setPhone("");
    setRep(""); setWonDate(toYMD(new Date())); setDomainType(""); setDomainName(""); setExistingUrl("");
    setDealType("new"); setProductId(""); setDealValue("");
    setDesignerCallDate(""); setDeliveryDate(""); setDesigner("");
    setLaunchFee(""); setSplitPayments(false); setSplitCount("2");
    setIndustry(""); setMarketingComments("");
    setSubmitting(false); setError(null);
    setSendLinkEmail(""); setLinkSentSuccess(null);
    setColourSchemeNotes(""); setService1(""); setService2(""); setService3(""); setService4(""); setService5(""); setService6(""); setDesignerBriefNotes("");
  }

  const handleClose = useCallback(() => { reset(); onClose(); }, [onClose]);

  // Options
  const productOptions = useMemo(() => {
    const prods = (products ?? []).filter((p) => ["DISCOVER","BOOST","DOMINATE"].some((t) => (p.description ?? "").toUpperCase().includes(t)));
    prods.sort((a, b) => Number(a.price) - Number(b.price));
    return [{ value: "", label: "Select product..." }, ...prods.map((p) => ({ value: p.id, label: `${p.description} - $${Number(p.price)}/mo` }))];
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

  // Stable ref — defined outside callbacks so exhaustive-deps is happy
  const getStripePriceId = useCallback((pid: string): string | null => {
    const p = (products ?? []).find((pr) => pr.id === pid);
    const desc = p?.description?.toUpperCase() ?? "";
    if (desc.includes("DISCOVER")) return STRIPE_PRICE_IDS.DISCOVER;
    if (desc.includes("BOOST")) return STRIPE_PRICE_IDS.BOOST;
    if (desc.includes("DOMINATE")) return STRIPE_PRICE_IDS.DOMINATE;
    return null;
  }, [products]);

  // Submit - create or mark won

  // ── Send Link handler: moves deal to 'link-sent' stage, emails payment link - does NOT mark as won
  const [linkSentSuccess, setLinkSentSuccess] = useState<string | null>(null);

  // Shared: create contact + deal (if new sale), then return dealId + contact info
  const ensureDeal = useCallback(async (): Promise<{ dealId: string; contactName: string; contactEmail: string } | null> => {
    if (existingDeal) {
      return { dealId: existingDeal.id, contactName: existingDeal.contactName || "", contactEmail: existingDeal.contact?.email || sendLinkEmail || "" };
    }
    // New sale - create contact then deal
    let contactId = linkedContactId || null;
    if (!contactId && (customerName.trim() || email.trim())) {
      const cRes = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: customerName.trim() || businessName.trim(), company: businessName.trim() || undefined, email: email.trim() || undefined, phone: phone.trim() || undefined }) });
      if (cRes.ok) { const c = await cRes.json(); contactId = c.id; }
    }
    const title = businessName.trim() || customerName.trim();
    const dRes = await fetch("/api/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, contactName: customerName.trim() || undefined, contactId: contactId || undefined, stage: "link-sent", dealType, productId: productId || undefined, value: dealValue ? Number(dealValue) : undefined, rep: rep || undefined, domainType: domainType || undefined, domainName: domainName.trim() || undefined }) });
    if (!dRes.ok) { const err = await dRes.json(); throw new Error(err.error || "Failed to create deal"); }
    const deal = await dRes.json();
    return { dealId: deal.id, contactName: customerName.trim() || businessName.trim(), contactEmail: email.trim() };
  }, [existingDeal, linkedContactId, customerName, businessName, email, phone, sendLinkEmail, dealType, productId, dealValue, rep, domainType, domainName]);

  // Send Link - emails Stripe Checkout URL to customer, moves deal to link-sent
  const handleSendLink = useCallback(async () => {
    if (!productId) { setError("Select a product first"); return; }
    const targetEmail = sendLinkEmail || email.trim();
    if (!targetEmail) { setError("Customer email is required to send a payment link"); return; }
    setSubmitting(true); setError(null);
    try {
      const priceId = getStripePriceId(productId);
      if (!priceId) { setError("No Stripe price configured for this product. Select DISCOVER, BOOST, or DOMINATE."); setSubmitting(false); return; }
      const p = (products ?? []).find((pr) => pr.id === productId);
      const dealInfo = await ensureDeal();
      if (!dealInfo) { setError("Failed to prepare deal"); setSubmitting(false); return; }
      const linkRes = await fetch("/api/stripe/payment-link", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: dealInfo.contactName, email: targetEmail, priceId, dealId: dealInfo.dealId, productName: p?.description || "", sendEmail: true }),
      });
      const linkData = await linkRes.json();
      if (!linkData.success) throw new Error(linkData.error || "Failed to send payment link");
      // Move deal to link-sent if it's an existing deal (ensureDeal already sets link-sent for new deals)
      if (existingDeal?.id) {
        await fetch(`/api/deals/${existingDeal.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "link-sent", rep: rep || undefined }) });
      }
      mutate("/api/deals"); mutate("/api/contacts");
      setLinkSentSuccess(`Payment link sent to ${targetEmail} - deal moved to Link Sent`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setSubmitting(false); }
  }, [existingDeal, sendLinkEmail, email, productId, rep, products, ensureDeal, getStripePriceId]);

  // Take Payment - opens Stripe Checkout in a new tab, moves deal to link-sent
  const handleTakePayment = useCallback(async () => {
    if (!productId) { setError("Select a product first"); return; }
    setSubmitting(true); setError(null);
    try {
      const priceId = getStripePriceId(productId);
      if (!priceId) { setError("No Stripe price configured for this product. Select DISCOVER, BOOST, or DOMINATE."); setSubmitting(false); return; }
      const p = (products ?? []).find((pr) => pr.id === productId);
      const dealInfo = await ensureDeal();
      if (!dealInfo) { setError("Failed to prepare deal"); setSubmitting(false); return; }
      const contactEmail = dealInfo.contactEmail || sendLinkEmail;
      const linkRes = await fetch("/api/stripe/payment-link", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: dealInfo.contactName, email: contactEmail || undefined, priceId, dealId: dealInfo.dealId, productName: p?.description || "", sendEmail: false }),
      });
      const linkData = await linkRes.json();
      if (!linkData.success) throw new Error(linkData.error || "Failed to create payment session");
      // Move deal to link-sent if it's an existing deal
      if (existingDeal?.id) {
        await fetch(`/api/deals/${existingDeal.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "link-sent", rep: rep || undefined }) });
      }
      mutate("/api/deals"); mutate("/api/contacts");
      // Open Stripe Checkout in new tab
      window.open(linkData.checkoutUrl, "_blank");
      setLinkSentSuccess("Payment window opened - deal moved to Link Sent. It moves to Won when payment completes.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setSubmitting(false); }
  }, [existingDeal, sendLinkEmail, productId, rep, products, ensureDeal, getStripePriceId]);



  return (
    <Modal open={open} onClose={handleClose} title={isMarkWon ? `Raise Sale - ${existingDeal?.title ?? ""}` : "New Sale"}>
      <div style={{ maxHeight: "75vh", overflowY: "auto", paddingRight: 4 }}>

        {/* ── SECTION: Contact ── */}
        {!isMarkWon && !linkSentSuccess && (
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
        {!linkSentSuccess && (
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

            {linkSentSuccess ? (
              <div style={{ background: "#d1fae5", border: "1px solid #10b981", borderRadius: 12, padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{linkSentSuccess.startsWith("Payment window") ? "💳" : "📧"}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#065f46", marginBottom: 4 }}>{linkSentSuccess}</div>
                <div style={{ fontSize: 12, color: "#065f46", opacity: 0.8, marginBottom: 16 }}>Deal moves to Won automatically when payment is confirmed.</div>
                <Btn onClick={() => { onSuccess(existingDeal?.title || customerName); handleClose(); }}>Done</Btn>
              </div>
            ) : (
              <>
                {/* Customer email - shown for Send Link; pre-filled if available */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: Z.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Customer Email (for Send Link)</div>
                  <Input value={sendLinkEmail} onChange={setSendLinkEmail} placeholder="customer@example.com" type="email" />
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                  <button
                    disabled={submitting}
                    onClick={handleTakePayment}
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
                    {submitting ? "Opening..." : "💳 Take Payment"}
                  </button>
                  <button
                    disabled={submitting}
                    onClick={handleSendLink}
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
                    {submitting ? "Sending..." : "🔗 Send Link"}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: Z.textMuted, textAlign: "center", marginTop: 8 }}>
                  Take Payment opens a Stripe checkout window. Send Link emails the checkout link to the customer.
                </div>
                <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
                  <button onClick={handleClose} style={{ background: "none", border: "none", color: Z.textMuted, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                </div>
              </>
            )}
          </>
        )}

        {/* Payment section removed — both flows use Stripe Checkout via handleTakePayment / handleSendLink */}
      </div>
    </Modal>
  );
}
