"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Share2, X } from "lucide-react";
import type { OrderRecord } from "../lib/orders";
import { createShareLink, type ShareLink } from "../lib/shipproofApi";

/** 25 Nov 2026, in the viewer's own time zone. */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Makes a link to an order's packing video that opens in any browser, without signing in, and offers
 * ways to pass it on: copy, open, WhatsApp, or the device's own share sheet.
 */
export function ShareVideoModal({
  order,
  onClose,
}: {
  order: OrderRecord;
  onClose: () => void;
}) {
  // undefined while the link is being made
  const [link, setLink] = useState<ShareLink | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    createShareLink(order.id)
      .then((l) => !cancelled && setLink(l))
      .catch(
        (e: unknown) =>
          !cancelled &&
          setError(e instanceof Error ? e.message : "Could not make a link."),
      );
    return () => {
      cancelled = true;
    };
  }, [order.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const message = link
    ? `Packing video for order ${order.orderNumber}: ${link.url}`
    : "";
  const canShareNatively =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
    } catch {
      // Clipboard not allowed: select the text so it can be copied by hand.
      inputRef.current?.select();
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareNatively = async () => {
    if (!link) return;
    try {
      await navigator.share({
        title: `Packing video ${order.orderNumber}`,
        text: `Packing video for order ${order.orderNumber}`,
        url: link.url,
      });
    } catch {
      // Closed without sharing.
    }
  };

  const button =
    "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full text-sm font-semibold transition-colors cursor-pointer";

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 modal-backdrop"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Share the video for ${order.orderNumber}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-2xl bg-white border border-[#D9DCE6]"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold truncate">
              {order.orderNumber}
            </h2>
            <p className="text-xs text-muted mt-0.5">Share packing video</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 -mr-1.5 -mt-0.5 shrink-0 rounded-full inline-flex items-center justify-center text-muted hover:bg-canvas cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="border-t border-[#E6E8F0] px-5 py-4">
          {error ? (
            <p className="py-4 text-center text-sm text-[#B2453D]">{error}</p>
          ) : !link ? (
            <p className="py-4 text-center text-sm text-muted">
              Making a link…
            </p>
          ) : (
            <>
              <p className="text-sm text-ink/80">
                Anyone with this link can watch the video in a browser, without
                signing in.
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#D9DCE6] bg-canvas pl-3 pr-1 py-1">
                <input
                  ref={inputRef}
                  readOnly
                  value={link.url}
                  aria-label="Share link"
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 bg-transparent text-xs text-ink outline-none"
                />
                <button
                  type="button"
                  onClick={copy}
                  className={`${button} h-8 px-3 bg-ink text-white hover:bg-ink/90`}
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-2 text-xs text-muted">
                {link.expiresAt
                  ? `Works until ${formatDate(link.expiresAt)}, when the video is deleted.`
                  : "Works until the video is deleted (30 days after delivery)."}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${button} border border-[#D9DCE6] text-ink hover:bg-canvas`}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${button} bg-[#25D366] text-white hover:bg-[#1FB457]`}
                >
                  WhatsApp
                </a>
                {canShareNatively && (
                  <button
                    type="button"
                    onClick={shareNatively}
                    className={`${button} col-span-2 border border-[#D9DCE6] text-ink hover:bg-canvas`}
                  >
                    <Share2 className="w-4 h-4" />
                    More ways to share
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
