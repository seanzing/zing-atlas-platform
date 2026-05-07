"use client";

import { useState } from "react";
import DOMPurify from "isomorphic-dompurify";

interface EmailMessage {
  id: string;
  type: "email_sent" | "email_received";
  subject: string | null;
  body: string | null;
  fromEmail: string | null;
  toEmail: string | null;
  createdAt: string;
  metadata: {
    bodyHtml?: string;
    hasHtml?: boolean;
    attachments?: Array<{ name: string; size: number; mimeType: string; attachmentId?: string }>;
    gmailMessageId?: string;
  } | null;
}

interface EmailThread {
  gmailThreadId: string;
  subject: string;
  messageCount: number;
  lastMessageAt: string;
  participants: string[];
  messages: EmailMessage[];
}

/** Strip Gmail quoted HTML (div.gmail_quote, blockquote.gmail_quote, div.gmail_attr) */
function stripGmailQuotedHtml(html: string): string {
  if (!html) return '';

  // Find the first occurrence of gmail_quote and cut everything from there
  const quoteContainerIdx = html.indexOf('class="gmail_quote_container"');
  const quoteIdx = html.indexOf('class="gmail_quote"');

  const cutAt = Math.min(
    quoteContainerIdx > -1 ? quoteContainerIdx : Infinity,
    quoteIdx > -1 ? quoteIdx : Infinity
  );

  if (cutAt === Infinity) return html.trim();

  // Walk backwards to find the opening < of the tag
  let tagStart = cutAt;
  while (tagStart > 0 && html[tagStart] !== '<') tagStart--;

  return html.slice(0, tagStart).trim();
}

/** Strip quoted HTML, replace cid: images with placeholder */
function prepareGmailHtml(html: string): string {
  let result = stripGmailQuotedHtml(html);

  // Remove gmail_attr "On [date] ... wrote:" lines that may precede the quote
  result = result.replace(/<div[^>]*class="[^"]*gmail_attr[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

  // Replace cid: images with a styled placeholder (can't be fetched without Gmail API)
  result = result.replace(
    /<img[^>]*src="cid:[^"]*"[^>]*>/gi,
    '<div style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;background:#ffffff08;border:1px solid #ffffff15;border-radius:6px;font-size:11px;color:#ffffff50;margin:4px 0;">\u{1F5BC} Inline image (open in Gmail to view)</div>'
  );

  // Clean up trailing <br> tags
  result = result.replace(/(<br\s*\/?>\s*){2,}$/gi, '').trim();

  return result;
}

/** Strip quoted reply chains — everything from "On [date] ... wrote:" onwards */
function stripQuotedText(body: string | null): string {
  if (!body) return "";
  const clean = body.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
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
  const nameMatch = raw.match(/^([^<]+)<[^>]+>/);
  if (nameMatch) {
    const name = nameMatch[1].trim();
    const parts = name.split(" ").filter(Boolean);
    const initials = parts.length >= 2
      ? parts[0][0] + parts[parts.length - 1][0]
      : parts[0]?.[0] ?? "?";
    return { name, initials: initials.toUpperCase() };
  }
  const local = raw.split("@")[0].replace(/[._-]/g, " ");
  const name = local.replace(/\b\w/g, (c) => c.toUpperCase());
  return { name, initials: name[0]?.toUpperCase() ?? "?" };
}

function formatFileSize(size: number): string {
  if (size > 1048576) return `${(size / 1048576).toFixed(1)} MB`;
  if (size > 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${size} B`;
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "\u{1F5BC}";
  if (mimeType === "application/pdf") return "\u{1F4C4}";
  if (mimeType.includes("word")) return "\u{1F4DD}";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "\u{1F4CA}";
  return "\u{1F4CE}";
}

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ["p", "br", "b", "strong", "i", "em", "u", "a", "ul", "ol", "li", "blockquote", "h1", "h2", "h3", "h4", "span", "div", "table", "tr", "td", "th", "thead", "tbody", "img", "style"],
  ALLOWED_ATTR: ["href", "src", "alt", "style", "class", "target"],
  FORBID_ATTR: ["onerror", "onload", "onclick"],
  FORCE_BODY: true,
};

function MessageRow({ msg, isLast, contactId }: { msg: EmailMessage; isLast: boolean; contactId: string }) {
  const isSent = msg.type === "email_sent";
  const body = stripQuotedText(msg.body);
  const sender = isSent
    ? { name: "You", initials: "Y" }
    : parseSender(msg.fromEmail);

  const bodyHtml = msg.metadata?.bodyHtml;
  const hasHtml = msg.metadata?.hasHtml && bodyHtml;
  const attachments = msg.metadata?.attachments ?? [];

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: isSent
            ? "linear-gradient(135deg, #3a5aff, #7c3aed)"
            : "linear-gradient(135deg, #1e4d3a, #1a6b4a)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0, letterSpacing: "-0.5px",
        }}>
          {sender.initials}
        </div>

        {/* Bubble */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: "flex", alignItems: "baseline", justifyContent: "space-between",
            marginBottom: 8, gap: 8,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: isSent ? "#a5b4fc" : "#4ade80" }}>
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
            borderRadius: "4px 16px 16px 16px",
            padding: "12px 16px",
          }}>
            {hasHtml ? (
              <div style={{ fontSize: 13, color: "#ffffffcc", lineHeight: 1.7 }}>
                <style>{`.gmail_quote, .gmail_quote_container, .gmail_attr { display: none !important; }`}</style>
                <div dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(prepareGmailHtml(bodyHtml!), SANITIZE_CONFIG),
                }} />
              </div>
            ) : (
              <div style={{
                fontSize: 13, color: "#ffffffcc", lineHeight: 1.7,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {body || "(no content)"}
              </div>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{
                  fontSize: 11, color: "#ffffff40", fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: 0.5,
                }}>
                  {attachments.length} Attachment{attachments.length > 1 ? "s" : ""}
                </div>
                {attachments.map((att, i) => {
                  const gmailMessageId = msg.metadata?.gmailMessageId;
                  const downloadUrl = gmailMessageId && att.attachmentId
                    ? `/api/contacts/${contactId}/attachment?messageId=${encodeURIComponent(gmailMessageId)}&attachmentId=${encodeURIComponent(att.attachmentId)}&filename=${encodeURIComponent(att.name)}&mimeType=${encodeURIComponent(att.mimeType)}`
                    : null;

                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "7px 10px", background: "#ffffff08",
                      border: "1px solid #ffffff15", borderRadius: 6,
                      cursor: downloadUrl ? "pointer" : "default",
                      transition: "background 0.15s",
                    }}
                      onClick={() => downloadUrl && window.open(downloadUrl, "_blank")}
                      onMouseEnter={(e) => { if (downloadUrl) (e.currentTarget as HTMLElement).style.background = "#ffffff14"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#ffffff08"; }}
                    >
                      <span style={{ fontSize: 16 }}>{getFileIcon(att.mimeType)}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#ffffffcc" }}>{att.name}</div>
                        <div style={{ fontSize: 10, color: "#ffffff40" }}>
                          {formatFileSize(att.size)}
                          {downloadUrl && <span style={{ marginLeft: 8, color: "#7aa0ff" }}>{"\u2193"} Download</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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

function InlineReplyBox({
  thread,
  contactId,
  onSent,
}: {
  thread: EmailThread;
  contactId: string;
  onSent: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const lastReceived = [...thread.messages].reverse().find((m) => m.type === "email_received");
  const replyTo = lastReceived?.fromEmail || thread.participants.find((p) => !p.includes("zing-work.com")) || thread.messages[0]?.toEmail || "";
  const replyToEmail = replyTo.match(/<([^>]+)>/) ? replyTo.match(/<([^>]+)>/)![1] : replyTo;
  const replySubject = thread.subject.startsWith("Re:") ? thread.subject : `Re: ${thread.subject}`;

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      await fetch(`/api/contacts/${contactId}/reply-in-thread`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: replyToEmail,
          subject: replySubject,
          body: body.trim(),
          gmailThreadId: thread.gmailThreadId,
        }),
      });
      setBody("");
      setOpen(false);
      onSent();
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #ffffff08" }}>
        <button
          onClick={() => setOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 16px", background: "#1e2a5e",
            border: "1px solid #3a5aff40", borderRadius: 20,
            color: "#7aa0ff", fontSize: 12, fontWeight: 700,
            cursor: "pointer", width: "100%",
          }}
        >
          {"\u21A9"} Reply to {replyToEmail}
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #ffffff08" }}>
      <div style={{
        background: "#1e2a5e", border: "1px solid #3a5aff55",
        borderRadius: 12, overflow: "hidden",
      }}>
        <div style={{
          padding: "8px 14px", borderBottom: "1px solid #3a5aff22",
          fontSize: 11, color: "#7aa0ff80",
        }}>
          Replying to {replyToEmail} &middot; {replySubject}
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your reply..."
          autoFocus
          rows={4}
          style={{
            width: "100%", padding: "12px 14px", background: "transparent",
            border: "none", color: "#ffffffcc", fontSize: 13, lineHeight: 1.6,
            resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box",
          }}
        />
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          gap: 8, padding: "8px 12px", borderTop: "1px solid #3a5aff22",
        }}>
          <button
            onClick={() => { setOpen(false); setBody(""); }}
            style={{
              padding: "6px 14px", background: "transparent", border: "none",
              color: "#ffffff40", fontSize: 12, cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={send}
            disabled={sending || !body.trim()}
            style={{
              padding: "6px 18px",
              background: "linear-gradient(135deg, #3a5aff, #7c3aed)",
              border: "none", borderRadius: 6, color: "#fff",
              fontSize: 12, fontWeight: 700,
              cursor: sending || !body.trim() ? "not-allowed" : "pointer",
              opacity: !body.trim() ? 0.5 : 1,
            }}
          >
            {sending ? "Sending..." : "Send Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EmailThreadCard({
  thread,
  defaultExpanded = false,
  contactId,
  onReply,
}: {
  thread: EmailThread;
  defaultExpanded?: boolean;
  contactId: string;
  onReply?: () => void;
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
      borderRadius: 14, overflow: "hidden",
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
          display: "grid", gridTemplateColumns: "36px 1fr auto",
          gap: 12, padding: "14px 18px", cursor: "pointer",
          userSelect: "none", alignItems: "center",
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: hasReplies ? "#1e2a5e" : "#1a1a35",
          border: `1px solid ${hasReplies ? "#3a5aff55" : "#ffffff12"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 800,
          color: hasReplies ? "#7aa0ff" : "#ffffff40",
        }}>
          {thread.messageCount}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: "#ffffffdd",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3,
          }}>
            {thread.subject}
          </div>
          <div style={{
            fontSize: 11, color: "#ffffff38",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            <span style={{ fontWeight: 600, color: "#ffffff50" }}>{lastSender}:</span>
            {" "}{preview || "No content"}
          </div>
        </div>

        <div style={{
          display: "flex", flexDirection: "column", alignItems: "flex-end",
          gap: 5, flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: "#ffffff38" }}>
            {formatRelative(thread.lastMessageAt)}
          </span>
          <span style={{ fontSize: 10, color: "#ffffff20" }}>
            {expanded ? "\u25B2" : "\u25BC"}
          </span>
        </div>
      </div>

      {/* Messages */}
      {expanded && (
        <div style={{
          borderTop: "1px solid #ffffff08",
          padding: "20px 18px 24px",
          display: "flex", flexDirection: "column",
        }}>
          {thread.messages.map((msg, i) => (
            <MessageRow
              key={msg.id}
              msg={msg}
              isLast={i === thread.messages.length - 1}
              contactId={contactId}
            />
          ))}

          {/* Inline reply */}
          <InlineReplyBox
            thread={thread}
            contactId={contactId}
            onSent={() => onReply?.()}
          />
        </div>
      )}
    </div>
  );
}
