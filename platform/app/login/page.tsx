"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { Z } from "@/lib/constants";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowser();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: Z.bg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          background: Z.oxford,
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`,
            color: "#fff",
            fontSize: 14,
            fontWeight: 900,
          }}
        >
          Z
        </div>
        <div
          style={{
            color: "#fff",
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: -0.3,
          }}
        >
          ZING Local
        </div>
      </div>

      {/* Login card */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            padding: "48px 40px",
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`,
                color: "#fff",
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              Z
            </div>
          </div>

          <h1
            style={{
              textAlign: "center",
              fontSize: 24,
              fontWeight: 800,
              color: Z.textPrimary,
              marginBottom: 8,
            }}
          >
            Sign in to Atlas
          </h1>
          <p
            style={{
              textAlign: "center",
              fontSize: 14,
              color: Z.textSecondary,
              marginBottom: 32,
            }}
          >
            Enter your work email to receive a sign-in link
          </p>

          {sent ? (
            <div
              style={{
                textAlign: "center",
                padding: "20px 16px",
                background: "#f0fdf4",
                borderRadius: 10,
                border: "1px solid #bbf7d0",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#166534",
                  marginBottom: 4,
                }}
              >
                Check your email
              </div>
              <div style={{ fontSize: 13, color: "#15803d" }}>
                We sent a sign-in link to{" "}
                <strong>{email}</strong>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder="you@zinglocal.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  fontSize: 15,
                  border: `1px solid ${Z.border}`,
                  borderRadius: 10,
                  outline: "none",
                  marginBottom: 16,
                  boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = Z.ultramarine)
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = Z.border)
                }
              />

              {error && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#fef2f2",
                    borderRadius: 8,
                    border: "1px solid #fecaca",
                    color: "#991b1b",
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#fff",
                  background: loading
                    ? Z.grey
                    : `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`,
                  border: "none",
                  borderRadius: 10,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "opacity 0.15s",
                  opacity: !email ? 0.5 : 1,
                }}
              >
                {loading ? "Sending..." : "Send Sign-In Link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
