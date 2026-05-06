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
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function senderLabel(email: string | null): string {
  if (!email) return "Unknown";
  // Show just the local part before @, capitalized — e.g. sean@zing-work.com → Sean
  const local = email.split("@")[0].replace(/[._-]/g, " ");
  return local.replace(/\b\w/g, (c) => c.toUpperCase());
}

function MessageRow({ msg, isLast }: { msg: EmailMessage; isLast: boolean }) {
  const isSent = msg.type === "email_sent";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 0,
    }}>
      {/* Message card */}
      <div style={{
        borderLeft: `3px solid ${isSent ? "#3a5aff" : "#ffffff18"}`,
        paddingLeft: 16,
        paddingTop: 2,
        paddingBottom: 2,
      }}>
        {/* Sender row */}
        <div style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 6,
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
            <span style={{
              fontSize: 13,
              fontWeight: 800,
              color: isSent ? "#a5b4fc" : "#ffffffcc",
              flexShrink: 0,
            }}>
              {isSent ? "You" : senderLabel(msg.fromEmail)}
            </span>
            <span style={{ fontSize: 11, color: "#ffffff35", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              to {msg.toEmail}
            </span>
          </div>
          <span style={{ fontSize: 11, color: "#ffffff35", flexShrink: 0, whiteSpace: "nowrap" }}>
            {formatFull(msg.createdAt)}
          </span>
        </div>

        {/* Body */}
        <div style={{
          fontSize: 13,
          color: "#ffffffbb",
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {msg.body || "(no content)"}
        </div>
      </div>

      {/* Divider between messages */}
      {!isLast && (
        <div style={{
          height: 1,
          background: "linear-gradient(to right, #ffffff08, #ffffff04, transparent)",
          margin: "16px 0",
        }} />
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
  const lastSender = lastMsg
    ? lastMsg.type === "email_sent"
      ? "You"
      : senderLabel(lastMsg.fromEmail)
    : "";
  const preview = lastMsg?.body?.replace(/\n/g, " ").slice(0, 90) ?? "";

  return (
    <div
      style={{
        background: "#0d0d2e",
        border: `1px solid ${expanded ? "#3a5aff44" : "#ffffff10"}`,
        borderRadius: 12,
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
      onMouseEnter={(e) => {
        if (!expanded)
          (e.currentTarget as HTMLElement).style.borderColor = "#ffffff22";
      }}
      onMouseLeave={(e) => {
        if (!expanded)
          (e.currentTarget as HTMLElement).style.borderColor = "#ffffff10";
      }}
    >
      {/* Collapsed header — click to expand */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          gap: 12,
          padding: "14px 18px",
          cursor: "pointer",
          userSelect: "none",
          alignItems: "center",
        }}
      >
        {/* Message count bubble */}
        <div style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: hasReplies ? "#3a5aff22" : "#ffffff0a",
          border: `1px solid ${hasReplies ? "#3a5aff55" : "#ffffff15"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 800,
          color: hasReplies ? "#7aa0ff" : "#ffffff55",
          flexShrink: 0,
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
            color: "#ffffff40",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {lastSender && <span style={{ fontWeight: 600, color: "#ffffff55" }}>{lastSender}:</span>}
            {" "}{preview || "No content"}
          </div>
        </div>

        {/* Timestamp + chevron */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 4,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: "#ffffff40" }}>
            {formatRelative(thread.lastMessageAt)}
          </span>
          <span style={{ fontSize: 10, color: "#ffffff25" }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Expanded message list */}
      {expanded && (
        <div style={{
          borderTop: "1px solid #ffffff0a",
          padding: "20px 20px 20px 20px",
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
