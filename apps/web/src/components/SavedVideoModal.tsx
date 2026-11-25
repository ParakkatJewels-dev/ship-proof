"use client";

import React, { useEffect, useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import type { OrderRecord } from "../lib/orders";
import {
  fetchSavedVideo,
  trimSavedVideo,
  type SavedVideo,
} from "../lib/savedVideo";
import {
  fetchCloudPlayback,
  trimCloudVideo,
  type CloudPlayback,
} from "../lib/shipproofApi";
import { showToast } from "../lib/alerts";
import { TrimPlayer, type TrimRange } from "./TrimPlayer";

/** Where the video is played from: the cloud copy when there is one, otherwise a copy still on the packing computer. */
type Source =
  | { kind: "cloud"; playback: CloudPlayback }
  | { kind: "local"; video: SavedVideo };

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
  const [source, setSource] = useState<Source | null | undefined>(undefined);
  const [duration, setDuration] = useState(0);
  const [trim, setTrim] = useState<TrimRange>({ start: 0, end: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // The stored copy is the one that counts, so it comes first. The packing computer's copy is the
      // fallback for a video that has not finished uploading yet.
      const cloud = await fetchCloudPlayback(order.id);
      let found: Source | null = cloud
        ? { kind: "cloud", playback: cloud }
        : null;
      if (!found) {
        const local = await fetchSavedVideo(order.orderNumber);
        if (local) found = { kind: "local", video: local };
      }
      if (cancelled) return;
      setSource(found);
      const seconds =
        found?.kind === "cloud"
          ? found.playback.durationSeconds
          : (found?.video.durationSeconds ?? 0);
      if (seconds > 0) {
        setDuration(seconds);
        setTrim({ start: 0, end: seconds });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [order.id, order.orderNumber]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const save = async () => {
    if (!source) return;
    setSaving(true);
    try {
      if (source.kind === "cloud") await trimCloudVideo(order.id, trim);
      else await trimSavedVideo(order, source.video.token, trim);
      onClose();
      void showToast("ok", `Trimmed video for ${order.orderNumber} saved.`);
    } catch (err) {
      setSaving(false);
      void showToast(
        "error",
        `Could not trim the video: ${err instanceof Error ? err.message : "the server did not answer"}.`,
      );
    }
  };

  const url =
    source?.kind === "cloud" ? source.playback.url : source?.video.url;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 modal-backdrop"
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
          {source === undefined ? (
            <p className="py-16 text-center text-sm text-muted">
              Loading the video…
            </p>
          ) : source === null || !url ? (
            <div className="py-10 text-center">
              <p className="font-semibold">This video isn&apos;t available</p>
              <p className="text-sm text-muted mt-1.5 max-w-sm mx-auto">
                It may not have finished uploading yet, or it has been removed
                after the retention period.
              </p>
            </div>
          ) : mode === "view" ? (
            <video
              src={url}
              controls
              autoPlay
              className="w-full rounded-2xl bg-black max-h-[60vh]"
            />
          ) : (
            <TrimPlayer
              src={url}
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

        {mode === "trim" && source && url && (
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
