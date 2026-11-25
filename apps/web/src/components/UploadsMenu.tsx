"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Clock, CloudUpload } from "lucide-react";
import { useAppData } from "./AppData";
import type { UploadItem } from "../lib/shipproofApi";

/** "12.4 MB", "640 KB". */
function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/** 42 -> "0:42", 205 -> "3:25", 3700 -> "1:01:40". */
function formatLength(total: number) {
  const s = Math.max(0, Math.round(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

function secondsUntil(iso: string, now: number) {
  return Math.max(0, Math.ceil((Date.parse(iso) - now) / 1000));
}

function secondsAgo(iso: string, now: number) {
  return Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
}

const STATE_LABEL: Record<UploadItem["state"], string> = {
  waiting: "Waiting",
  compressing: "Compressing",
  uploading: "Uploading",
  confirming: "Confirming",
  retrying: "Retrying",
  done: "Uploaded",
};

/** The text under a video's progress bar. */
function detail(item: UploadItem, now: number): string {
  const total = item.totalBytes ? formatSize(item.totalBytes) : null;
  switch (item.state) {
    case "uploading": {
      if (!item.totalBytes) return "Sending to the cloud";
      const sent = Math.min(item.bytesSent ?? 0, item.totalBytes);
      return `${formatSize(sent)} of ${total} · ${Math.round((sent / item.totalBytes) * 100)}%`;
    }
    case "compressing":
      return "Making the video smaller before sending";
    case "confirming":
      return "Sent. Waiting for the cloud to confirm";
    case "waiting":
      return `${total ? `${total} · ` : ""}Waiting for the upload ahead`;
    case "retrying":
      return `Retrying in ${item.retryAt ? secondsUntil(item.retryAt, now) : 0} s${item.error ? ` · ${item.error}` : ""}`;
    case "done":
      return `${total ? `${total} · ` : ""}Uploaded ${item.finishedAt ? secondsAgo(item.finishedAt, now) : 0} s ago`;
  }
}

function Bar({ item }: { item: UploadItem }) {
  const track = "relative h-1.5 rounded-full overflow-hidden";
  if (item.state === "uploading" && item.totalBytes) {
    const pct = Math.min(100, ((item.bytesSent ?? 0) / item.totalBytes) * 100);
    return (
      <div
        className={`${track} bg-accent-pale`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  }
  if (
    item.state === "compressing" ||
    item.state === "confirming" ||
    item.state === "uploading"
  ) {
    return (
      <div className={`${track} bg-accent-pale`}>
        <div className="absolute inset-y-0 w-2/5 rounded-full bg-accent upload-sweep" />
      </div>
    );
  }
  if (item.state === "done")
    return (
      <div className={`${track} bg-[#CFE5D4]`}>
        <div className="h-full w-full bg-[#2F6B3F]" />
      </div>
    );
  if (item.state === "retrying")
    return (
      <div className={`${track} bg-[#F6D5D2]`}>
        <div className="h-full w-full bg-[#D9443A]" />
      </div>
    );
  return <div className={`${track} bg-canvas`} />;
}

/** One row per video: state chip, progress bar and detail text. Used on the Uploads page. */
export function UploadList({
  items,
  now,
}: {
  items: UploadItem[];
  now: number;
}) {
  return (
    <ul>
      {items.map((item) => (
        <li
          key={item.sessionId}
          className="px-5 py-3.5 border-b border-[#E6E8F0] last:border-b-0"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold">{item.orderNumber}</span>
              {item.durationSeconds ? (
                <span
                  title="Video length"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-canvas text-[11px] font-semibold text-ink/80 tabular-nums"
                >
                  <Clock className="w-3 h-3" />
                  {formatLength(item.durationSeconds)}
                </span>
              ) : null}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                item.state === "done"
                  ? "bg-[#E3EFE5] text-[#2F6B3F]"
                  : item.state === "retrying"
                    ? "bg-[#FBE6E4] text-[#B2453D]"
                    : item.state === "waiting"
                      ? "bg-canvas text-muted"
                      : "bg-accent-pale text-accent-dark"
              }`}
            >
              {item.state === "done" && <Check className="w-3 h-3" />}
              {STATE_LABEL[item.state]}
            </span>
          </div>
          <div className="mt-2">
            <Bar item={item} />
          </div>
          {item.state !== "done" && (
            <p className="mt-1.5 text-xs text-muted">{detail(item, now)}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

/** A clock that ticks every second while `active`, for countdowns and "x s ago". */
export function useNow(active: boolean) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

/** The videos on their way to the cloud, from the connected packing computer. */
export function useUploads() {
  const { device } = useAppData();
  const info = device.info?.connected ? device.info : null;
  const items: UploadItem[] = info?.uploads ?? [];
  return {
    online: !!info,
    items,
    onTheWay: items.filter((i) => i.state !== "done"),
    working: items.some(
      (i) =>
        i.state === "compressing" ||
        i.state === "uploading" ||
        i.state === "confirming",
    ),
    failing: items.some((i) => i.state === "retrying"),
  };
}

/** The Uploads link in the sidebar. The badge shows how many videos are still on their way. */
export function UploadsNavLink({
  buttonClass,
  active,
  locked,
  onLocked,
}: {
  buttonClass: string;
  active: boolean;
  locked: boolean;
  onLocked: () => void;
}) {
  const { onTheWay, working, failing } = useUploads();
  const label = onTheWay.length
    ? `Uploads: ${onTheWay.length} in progress`
    : "Uploads";
  return (
    <Link
      href="/uploads"
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      aria-disabled={locked || undefined}
      onClick={(e) => {
        if (locked) {
          e.preventDefault();
          onLocked();
        }
      }}
      className={`${buttonClass} relative ${active ? "bg-ink text-white" : "text-ink/80 hover:bg-canvas"} ${locked ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <CloudUpload className="w-5 h-5" />
      {working && (
        <svg
          viewBox="0 0 44 44"
          className="absolute inset-0 m-auto w-full h-full animate-spin motion-reduce:animate-none pointer-events-none"
          aria-hidden="true"
        >
          <circle
            cx="22"
            cy="22"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.55"
            strokeWidth="2"
            strokeDasharray="22 104"
            strokeLinecap="round"
            className="text-accent"
          />
        </svg>
      )}
      {onTheWay.length > 0 && (
        <span
          className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold leading-[18px] text-center text-white ring-2 ring-white ${failing ? "bg-[#D9443A]" : "bg-accent"}`}
        >
          {onTheWay.length > 9 ? "9+" : onTheWay.length}
        </span>
      )}
    </Link>
  );
}
