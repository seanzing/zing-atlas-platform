"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Z, NAV_ITEMS } from "@/lib/constants";
import { useAuthContext } from "@/lib/auth-context";

export default function Sidebar() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);
  const { user, signOut } = useAuthContext();

  const initials = user?.teamMember
    ? `${(user.teamMember.firstName || "")[0] || ""}${(user.teamMember.lastName || "")[0] || ""}`
    : (user?.email?.[0] || "?").toUpperCase();
  const displayName = user?.teamMember
    ? `${user.teamMember.firstName || ""} ${user.teamMember.lastName || ""}`.trim()
    : user?.email || "";
  const displayRole = user?.teamMember?.role || "User";

  return (
    <div
      style={{
        width: 220,
        background: Z.sidebar,
        display: "flex",
        flexDirection: "column",
        padding: "20px 12px",
        flexShrink: 0,
        borderRight: `1px solid ${Z.oxford}`,
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: 32, padding: "0 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`,
              color: "#fff",
              fontSize: 16,
              fontWeight: 900,
            }}
          >
            Z
          </div>
          <div>
            <div
              style={{
                color: "#fff",
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: -0.3,
              }}
            >
              ZING Local
            </div>
            <div
              style={{
                color: "#ffffff45",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1.5,
              }}
            >
              CRM
            </div>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <div style={{ flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.key === "contacts" && pathname.startsWith("/contacts")) ||
            (item.key === "onboarding" && pathname.startsWith("/onboarding")) ||
            (item.key === "tasks" && pathname === "/onboarding/by-task");
          const isOnboardingSection = item.key === "onboarding" && pathname.startsWith("/onboarding");

          return (
            <div key={item.key}>
              <Link
                href={item.href}
                onMouseEnter={() => setHovered(item.key)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 16px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  marginBottom: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  background: active
                    ? `linear-gradient(135deg, ${Z.ultramarine}35, ${Z.violet}20)`
                    : hovered === item.key
                    ? "#ffffff0a"
                    : "transparent",
                  color: active ? Z.turquoiseLight : "#ffffff65",
                  transition: "all 0.15s",
                  textDecoration: "none",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
              {/* Onboarding sub-nav */}
              {isOnboardingSection && (
                <div style={{ paddingLeft: 42, marginBottom: 4 }}>
                  {[
                    { label: "By Customer", href: "/onboarding" },
                    { label: "By Task", href: "/onboarding/by-task" },
                    { label: "Full View", href: "/onboarding/full" },
                    { label: "Work Funnel", href: "/onboarding/funnel" },
                  ].map((sub) => {
                    const subActive = pathname === sub.href;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        style={{
                          display: "block",
                          padding: "6px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          color: subActive ? Z.turquoiseLight : "#ffffff45",
                          textDecoration: "none",
                          borderRadius: 6,
                          background: subActive ? "#ffffff08" : "transparent",
                          marginBottom: 2,
                          transition: "all 0.15s",
                        }}
                      >
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* User */}
      <div style={{ padding: "16px 8px", borderTop: "1px solid #ffffff12" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${Z.violet}, ${Z.purple})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 11,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{ color: "#ffffffcc", fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {displayName}
            </div>
            <div style={{ color: "#ffffff45", fontSize: 10 }}>{displayRole}</div>
          </div>
        </div>
        <button
          onClick={signOut}
          style={{
            marginTop: 10,
            width: "100%",
            padding: "7px 0",
            fontSize: 11,
            fontWeight: 600,
            color: "#ffffff65",
            background: "#ffffff0a",
            border: "1px solid #ffffff12",
            borderRadius: 6,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffffcc")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#ffffff65")}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
