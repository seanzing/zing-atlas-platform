"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthContext } from "@/lib/auth-context";
import { Z } from "@/lib/constants";

function AccountContent() {
  const { user } = useAuthContext();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<string | null>(null);
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);

  useEffect(() => {
    if (searchParams.get("googleConnected") === "true") {
      setToast("Google account connected. You can now send emails from Atlas.");
      setGoogleConnected(true);
      window.history.replaceState({}, "", "/account");
    }
    if (searchParams.get("googleError")) {
      setToast("Google connection failed. Please try again.");
      window.history.replaceState({}, "", "/account");
    }
  }, [searchParams]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Check if Google is already connected by hitting /api/auth/me
  useEffect(() => {
    fetch("/api/auth/me/google-status")
      .then((r) => r.json())
      .then((d) => setGoogleConnected(d.connected ?? false))
      .catch(() => setGoogleConnected(false));
  }, []);

  const handleConnectGoogle = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div style={{ padding: 32, maxWidth: 560 }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            background: Z.ultramarine,
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 1000,
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          {toast}
        </div>
      )}

      <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
        My Account
      </h1>
      <p style={{ color: "#ffffff55", fontSize: 13, marginBottom: 32 }}>
        Your profile and connected services.
      </p>

      {/* Profile */}
      <div
        style={{
          background: Z.sidebar,
          border: `1px solid ${Z.oxford}`,
          borderRadius: 12,
          padding: 24,
          marginBottom: 20,
        }}
      >
        <div style={{ color: "#ffffff80", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
          Profile
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Row label="Name" value={user?.teamMember ? `${user.teamMember.firstName} ${user.teamMember.lastName}` : "—"} />
          <Row label="Email" value={user?.email ?? "—"} />
          <Row label="Role" value={user?.teamMember?.role ?? "—"} />
        </div>
      </div>

      {/* Google Account */}
      <div
        style={{
          background: Z.sidebar,
          border: `1px solid ${Z.oxford}`,
          borderRadius: 12,
          padding: 24,
        }}
      >
        <div style={{ color: "#ffffff80", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
          Google Account
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ color: "#ffffffcc", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              Gmail Send Permission
            </div>
            <div style={{ color: "#ffffff55", fontSize: 12 }}>
              {googleConnected === null
                ? "Checking..."
                : googleConnected
                ? "Connected — you can send emails from Atlas as yourself."
                : "Not connected — connect your Google account to send emails to customers directly from Atlas."}
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            {googleConnected === true ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  background: "#22c55e18",
                  border: "1px solid #22c55e55",
                  borderRadius: 6,
                  color: "#22c55e",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <span>✓</span> Connected
              </div>
            ) : (
              <button
                onClick={handleConnectGoogle}
                style={{
                  padding: "8px 16px",
                  background: `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`,
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Connect Google Account
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ color: "#ffffff45", fontSize: 12, width: 80, flexShrink: 0 }}>{label}</div>
      <div style={{ color: "#ffffffcc", fontSize: 12 }}>{value}</div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: "#ffffff55" }}>Loading...</div>}>
      <AccountContent />
    </Suspense>
  );
}
