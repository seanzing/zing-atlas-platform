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

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = diff / 3600000;

  if (hours < 24) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (hours < 24 * 7) {
    return d.toLocaleDateString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function MessageBubble({ msg }: { msg: EmailMessage }) {
  const [expanded, setExpanded] = useState(true);
  const isSent = msg.type === "email_sent";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}>
      {/* Message header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Avatar */}
          <div style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: isSent
              ? "linear-gradient(135deg, #3a5aff, #7c3aed)"
              : "linear-gradient(135deg, #374151, #4b5563)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            color: "#fff",
            flexShrink: 0,
          }}>
            {isSent ? "Y" : (msg.fromEmail?.[0] ?? "?").toUpperCase()}
          </div>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#ffffffcc" }}>
              {isSent ? "You" : msg.fromEmail}
            </span>
            {!isSent && (
              <span style={{ fontSize: 11, color: "#ffffff40", marginLeft: 6 }}>
                &rarr; {msg.toEmail}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#ffffff35" }}>{formatDate(msg.createdAt)}</span>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: "none",
              border: "none",
              color: "#ffffff40",
              cursor: "pointer",
              fontSize: 12,
              padding: "2px 4px",
            }}
          >
            {expanded ? "\u25B2" : "\u25BC"}
          </button>
        </div>
      </div>

      {/* Message body */}
      {expanded && (
        <div style={{
          marginLeft: 36,
          padding: "10px 14px",
          background: isSent ? "#3a5aff0a" : "#ffffff06",
          border: `1px solid ${isSent ? "#3a5aff22" : "#ffffff10"}`,
          borderRadius: 8,
          fontSize: 13,
          color: "#ffffffaa",
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {msg.body || "(no content)"}
        </div>
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
  const preview = lastMsg?.body?.slice(0, 100) ?? "";

  return (
    <div style={{
      background: "linear-gradient(135deg, #0d0d2e 0%, #111132 100%)",
      border: "1px solid #3a3a6e55",
      borderRadius: 12,
      overflow: "hidden",
      transition: "border-color 0.15s",
    }}
      onMouseEnter={(e) => {
        if (!expanded) (e.currentTarget as HTMLElement).style.borderColor = "#3a5aff55";
      }}
      onMouseLeave={(e) => {
        if (!expanded) (e.currentTarget as HTMLElement).style.borderColor = "#3a3a6e55";
      }}
    >
      {/* Thread header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 16,
          padding: "14px 18px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div style={{ minWidth: 0 }}>
          {/* Subject + badge row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffffcc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {thread.subject}
            </span>
            {hasReplies && (
              <span style={{
                background: "#3a5aff22",
                border: "1px solid #3a5aff44",
                color: "#7aa0ff",
                fontSize: 10,
                fontWeight: 700,
                padding: "1px 7px",
                borderRadius: 10,
                flexShrink: 0,
              }}>
                {thread.messageCount} messages
              </span>
            )}
          </div>
          {/* Participants + preview */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "#ffffff45", flexShrink: 0 }}>
              {thread.participants.slice(0, 2).join(", ")}
              {thread.participants.length > 2 ? ` +${thread.participants.length - 2}` : ""}
            </span>
            {!expanded && preview && (
              <>
                <span style={{ color: "#ffffff20" }}>&middot;</span>
                <span style={{
                  fontSize: 11,
                  color: "#ffffff30",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {preview}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: timestamp + chevron */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: "#ffffff40" }}>{formatDate(thread.lastMessageAt)}</span>
          <span style={{ fontSize: 11, color: "#ffffff25" }}>{expanded ? "\u25B2" : "\u25BC"}</span>
        </div>
      </div>

      {/* Expanded messages */}
      {expanded && (
        <div style={{
          borderTop: "1px solid #ffffff0c",
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}>
          {thread.messages.map((msg, i) => (
            <div key={msg.id}>
              <MessageBubble msg={msg} />
              {i < thread.messages.length - 1 && (
                <div style={{
                  marginLeft: 14,
                  marginTop: 12,
                  borderLeft: "2px solid #ffffff08",
                  height: 8,
                }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
