"use client";

import React, { useEffect, useState } from "react";
import { Check, Info, X } from "lucide-react";
import { dismissToast, subscribeToasts, type ToastItem } from "../lib/toasts";

const SHOW_FOR_MS = 5000;

function Toast({ toast }: { toast: ToastItem }) {
  useEffect(() => {
    const timer = setTimeout(() => dismissToast(toast.id), SHOW_FOR_MS);
    return () => clearTimeout(timer);
  }, [toast.id]);

  const Icon = toast.tone === "ok" ? Check : Info;
  return (
    <div
      role="status"
      className="toast-in flex items-start gap-3 w-[min(92vw,360px)] rounded-2xl bg-white border border-[#D9DCE6] p-3.5 pr-3"
    >
      <span
        className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
          toast.tone === "ok"
            ? "bg-[#E3EFE5] text-[#2F6B3F]"
            : "bg-accent-pale text-accent-dark"
        }`}
      >
        <Icon className="w-4 h-4" />
      </span>
      <p className="flex-1 text-sm leading-5 pt-1">{toast.text}</p>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label="Dismiss"
        className="w-7 h-7 shrink-0 rounded-full inline-flex items-center justify-center text-muted hover:bg-canvas cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/** The corner where notices appear, bottom right (above the bottom bar on a phone). */
export function Toasts() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => subscribeToasts(setItems), []);
  if (items.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="fixed z-[70] right-4 bottom-24 md:bottom-6 flex flex-col items-end gap-2 pointer-events-none"
    >
      {items.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} />
        </div>
      ))}
    </div>
  );
}
