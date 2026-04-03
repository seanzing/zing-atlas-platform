"use client";

import { useState, useCallback } from "react";

interface ToastState {
  message: string;
  ok: boolean;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, ok: boolean) => {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3500);
  }, []);

  return { toast, showToast };
}

export function Toast({ toast }: { toast: { message: string; ok: boolean } | null }) {
  if (!toast) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        padding: "12px 20px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        color: "#fff",
        background: toast.ok ? "#10b981" : "#ef4444",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 9999,
        transition: "opacity 0.3s",
      }}
    >
      {toast.message}
    </div>
  );
}
