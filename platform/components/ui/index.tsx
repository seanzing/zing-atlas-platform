"use client";

import { Z, AVATAR_COLORS } from "@/lib/constants";
import { ReactNode } from "react";

export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        background: `${color}18`,
        color: color,
        letterSpacing: 0.3,
      }}
    >
      {label}
    </span>
  );
}

export function Avatar({
  initials,
  index = 0,
  size = 36,
}: {
  initials: string;
  index?: number;
  size?: number;
}) {
  const c = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${c}, ${c}cc)`,
        color: "#fff",
        fontSize: size * 0.35,
        fontWeight: 700,
        letterSpacing: 0.5,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
  return (
    <div
      style={{
        background: Z.card,
        borderRadius: 16,
        padding: "20px 24px",
        border: `1px solid ${Z.border}`,
        position: "relative",
        overflow: "hidden",
        flex: "1 1 200px",
        minWidth: 180,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${accent}, ${accent}44)`,
        }}
      />
      <div
        style={{
          fontSize: 12,
          color: Z.textMuted,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: Z.textPrimary,
          letterSpacing: -0.5,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: Z.textMuted, marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div style={{ position: "relative", flex: 1, maxWidth: 380 }}>
      <span
        style={{
          position: "absolute",
          left: 14,
          top: "50%",
          transform: "translateY(-50%)",
          color: Z.textMuted,
          fontSize: 14,
        }}
      >
        🔍
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "10px 14px 10px 40px",
          background: Z.card,
          border: `1px solid ${Z.border}`,
          borderRadius: 10,
          color: Z.textPrimary,
          fontSize: 13,
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.2s",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = Z.ultramarine)}
        onBlur={(e) => (e.currentTarget.style.borderColor = Z.border)}
      />
    </div>
  );
}

export function Btn({
  children,
  onClick,
  variant = "primary",
  small,
  style: sx,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  small?: boolean;
  style?: React.CSSProperties;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`,
      color: "#fff",
      border: "none",
      boxShadow: `0 2px 12px ${Z.ultramarine}30`,
    },
    secondary: {
      background: Z.bg,
      color: Z.textSecondary,
      border: `1px solid ${Z.border}`,
      boxShadow: "none",
    },
    danger: {
      background: "#ef444412",
      color: "#ef4444",
      border: "1px solid #ef444425",
      boxShadow: "none",
    },
  };
  return (
    <button
      onClick={onClick}
      style={{
        ...styles[variant],
        padding: small ? "6px 14px" : "10px 20px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        transition: "all 0.2s",
        letterSpacing: 0.3,
        ...sx,
      }}
    >
      {children}
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(5,5,54,0.4)",
          backdropFilter: "blur(4px)",
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: Z.card,
          border: `1px solid ${Z.border}`,
          borderRadius: 20,
          padding: "28px 32px",
          minWidth: 440,
          maxWidth: 540,
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 24px 80px rgba(5,5,54,0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div
            style={{ fontSize: 18, fontWeight: 800, color: Z.textPrimary }}
          >
            {title}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: Z.textMuted,
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 700,
          color: Z.textSecondary,
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "10px 14px",
        background: Z.bg,
        border: `1px solid ${Z.border}`,
        borderRadius: 8,
        color: Z.textPrimary,
        fontSize: 13,
        outline: "none",
        boxSizing: "border-box",
      }}
    />
  );
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "10px 14px",
        background: Z.bg,
        border: `1px solid ${Z.border}`,
        borderRadius: 8,
        color: Z.textPrimary,
        fontSize: 13,
        outline: "none",
        appearance: "none",
        boxSizing: "border-box",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function FilterBtn({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 16px",
        borderRadius: 20,
        border: active ? "none" : `1px solid ${Z.border}`,
        background: active
          ? `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`
          : "transparent",
        color: active ? "#fff" : Z.textSecondary,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {label}
    </button>
  );
}
