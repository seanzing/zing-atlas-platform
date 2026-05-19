"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Z, NAV_ITEMS } from "@/lib/constants";
import { useAuthContext } from "@/lib/auth-context";
import NotificationBell from "@/components/NotificationBell";

const DEPT_NAV: Record<string, string[]> = {
  designer:   ["dashboard", "onboarding", "settings"],
  onboarding: ["dashboard", "contacts", "onboarding", "support", "settings"],
  publishing: ["dashboard", "onboarding", "settings"],
  sales:      ["dashboard", "contacts", "pipeline", "support", "ar", "settings"],
  all:        [],
};

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
  const dept = user?.teamMember?.department ?? "all";
  const allowedKeys = DEPT_NAV[dept] ?? [];
  const visibleNavItems = allowedKeys.length === 0
    ? NAV_ITEMS
    : NAV_ITEMS.filter(item => allowedKeys.includes(item.key));

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
        {visibleNavItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.key === "contacts" && pathname.startsWith("/contacts")) ||
            (item.key === "onboarding" && pathname.startsWith("/onboarding")) ||

            (item.key === "team" && pathname.startsWith("/team")) ||
            (item.key === "products" && pathname.startsWith("/products")) ||
            (item.key === "marketing" && pathname.startsWith("/marketing")) ||
            (item.key === "deals" && pathname.startsWith("/deals"));
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
                    { label: "By Rep", href: "/onboarding" },
                    { label: "By Task", href: "/onboarding/by-task" },
                    { label: "By View", href: "/onboarding/full" },
                    { label: "Work Funnel", href: "/onboarding/funnel" },
                    { label: "Work Queue", href: "/onboarding/production" },
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

      {/* Search hint */}
      <div style={{ padding: "0 8px 8px" }}>
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #ffffff12",
            background: "#ffffff06",
            color: "#ffffff45",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#ffffff25")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#ffffff12")}
        >
          <span>Search</span>
          <kbd style={{ fontSize: 10, background: "#ffffff12", padding: "2px 6px", borderRadius: 4 }}>⌘K</kbd>
        </button>
      </div>

      {/* Notifications */}
      <div style={{ padding: "0 8px 4px", display: "flex", justifyContent: "center" }}>
        <NotificationBell />
      </div>

      {/* User */}
      <div style={{ padding: "16px 8px", borderTop: "1px solid #ffffff12" }}>
        <Link href="/account" style={{ textDecoration: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "6px 8px", borderRadius: 8, cursor: "pointer" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#ffffff0a")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
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
            <div style={{ color: "#ffffff45", fontSize: 10 }}>{displayRole}{dept !== "all" ? ` · ${dept}` : ""}</div>
          </div>
        </div>
        </Link>
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
