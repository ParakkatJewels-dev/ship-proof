"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { OrderRecord } from "../lib/orders";
import {
  fetchVideoProperties,
  type VideoProperties,
} from "../lib/shipproofApi";

/** 81 seconds becomes "1 min 21 s". */
function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} min ${String(s % 60).padStart(2, "0")} s` : `${s} s`;
}

/** 13033227 bytes becomes "12.4 MB". */
function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

/** 25 Nov 2026, 12:30 pm, in the viewer's own time zone. */
function formatWhen(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date}, ${time}`;
}

/** The details of an order's saved video: when it was recorded, how long it is and how much space it takes. */
export function VideoPropertiesModal({
  order,
  onClose,
}: {
  order: OrderRecord;
  onClose: () => void;
}) {
  // undefined while loading, null when the order has no saved video
  const [video, setVideo] = useState<VideoProperties | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let cancelled = false;
    fetchVideoProperties(order.id).then((v) => {
      if (!cancelled) setVideo(v);
    });
    return () => {
      cancelled = true;
    };
  }, [order.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows: [string, string][] = video
    ? [
        ["Recorded", formatWhen(video.recordedAt)],
        ["Duration", formatDuration(video.durationSeconds)],
        ["Storage used", formatSize(video.fileSizeBytes)],
        [
          "Resolution",
          video.width && video.height
            ? `${video.width} × ${video.height}`
            : "Not recorded",
        ],
        [
          "Frame rate",
          video.fps
            ? `${Number.isInteger(video.fps) ? video.fps : video.fps.toFixed(1)} fps`
            : "Not recorded",
        ],
        [
          "Deleted on",
          video.expiresAt
            ? formatWhen(video.expiresAt)
            : "Set when the order is delivered",
        ],
        ...(video.interrupted
          ? ([["Note", "Recording was cut off before it finished"]] as [
              string,
              string,
            ][])
          : []),
      ]
    : [];

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 modal-backdrop"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Properties of the video for ${order.orderNumber}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[360px] rounded-2xl bg-white border border-[#D9DCE6]"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold truncate">
              {order.orderNumber}
            </h2>
            <p className="text-xs text-muted mt-0.5">Video properties</p>
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

        {video === undefined ? (
          <p className="px-5 py-8 text-center text-sm text-muted border-t border-[#E6E8F0]">
            Loading…
          </p>
        ) : video === null ? (
          <p className="px-5 py-8 text-center text-sm text-muted border-t border-[#E6E8F0]">
            No video has been saved for this order yet.
          </p>
        ) : (
          <dl className="border-t border-[#E6E8F0]">
            {rows.map(([label, value]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-4 px-5 py-3 border-b border-[#E6E8F0] last:border-b-0 text-sm"
              >
                <dt className="text-muted shrink-0">{label}</dt>
                <dd className="font-medium text-right">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
