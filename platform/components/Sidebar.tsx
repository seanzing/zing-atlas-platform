"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Z, NAV_ITEMS } from "@/lib/constants";

export default function Sidebar() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);

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
            (item.key === "contacts" && pathname.startsWith("/contacts"));
          const isDisabled = item.href === "#";

          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={(e) => {
                if (isDisabled) e.preventDefault();
              }}
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
                cursor: isDisabled ? "default" : "pointer",
                marginBottom: 4,
                fontSize: 13,
                fontWeight: 600,
                background: active
                  ? `linear-gradient(135deg, ${Z.ultramarine}35, ${Z.violet}20)`
                  : hovered === item.key
                  ? "#ffffff0a"
                  : "transparent",
                color: active ? Z.turquoiseLight : isDisabled ? "#ffffff30" : "#ffffff65",
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
            }}
          >
            AB
          </div>
          <div>
            <div
              style={{ color: "#ffffffcc", fontSize: 12, fontWeight: 700 }}
            >
              Amy Bourke
            </div>
            <div style={{ color: "#ffffff45", fontSize: 10 }}>Admin</div>
          </div>
        </div>
      </div>
    </div>
  );
}
