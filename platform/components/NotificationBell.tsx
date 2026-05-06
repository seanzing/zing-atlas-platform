"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Z } from "@/lib/constants";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data, mutate } = useSWR<{ notifications: Notification[]; unread: number }>(
    "/api/notifications",
    fetcher,
    { refreshInterval: 30000 }
  );

  const notifications = data?.notifications ?? [];
  const unread = data?.unread ?? 0;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications/read", { method: "POST" });
    mutate();
  };

  const handleClick = (n: Notification) => {
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const ICONS: Record<string, string> = {
    status_change: "\u2195",
    email_sent: "\u2709",
    task_complete: "\u2713",
    site_deployed: "\uD83D\uDE80",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => { setOpen(!open); if (!open && unread > 0) markAllRead(); }}
        style={{
          position: "relative",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "6px 8px",
          borderRadius: 8,
          color: unread > 0 ? Z.ultramarine : "#ffffff55",
          fontSize: 18,
          lineHeight: 1,
          transition: "color 0.15s",
        }}
        title="Notifications"
      >
        {"\uD83D\uDD14"}
        {unread > 0 && (
          <span style={{
            position: "absolute",
            top: 2,
            right: 2,
            background: "#ef4444",
            color: "#fff",
            fontSize: 9,
            fontWeight: 800,
            borderRadius: 10,
            minWidth: 16,
            height: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 3px",
            lineHeight: 1,
          }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: "50%",
          transform: "translateX(-50%)",
          width: 340,
          background: "#0d0d2e",
          border: "1px solid #3a3a6e",
          borderRadius: 12,
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          zIndex: 1000,
          overflow: "hidden",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid #ffffff12",
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#ffffffcc" }}>Notifications</div>
            {notifications.length > 0 && (
              <button onClick={markAllRead} style={{ background: "none", border: "none", color: "#7aa0ff", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#ffffff35", fontSize: 13 }}>
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "12px 16px",
                    borderBottom: "1px solid #ffffff08",
                    cursor: n.link ? "pointer" : "default",
                    background: n.read ? "transparent" : "#3a5aff08",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => { if (n.link) (e.currentTarget as HTMLElement).style.background = "#ffffff08"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = n.read ? "transparent" : "#3a5aff08"; }}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#ffffff10",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    flexShrink: 0,
                  }}>
                    {ICONS[n.type] || "\u2022"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#ffffffcc", marginBottom: 2 }}>{n.title}</div>
                    {n.message && (
                      <div style={{ fontSize: 11, color: "#ffffff65", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {n.message}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: "#ffffff35", marginTop: 3 }}>{timeAgo(n.createdAt)}</div>
                  </div>
                  {!n.read && (
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: Z.ultramarine, flexShrink: 0, marginTop: 10 }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
