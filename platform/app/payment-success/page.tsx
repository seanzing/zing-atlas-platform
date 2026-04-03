"use client";

import { Z } from "@/lib/constants";

export default function PaymentSuccessPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: Z.bg,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          background: Z.card,
          borderRadius: 16,
          padding: "48px 40px",
          maxWidth: 480,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}
      >
        {/* Green checkmark */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "#10b98120",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: Z.textPrimary,
            margin: "0 0 12px",
          }}
        >
          Payment Successful!
        </h1>

        <p
          style={{
            fontSize: 15,
            color: Z.textSecondary,
            lineHeight: 1.6,
            margin: "0 0 32px",
          }}
        >
          Your subscription is now active. Your ZING team will be in touch shortly to begin your onboarding.
        </p>

        {/* ZING logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 16,
              fontWeight: 900,
            }}
          >
            Z
          </div>
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: Z.oxford,
              letterSpacing: 1,
            }}
          >
            ZING
          </span>
        </div>
      </div>
    </div>
  );
}
