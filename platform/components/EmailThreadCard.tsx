"use client";

import { useState } from "react";

interface EmailMessage {
  id: string;
  type: "email_sent" | "email_received";
  subject: string | null;
  body: string | null;
  fromEmail: string | null;
  toEmail: string | null;
  createdAt: string;
}

interface EmailThread {
  gmailThreadId: string;
  subject: string;
  messageCount: number;
  lastMessageAt: string;
  participants: string[];
  messages: EmailMessage[];
}

/** Strip quoted reply chains — everything from "On [date] ... wrote:" onwards */
function stripQuotedText(body: string | null): string {
  if (!body) return "";
  // Remove \r\n artifacts
  const clean = body.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  // Cut at common quoted-text markers
  const markers = [
    /\nOn [\s\S]+?wrote:\n/,
    /\n_{3,}/,
    /\n-{3,} ?Original Message ?-{3,}/i,
    /\nFrom: .+\nSent:/i,
  ];
  for (const marker of markers) {
    const idx = clean.search(marker);
    if (idx > 0) return clean.slice(0, idx).trim();
  }
  return clean;
}

function formatFull(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelative(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function parseSender(raw: string | null): { name: string; initials: string } {
  if (!raw) return { name: "Unknown", initials: "?" };
  // "Display Name <addr@example.com>"
  const nameMatch = raw.match(/^([^<]+)<[^>]+>/);
  if (nameMatch) {
    const name = nameMatch[1].trim();
    const parts = name.split(" ").filter(Boolean);
    const initials = parts.length >= 2
      ? parts[0][0] + parts[parts.length - 1][0]
      : parts[0]?.[0] ?? "?";
    return { name, initials: initials.toUpperCase() };
  }
  // plain email
  const local = raw.split("@")[0].replace(/[._-]/g, " ");
  const name = local.replace(/\b\w/g, (c) => c.toUpperCase());
  return { name, initials: name[0]?.toUpperCase() ?? "?" };
}

function MessageRow({ msg, isLast }: { msg: EmailMessage; isLast: boolean }) {
  const isSent = msg.type === "email_sent";
  const body = stripQuotedText(msg.body);
  const sender = isSent
    ? { name: "You", initials: "Y" }
    : parseSender(msg.fromEmail);

  return (
    <div>
      <div style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}>
        {/* Avatar */}
        <div style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: isSent
            ? "linear-gradient(135deg, #3a5aff, #7c3aed)"
            : "linear-gradient(135deg, #1e4d3a, #1a6b4a)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 800,
          color: "#fff",
          flexShrink: 0,
          letterSpacing: "-0.5px",
        }}>
          {sender.initials}
        </div>

        {/* Bubble */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Sender + timestamp */}
          <div style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 8,
            gap: 8,
          }}>
            <span style={{
              fontSize: 13,
              fontWeight: 700,
              color: isSent ? "#a5b4fc" : "#4ade80",
            }}>
              {sender.name}
            </span>
            <span style={{ fontSize: 11, color: "#ffffff35", whiteSpace: "nowrap" }}>
              {formatFull(msg.createdAt)}
            </span>
          </div>

          {/* Message body card */}
          <div style={{
            background: isSent ? "#1e2a5e" : "#0f2d1e",
            border: `1px solid ${isSent ? "#3a5aff40" : "#22c55e25"}`,
            borderRadius: isSent ? "4px 16px 16px 16px" : "4px 16px 16px 16px",
            padding: "12px 16px",
            fontSize: 13,
            color: "#ffffffcc",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>
            {body || "(no content)"}
          </div>

          {/* To address — small, below bubble */}
          <div style={{ fontSize: 11, color: "#ffffff25", marginTop: 5, paddingLeft: 2 }}>
            {isSent ? `to ${msg.toEmail}` : `to ${msg.toEmail}`}
          </div>
        </div>
      </div>

      {!isLast && (
        <div style={{ margin: "16px 0 16px 48px", height: 1, background: "#ffffff08" }} />
      )}
    </div>
  );
}

export default function EmailThreadCard({
  thread,
  defaultExpanded = false,
}: {
  thread: EmailThread;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const hasReplies = thread.messageCount > 1;
  const lastMsg = thread.messages[thread.messages.length - 1];
  const lastSender = lastMsg?.type === "email_sent"
    ? "You"
    : parseSender(lastMsg?.fromEmail ?? null).name;
  const preview = stripQuotedText(lastMsg?.body ?? null).replace(/\n/g, " ").slice(0, 80);

  return (
    <div style={{
      background: "#0a0a20",
      border: `1px solid ${expanded ? "#3a5aff55" : "#ffffff0f"}`,
      borderRadius: 14,
      overflow: "hidden",
      transition: "border-color 0.2s, box-shadow 0.2s",
      boxShadow: expanded ? "0 0 0 1px #3a5aff22" : "none",
    }}
      onMouseEnter={(e) => {
        if (!expanded) (e.currentTarget as HTMLElement).style.borderColor = "#ffffff22";
      }}
      onMouseLeave={(e) => {
        if (!expanded) (e.currentTarget as HTMLElement).style.borderColor = "#ffffff0f";
      }}
    >
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "grid",
          gridTemplateColumns: "36px 1fr auto",
          gap: 12,
          padding: "14px 18px",
          cursor: "pointer",
          userSelect: "none",
          alignItems: "center",
        }}
      >
        {/* Count bubble */}
        <div style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: hasReplies ? "#1e2a5e" : "#1a1a35",
          border: `1px solid ${hasReplies ? "#3a5aff55" : "#ffffff12"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 800,
          color: hasReplies ? "#7aa0ff" : "#ffffff40",
        }}>
          {thread.messageCount}
        </div>

        {/* Subject + preview */}
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#ffffffdd",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: 3,
          }}>
            {thread.subject}
          </div>
          <div style={{
            fontSize: 11,
            color: "#ffffff38",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            <span style={{ fontWeight: 600, color: "#ffffff50" }}>{lastSender}:</span>
            {" "}{preview || "No content"}
          </div>
        </div>

        {/* Timestamp + chevron */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 5,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: "#ffffff38" }}>
            {formatRelative(thread.lastMessageAt)}
          </span>
          <span style={{ fontSize: 10, color: "#ffffff20" }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Messages */}
      {expanded && (
        <div style={{
          borderTop: "1px solid #ffffff08",
          padding: "20px 18px 24px",
          display: "flex",
          flexDirection: "column",
        }}>
          {thread.messages.map((msg, i) => (
            <MessageRow
              key={msg.id}
              msg={msg}
              isLast={i === thread.messages.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
