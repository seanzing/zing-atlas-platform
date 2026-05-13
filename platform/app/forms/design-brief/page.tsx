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

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 100,
  resize: "vertical",
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

const sectionHeadStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: Z.textPrimary,
  margin: "32px 0 4px",
  paddingBottom: 8,
  borderBottom: `2px solid ${Z.turquoise}`,
};

const sectionNoteStyle: React.CSSProperties = {
  fontSize: 13,
  color: Z.textSecondary,
  marginBottom: 20,
  lineHeight: 1.5,
};

function DesignBriefFormInner() {
  const searchParams = useSearchParams();
  const contactId = searchParams.get("contact") || null;

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fields, setFields] = useState({
    firstName: "",
    lastName: "",
    email: "",
    personalPhone: "",
    companyPhone: "",
    companyName: "",
    streetAddress: "",
    city: "",
    state: "",
    postalCode: "",
    publishAddress: "",
    existingWebsiteUrl: "",
    refreshLookAndFeel: "",
    colorScheme: "",
    existingLogo: "",
    contactUsInfo: "",
    aboutUs: "",
    services: "",
    mainCallToAction: "",
    socialMediaLinks: "",
    comments: "",
    satisfactionAgreement: false,
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
          formName: "Design Brief",
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
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, fontWeight: 900 }}>Z</div>
            <span style={{ fontSize: 20, fontWeight: 800, color: Z.oxford, letterSpacing: 1 }}>ZING</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: Z.textPrimary, margin: "0 0 10px" }}>Design Brief</h1>
          <p style={{ fontSize: 15, color: Z.textSecondary, lineHeight: 1.6, margin: 0, maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
            Welcome to ZING -- we are delighted to be working with you! Please provide the following information to assist with the foundation of your website.
          </p>
        </div>

        {/* Form card */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "36px 32px", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
          <form onSubmit={handleSubmit} noValidate>

            {/* Contact Information */}
            <h2 style={sectionHeadStyle}>Contact Information</h2>
            <p style={sectionNoteStyle}>This is the information our team will use to contact you and will not be published on the site.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={fieldWrapStyle}>
                <label style={labelStyle}>First Name <span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" required value={fields.firstName} onChange={set("firstName")} style={inputStyle} placeholder="Jane" />
              </div>
              <div style={fieldWrapStyle}>
                <label style={labelStyle}>Last Name <span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" required value={fields.lastName} onChange={set("lastName")} style={inputStyle} placeholder="Smith" />
              </div>
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Email <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="email" required value={fields.email} onChange={set("email")} style={inputStyle} placeholder="you@example.com" />
              <p style={helperStyle}>This is the email our team will contact you at</p>
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Personal Phone <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="tel" required value={fields.personalPhone} onChange={set("personalPhone")} style={inputStyle} placeholder="+1 (555) 000-0000" />
              <p style={helperStyle}>This is the number our team will contact you at</p>
            </div>

            {/* Company Information */}
            <h2 style={sectionHeadStyle}>Company Information</h2>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Company Phone <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="tel" required value={fields.companyPhone} onChange={set("companyPhone")} style={inputStyle} placeholder="+1 (555) 000-0000" />
              <p style={helperStyle}>This is the phone number that will be published on your website</p>
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Company Name <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="text" required value={fields.companyName} onChange={set("companyName")} style={inputStyle} placeholder="Acme Corp" />
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

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Publish address on site? <span style={{ color: "#ef4444" }}>*</span></label>
              <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
                {["Yes", "No"].map((opt) => (
                  <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: Z.textPrimary, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      value={opt}
                      checked={fields.publishAddress === opt}
                      onChange={() => setFields((prev) => ({ ...prev, publishAddress: opt }))}
                      style={{ accentColor: Z.turquoise, width: 16, height: 16 }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Existing website URL</label>
              <input type="url" value={fields.existingWebsiteUrl} onChange={set("existingWebsiteUrl")} style={inputStyle} placeholder="https://yoursite.com" />
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Refresh existing look and feel? <span style={{ color: "#ef4444" }}>*</span></label>
              <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
                {["Yes", "No"].map((opt) => (
                  <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: Z.textPrimary, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="refreshLookAndFeel"
                      value={opt}
                      checked={fields.refreshLookAndFeel === opt}
                      onChange={set("refreshLookAndFeel")}
                      required
                      style={{ accentColor: Z.turquoise, width: 16, height: 16 }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Color Scheme <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="text" required value={fields.colorScheme} onChange={set("colorScheme")} style={inputStyle} placeholder="e.g. Blue and white, earth tones" />
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Existing logo? <span style={{ color: "#ef4444" }}>*</span></label>
              <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
                {["Yes", "No"].map((opt) => (
                  <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: Z.textPrimary, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="existingLogo"
                      value={opt}
                      checked={fields.existingLogo === opt}
                      onChange={set("existingLogo")}
                      required
                      style={{ accentColor: Z.turquoise, width: 16, height: 16 }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Contact Us Information <span style={{ color: "#ef4444" }}>*</span></label>
              <textarea required value={fields.contactUsInfo} onChange={set("contactUsInfo")} style={textareaStyle} placeholder="Business email and phone number if different from above" />
              <p style={helperStyle}>Business email and phone number if different from above</p>
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>About Us Information <span style={{ color: "#ef4444" }}>*</span></label>
              <textarea required value={fields.aboutUs} onChange={set("aboutUs")} style={textareaStyle} placeholder="Ex: been in business for 20 years" />
              <p style={helperStyle}>Ex: been in business for 20 years</p>
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Services <span style={{ color: "#ef4444" }}>*</span></label>
              <textarea required value={fields.services} onChange={set("services")} style={textareaStyle} placeholder="List the services you offer" />
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Main Call-To-Action <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="text" required value={fields.mainCallToAction} onChange={set("mainCallToAction")} style={inputStyle} placeholder="Ex: phone call / email / free quote or demo / fill out form" />
              <p style={helperStyle}>Ex: phone call / email / free quote or demo / fill out form</p>
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Social Media Links</label>
              <textarea value={fields.socialMediaLinks} onChange={set("socialMediaLinks")} style={{ ...textareaStyle, minHeight: 80 }} placeholder="Facebook, Instagram, LinkedIn, etc." />
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Comments</label>
              <textarea value={fields.comments} onChange={set("comments")} style={textareaStyle} placeholder="Any comments, website examples, etc." />
              <p style={helperStyle}>Any comments, website examples, etc.</p>
            </div>

            {/* Satisfaction Guarantee */}
            <div style={{
              background: `${Z.turquoise}18`,
              border: `1.5px solid ${Z.turquoise}`,
              borderRadius: 10,
              padding: "18px 20px",
              marginBottom: 24,
              fontSize: 14,
              color: Z.textPrimary,
              lineHeight: 1.65,
            }}>
              <p style={{ fontWeight: 700, margin: "0 0 8px", color: Z.oxford }}>Zing Satisfaction Guarantee</p>
              <p style={{ margin: 0 }}>
                No contract! We know you will love our value and product. A one-time Website Developer and Mobile Optimization Fee will be charged two-weeks after the start of your subscription. The publication fee covers domain management, SSL security, website migration, and developer administration.
              </p>
            </div>

            <div style={{ ...fieldWrapStyle, display: "flex", alignItems: "flex-start", gap: 12 }}>
              <input
                type="checkbox"
                id="satisfactionAgreement"
                required
                checked={fields.satisfactionAgreement}
                onChange={(e) => setFields((prev) => ({ ...prev, satisfactionAgreement: e.target.checked }))}
                style={{ accentColor: Z.turquoise, width: 18, height: 18, marginTop: 2, flexShrink: 0 }}
              />
              <label htmlFor="satisfactionAgreement" style={{ fontSize: 14, color: Z.textPrimary, cursor: "pointer", lineHeight: 1.5 }}>
                I agree <span style={{ color: "#ef4444" }}>*</span>
              </label>
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

export default function DesignBriefPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: Z.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", color: Z.textSecondary }}>
        Loading...
      </div>
    }>
      <DesignBriefFormInner />
    </Suspense>
  );
}
