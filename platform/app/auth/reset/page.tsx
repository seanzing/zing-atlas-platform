"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { Z } from "@/lib/constants";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  // Wait for Supabase to process the hash tokens from the invite/reset link
  useEffect(() => {
    const supabase = createSupabaseBrowser();

    // Check if session already exists (e.g. direct navigation)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
        return;
      }
    });

    // Listen for auth state change — fires when hash tokens are processed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowser();
    const { error: authError } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setDone(true);
      setTimeout(() => { window.location.href = "/dashboard"; }, 2000);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "14px 16px", fontSize: 15,
    border: `1px solid ${Z.border}`, borderRadius: 10, outline: "none",
    marginBottom: 16, boxSizing: "border-box", background: "#fff", color: Z.textPrimary,
  };

  return (
    <div style={{ minHeight: "100vh", background: Z.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.06)", padding: "48px 40px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`, color: "#fff", fontSize: 20, fontWeight: 900 }}>Z</div>
        </div>
        <h1 style={{ textAlign: "center", fontSize: 24, fontWeight: 800, color: Z.textPrimary, marginBottom: 8 }}>Set Your Password</h1>
        <p style={{ textAlign: "center", fontSize: 14, color: Z.textSecondary, marginBottom: 32 }}>Choose a strong password for your ZING Atlas account</p>

        {done ? (
          <div style={{ textAlign: "center", padding: "20px 16px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#166534", marginBottom: 4 }}>Password set successfully</div>
            <div style={{ fontSize: 13, color: "#15803d" }}>Redirecting to your dashboard...</div>
          </div>
        ) : !sessionReady ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: Z.textSecondary, fontSize: 14 }}>
            <div style={{ marginBottom: 12, fontSize: 24 }}>⏳</div>
            Verifying your invite link...
          </div>
        ) : (
          <form onSubmit={handleReset}>
            <label style={{ fontSize: 13, fontWeight: 600, color: Z.textSecondary, display: "block", marginBottom: 6 }}>New Password</label>
            <input type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} onFocus={(e) => (e.target.style.borderColor = Z.ultramarine)} onBlur={(e) => (e.target.style.borderColor = Z.border)} />
            <label style={{ fontSize: 13, fontWeight: 600, color: Z.textSecondary, display: "block", marginBottom: 6 }}>Confirm Password</label>
            <input type="password" placeholder="Re-enter password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required style={inputStyle} onFocus={(e) => (e.target.style.borderColor = Z.ultramarine)} onBlur={(e) => (e.target.style.borderColor = Z.border)} />
            {error && <div style={{ padding: "10px 14px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca", color: "#991b1b", fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <button type="submit" disabled={loading || !password || !confirm} style={{ width: "100%", padding: "14px 16px", fontSize: 15, fontWeight: 700, color: "#fff", background: `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`, border: "none", borderRadius: 10, cursor: "pointer", opacity: (!password || !confirm) ? 0.5 : 1 }}>
              {loading ? "Setting password..." : "Set Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
