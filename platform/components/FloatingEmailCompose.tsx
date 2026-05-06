"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Z } from "@/lib/constants";

interface ActivityEntry {
  id: string;
  subject: string | null;
  body: string | null;
  toEmail: string | null;
  fromEmail: string | null;
  createdAt: string;
}

interface FloatingEmailComposeProps {
  contactId: string;
  contactName: string;
  contactEmail: string;
  onClose: () => void;
}

const TEMPLATES = [
  {
    label: "Website Draft Ready",
    subject: "Your website draft is ready for review",
    body: (name: string) =>
      `Hi ${name},\n\nWe have completed the first draft of your website and would love your feedback.\n\nPlease take a look and let us know what changes you would like to make — no detail is too small!\n\nBest,`,
  },
  {
    label: "Following Up",
    subject: "Following up on your website",
    body: (name: string) =>
      `Hi ${name},\n\nJust checking in to see if you had a chance to review your website draft. We want to make sure everything looks exactly right for you.\n\nLet us know if you have any questions!\n\nBest,`,
  },
  {
    label: "Revisions Complete",
    subject: "Your revisions are ready",
    body: (name: string) =>
      `Hi ${name},\n\nWe have made the changes you requested. Please take another look and let us know if everything looks good!\n\nBest,`,
  },
  {
    label: "Website Live",
    subject: "Your website is live!",
    body: (name: string) =>
      `Hi ${name},\n\nExciting news — your website is now live! Thank you for choosing ZING. We are here if you need anything!\n\nBest,`,
  },
];

export default function FloatingEmailCompose({
  contactId,
  contactName,
  contactEmail,
  onClose,
}: FloatingEmailComposeProps) {
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // offset from default bottom-right
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  const [to, setTo] = useState(contactEmail);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [template, setTemplate] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<ActivityEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    fetch(`/api/contacts/${contactId}/activity`)
      .then((r) => r.json())
      .then((d) => setHistory(d.activity || []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [contactId]);

  // Drag logic
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      setPos({
        x: dragStart.current.px + (e.clientX - dragStart.current.mx),
        y: dragStart.current.py + (e.clientY - dragStart.current.my),
      });
    };
    const onUp = () => setDragging(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const applyTemplate = (label: string) => {
    const tmpl = TEMPLATES.find((t) => t.label === label);
    if (!tmpl) return;
    setTemplate(label);
    setSubject(tmpl.subject);
    setBody(tmpl.body(contactName.split(" ")[0] || contactName));
  };

  const handleSend = async () => {
    if (!to || !subject || !body) {
      setError("To, subject, and message are required.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${contactId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send.");
        return;
      }
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setSubject("");
        setBody("");
        setTemplate("");
      }, 2000);
    } catch {
      setError("Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  // Position: default bottom-right, offset by drag
  const style: React.CSSProperties = {
    position: "fixed",
    bottom: `${24 - pos.y}px`,
    right: `${24 - pos.x}px`,
    width: 480,
    zIndex: 1000,
    borderRadius: 10,
    boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
    overflow: "hidden",
    border: `1px solid ${Z.oxford}`,
    fontFamily: "inherit",
  };

  return (
    <div style={style}>
      {/* Title bar */}
      <div
        onMouseDown={onMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: Z.sidebar,
          cursor: dragging ? "grabbing" : "grab",
          userSelect: "none",
          borderBottom: minimized ? "none" : `1px solid #ffffff12`,
        }}
      >
        <div style={{ color: "#ffffffcc", fontSize: 13, fontWeight: 700 }}>
          New Email — {contactName}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {/* History toggle */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => { setHistoryOpen(!historyOpen); if (!historyOpen) loadHistory(); }}
            title="Email history"
            style={iconBtn}
          >
            ⏱
          </button>
          {/* Minimize */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setMinimized(!minimized)}
            title={minimized ? "Expand" : "Minimize"}
            style={iconBtn}
          >
            {minimized ? "▲" : "▼"}
          </button>
          {/* Close */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onClose}
            title="Close"
            style={{ ...iconBtn, color: "#ff6b6b" }}
          >
            ✕
          </button>
        </div>
      </div>

      {!minimized && (
        <div style={{ background: "#0d0d2e" }}>
          {/* History panel */}
          {historyOpen && (
            <div
              style={{
                borderBottom: `1px solid #ffffff12`,
                maxHeight: 200,
                overflowY: "auto",
                padding: "12px 14px",
              }}
            >
              <div style={{ color: "#ffffff55", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                Previous Emails
              </div>
              {historyLoading ? (
                <div style={{ color: "#ffffff45", fontSize: 12 }}>Loading...</div>
              ) : history.length === 0 ? (
                <div style={{ color: "#ffffff35", fontSize: 12 }}>No previous emails.</div>
              ) : (
                history.map((e) => (
                  <div key={e.id} style={{ borderBottom: "1px solid #ffffff08", paddingBottom: 8, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ color: "#ffffffcc", fontSize: 12, fontWeight: 600 }}>{e.subject || "(no subject)"}</div>
                      <div style={{ color: "#ffffff45", fontSize: 10 }}>{new Date(e.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div style={{ color: "#ffffff65", fontSize: 11, marginTop: 2, whiteSpace: "pre-wrap", overflow: "hidden", maxHeight: 36 }}>
                      {e.body}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Form */}
          <div style={{ padding: "14px 14px 0" }}>
            {/* Template */}
            <select
              value={template}
              onChange={(e) => applyTemplate(e.target.value)}
              style={{ ...inputStyle, marginBottom: 10, color: template ? "#ffffffcc" : "#ffffff55" }}
            >
              <option value="">Use a template...</option>
              {TEMPLATES.map((t) => (
                <option key={t.label} value={t.label}>{t.label}</option>
              ))}
            </select>

            {/* To */}
            <div style={fieldRow}>
              <span style={fieldLabel}>To</span>
              <input value={to} onChange={(e) => setTo(e.target.value)} style={inlineInput} />
            </div>
            <div style={{ height: 1, background: "#ffffff12", margin: "0 0 0 40px" }} />

            {/* Subject */}
            <div style={fieldRow}>
              <span style={fieldLabel}>Subject</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" style={inlineInput} />
            </div>
            <div style={{ height: 1, background: "#ffffff12" }} />
          </div>

          {/* Body */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            rows={8}
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "transparent",
              border: "none",
              borderBottom: `1px solid #ffffff12`,
              color: "#ffffffcc",
              fontSize: 13,
              resize: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
              outline: "none",
            }}
          />

          {/* Footer */}
          <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, background: Z.sidebar }}>
            <button
              onClick={handleSend}
              disabled={sending || sent}
              style={{
                padding: "8px 18px",
                background: sent
                  ? "#22c55e"
                  : sending
                  ? "#ffffff20"
                  : `linear-gradient(135deg, ${Z.ultramarine}, ${Z.violet})`,
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                cursor: sending || sent ? "default" : "pointer",
              }}
            >
              {sent ? "Sent ✓" : sending ? "Sending..." : "Send"}
            </button>
            {error && <span style={{ color: "#ff6b6b", fontSize: 12 }}>{error}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#ffffff65",
  cursor: "pointer",
  fontSize: 12,
  padding: "2px 6px",
  borderRadius: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  background: "#ffffff0a",
  border: "1px solid #ffffff18",
  borderRadius: 6,
  color: "#ffffffcc",
  fontSize: 12,
  boxSizing: "border-box",
};

const fieldRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "8px 0",
  gap: 10,
};

const fieldLabel: React.CSSProperties = {
  color: "#ffffff55",
  fontSize: 11,
  fontWeight: 700,
  width: 50,
  flexShrink: 0,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const inlineInput: React.CSSProperties = {
  flex: 1,
  background: "transparent",
  border: "none",
  color: "#ffffffcc",
  fontSize: 13,
  outline: "none",
  padding: "0",
};
