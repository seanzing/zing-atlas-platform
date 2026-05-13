"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Z } from "@/lib/constants";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 8,
  border: `1.5px solid ${Z.border}`,
  fontSize: 15,
  color: Z.textPrimary,
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "Inter, sans-serif",
  transition: "border-color 0.15s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: Z.textPrimary,
  marginBottom: 6,
};

const helperStyle: React.CSSProperties = {
  fontSize: 12,
  color: Z.textSecondary,
  marginTop: 4,
};

const fieldWrapStyle: React.CSSProperties = {
  marginBottom: 20,
};

function GBPInfoFormInner() {
  const searchParams = useSearchParams();
  const contactId = searchParams.get("contact") || null;

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fields, setFields] = useState({
    email: "",
    phone: "",
    primaryIndustry: "",
    tradingHours: "",
    onSiteAppointments: "",
    streetAddress: "",
    city: "",
    state: "",
    postalCode: "",
  });

  const set = (key: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/form-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          formName: "GBP Info",
          formData: fields,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Submission failed. Please try again.");
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: Z.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, sans-serif" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "48px 40px", maxWidth: 480, width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#10b98120", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: Z.textPrimary, margin: "0 0 12px" }}>Thank you!</h2>
          <p style={{ fontSize: 15, color: Z.textSecondary, lineHeight: 1.6, margin: "0 0 32px" }}>
            Your submission has been received. Our team will be in touch shortly.
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 900 }}>Z</div>
            <span style={{ fontSize: 18, fontWeight: 800, color: Z.oxford, letterSpacing: 1 }}>ZING</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: Z.bg, fontFamily: "Inter, sans-serif", padding: "40px 16px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, fontWeight: 900 }}>Z</div>
            <span style={{ fontSize: 20, fontWeight: 800, color: Z.oxford, letterSpacing: 1 }}>ZING</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: Z.textPrimary, margin: "0 0 10px" }}>Google Business Profile Optimization</h1>
          <p style={{ fontSize: 15, color: Z.textSecondary, lineHeight: 1.6, margin: 0 }}>
            Please complete the following information for our team to optimize your Google Business Profile.
          </p>
        </div>

        {/* Form card */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "36px 32px", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
          <form onSubmit={handleSubmit} noValidate>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Email <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="email" required value={fields.email} onChange={set("email")} style={inputStyle} placeholder="you@example.com" />
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Phone Number <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="tel" required value={fields.phone} onChange={set("phone")} style={inputStyle} placeholder="+1 (555) 000-0000" />
              <p style={helperStyle}>This number will be shared publicly</p>
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Primary Industry <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="text" required value={fields.primaryIndustry} onChange={set("primaryIndustry")} style={inputStyle} placeholder="e.g. Plumbing, Dental, Law" />
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Trading Hours <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="text" required value={fields.tradingHours} onChange={set("tradingHours")} style={inputStyle} placeholder="e.g. Mon-Fri 9am-5pm" />
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>On-site appointments? <span style={{ color: "#ef4444" }}>*</span></label>
              <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
                {["Yes", "No"].map((opt) => (
                  <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: Z.textPrimary, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="onSiteAppointments"
                      value={opt}
                      checked={fields.onSiteAppointments === opt}
                      onChange={set("onSiteAppointments")}
                      required
                      style={{ accentColor: Z.turquoise, width: 16, height: 16 }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Street Address <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="text" required value={fields.streetAddress} onChange={set("streetAddress")} style={inputStyle} placeholder="123 Main St" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={fieldWrapStyle}>
                <label style={labelStyle}>City <span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" required value={fields.city} onChange={set("city")} style={inputStyle} placeholder="Denver" />
              </div>
              <div style={fieldWrapStyle}>
                <label style={labelStyle}>State / Region <span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" required value={fields.state} onChange={set("state")} style={inputStyle} placeholder="CO" />
              </div>
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Postal Code <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="text" required value={fields.postalCode} onChange={set("postalCode")} style={inputStyle} placeholder="80202" />
            </div>

            {/* Notice block */}
            <div style={{
              background: "#fffbeb",
              border: `1.5px solid #f59e0b`,
              borderRadius: 10,
              padding: "18px 20px",
              marginBottom: 28,
              fontSize: 14,
              color: Z.textPrimary,
              lineHeight: 1.65,
            }}>
              <p style={{ fontWeight: 700, margin: "0 0 8px", color: "#92400e" }}>PLEASE NOTE</p>
              <p style={{ margin: "0 0 10px" }}>
                We cannot verify, troubleshoot, appeal, unsuspend, or create a Google Business Profile for you. Those services must be done directly through Google. This service is for SEO optimization ONLY. If you do not delegate access to our team using the email below, we CANNOT perform this service.
              </p>
              <p style={{ margin: "0 0 10px" }}>
                Please follow the steps to delegate access to{" "}
                <strong>zinggbsetup@gmail.com</strong> using this link:{" "}
                <a
                  href="https://support.google.com/business/answer/3403100?hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: Z.ultramarine, wordBreak: "break-all" }}
                >
                  https://support.google.com/business/answer/3403100?hl=en
                </a>
              </p>
              <p style={{ margin: 0 }}>Once that has been done, please submit this form!</p>
            </div>

            {error && (
              <div style={{ background: "#fef2f2", border: "1.5px solid #ef4444", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#b91c1c" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "13px 24px",
                borderRadius: 10,
                border: "none",
                background: loading ? Z.textMuted : `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`,
                color: "#fff",
                fontSize: 16,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "Inter, sans-serif",
                transition: "opacity 0.15s",
              }}
            >
              {loading ? "Submitting..." : "Submit"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function GBPInfoPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: Z.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", color: Z.textSecondary }}>
        Loading...
      </div>
    }>
      <GBPInfoFormInner />
    </Suspense>
  );
}
