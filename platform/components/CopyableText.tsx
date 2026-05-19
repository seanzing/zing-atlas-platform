"use client";

import { useState } from "react";
import { Z } from "@/lib/constants";

interface CopyableTextProps {
  value: string | null | undefined;
  display?: string;
  /** "email" adds a mailto: link, "phone" adds a tel: link, "text" is plain */
  type?: "email" | "phone" | "text";
  style?: React.CSSProperties;
  iconSize?: number;
}

/**
 * Renders a phone number or email with a one-click copy button.
 * Clicking the text itself opens the native mailto: / tel: handler.
 * The clipboard icon copies silently.
 */
export function CopyableText({
  value,
  display,
  type = "text",
  style,
  iconSize = 13,
}: CopyableTextProps) {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  const label = display || value;

  const copy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const href =
    type === "email" ? `mailto:${value}` :
    type === "phone" ? `tel:${value}` :
    undefined;

  const textEl = href ? (
    <a
      href={href}
      style={{ color: Z.ultramarine, textDecoration: "none", ...style }}
      onClick={(e) => e.stopPropagation()}
    >
      {label}
    </a>
  ) : (
    <span style={{ color: Z.textPrimary, ...style }}>{label}</span>
  );

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      {textEl}
      <button
        onClick={copy}
        title={copied ? "Copied!" : `Copy ${type === "email" ? "email" : type === "phone" ? "phone" : "text"}`}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          lineHeight: 1,
          color: copied ? "#10b981" : Z.textMuted,
          fontSize: iconSize,
          flexShrink: 0,
          transition: "color 0.15s",
        }}
      >
        {copied ? "✓" : "⎘"}
      </button>
    </span>
  );
}
