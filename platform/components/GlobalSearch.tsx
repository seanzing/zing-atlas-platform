"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Z } from "@/lib/constants";

interface SearchResult {
  type: "contact" | "onboarding" | "deal";
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

const TYPE_LABELS: Record<string, string> = {
  contact: "Contacts",
  onboarding: "Onboarding",
  deal: "Deals",
};

const TYPE_COLORS: Record<string, string> = {
  contact: Z.bluejeans,
  onboarding: Z.violet,
  deal: Z.turquoise,
};

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const router = useRouter();

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setActiveIndex(0);
      }
    }, 300);
  }, []);

  const handleChange = (v: string) => {
    setQuery(v);
    search(v);
  };

  const navigate = (result: SearchResult) => {
    setOpen(false);
    router.push(result.url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      navigate(results[activeIndex]);
    }
  };

  if (!open) return null;

  // Group results by type
  const grouped: Record<string, SearchResult[]> = {};
  results.forEach((r) => {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  });

  let flatIndex = 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 120,
      }}
    >
      <div
        onClick={() => setOpen(false)}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(5,5,54,0.5)",
          backdropFilter: "blur(4px)",
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: 560,
          background: Z.card,
          border: `1px solid ${Z.border}`,
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(5,5,54,0.3)",
          overflow: "hidden",
        }}
      >
        {/* Search Input */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${Z.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <svg
              width="18"
              height="18"
              fill="none"
              stroke={Z.textMuted}
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search contacts, onboarding, deals..."
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: 15,
                color: Z.textPrimary,
                background: "transparent",
              }}
            />
            <kbd
              style={{
                fontSize: 10,
                color: Z.textMuted,
                background: Z.bg,
                padding: "3px 8px",
                borderRadius: 4,
                border: `1px solid ${Z.border}`,
              }}
            >
              ESC
            </kbd>
          </div>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {results.length === 0 && query.length >= 2 && (
            <div style={{ padding: 24, textAlign: "center", color: Z.textMuted, fontSize: 13 }}>
              No results found
            </div>
          )}
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <div
                style={{
                  padding: "8px 20px",
                  fontSize: 10,
                  fontWeight: 800,
                  color: Z.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  background: Z.bg,
                }}
              >
                {TYPE_LABELS[type] || type}
              </div>
              {items.map((item) => {
                const idx = flatIndex++;
                return (
                  <div
                    key={item.id}
                    onClick={() => navigate(item)}
                    style={{
                      padding: "10px 20px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                      background: idx === activeIndex ? `${Z.ultramarine}08` : "transparent",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: TYPE_COLORS[type] || Z.grey,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: Z.textPrimary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div
                          style={{
                            fontSize: 11,
                            color: Z.textMuted,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "10px 20px",
            borderTop: `1px solid ${Z.border}`,
            display: "flex",
            gap: 16,
            fontSize: 11,
            color: Z.textMuted,
          }}
        >
          <span>↑↓ navigate</span>
          <span>Enter select</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  );
}
