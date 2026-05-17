"use client";

import Link from "next/link";
import { Z } from "@/lib/constants";

interface Props {
  contactId: string | null | undefined;
  name: string | null | undefined;
  style?: React.CSSProperties;
}

export default function ContactLink({ contactId, name, style }: Props) {
  const display = name || "Unknown";

  if (!contactId) {
    return <span style={{ color: Z.textPrimary, ...style }}>{display}</span>;
  }

  return (
    <Link
      href={`/contacts/${contactId}`}
      onClick={(e) => e.stopPropagation()}
      style={{
        color: Z.ultramarine,
        fontWeight: 600,
        textDecoration: "none",
        cursor: "pointer",
        ...style,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
    >
      {display}
    </Link>
  );
}
