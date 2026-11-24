"use client";

import React, { useEffect, useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import type { OrderRecord } from "../lib/orders";
import {
  fetchSavedVideo,
  trimSavedVideo,
  type SavedVideo,
} from "../lib/savedVideo";
import { showToast } from "../lib/alerts";
import { TrimPlayer, type TrimRange } from "./TrimPlayer";

/** Plays an order's saved video, or lets the packer cut it down and save the shorter version. */
export function SavedVideoModal({
  order,
  mode,
  onClose,
}: {
  order: OrderRecord;
  mode: "view" | "trim";
  onClose: () => void;
}) {
  const [video, setVideo] = useState<SavedVideo | null | undefined>(undefined);
  const [duration, setDuration] = useState(0);
  const [trim, setTrim] = useState<TrimRange>({ start: 0, end: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSavedVideo(order.orderNumber).then((v) => {
      if (cancelled) return;
      setVideo(v);
      if (v && v.durationSeconds > 0) {
        setDuration(v.durationSeconds);
        setTrim({ start: 0, end: v.durationSeconds });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [order.orderNumber]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const save = async () => {
    if (!video) return;
    setSaving(true);
    try {
      await trimSavedVideo(order, video.token, trim);
      onClose();
      void showToast(
        "ok",
        `Trimmed video for ${order.orderNumber} saved and uploading.`,
      );
    } catch (err) {
      setSaving(false);
      void showToast(
        "error",
        `Could not trim the video: ${err instanceof Error ? err.message : "the camera agent did not answer"}.`,
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40"
      onClick={() => !saving && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${mode === "trim" ? "Trim" : "View"} video for ${order.orderNumber}`}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-5 sm:p-6"
      >
        <button
          onClick={onClose}
          disabled={saving}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-canvas cursor-pointer disabled:opacity-40"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-xl font-semibold pr-10">
          {mode === "trim" ? "Trim video" : "Packing video"} ·{" "}
          {order.orderNumber}
        </h2>

        <div className="mt-4">
          {video === undefined ? (
            <p className="py-16 text-center text-sm text-muted">
              Loading the video…
            </p>
          ) : video === null ? (
            <div className="py-10 text-center">
              <p className="font-semibold">
                The video isn&apos;t available on this computer
              </p>
              <p className="text-sm text-muted mt-1.5 max-w-sm mx-auto">
                Only videos still stored at this packing station can be played
                or trimmed here. Videos that have been uploaded and cleared from
                this computer are not available yet.
              </p>
            </div>
          ) : mode === "view" ? (
            <video
              src={video.url}
              controls
              autoPlay
              className="w-full rounded-2xl bg-black max-h-[60vh]"
            />
          ) : (
            <TrimPlayer
              src={video.url}
              trim={trim}
              duration={duration}
              onDuration={(d) => {
                setDuration(d);
                setTrim((t) => (t.end === 0 ? { start: 0, end: d } : t));
              }}
              onTrim={setTrim}
              disabled={saving}
            />
          )}
        </div>

        {mode === "trim" && video && (
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-canvas hover:bg-[#E4E7EE] cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || duration === 0}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-accent hover:bg-accent-dark cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <LoaderCircle className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {saving ? "Saving…" : "Save trimmed video"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
