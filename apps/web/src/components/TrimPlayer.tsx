"use client";

import React, { useRef, useState } from "react";
import { Scissors } from "lucide-react";

export interface TrimRange {
  start: number;
  end: number;
}

/** 0:07.4 style time label. */
export function formatClip(seconds: number) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
}

const MIN_CLIP_SECONDS = 1;

const thumb =
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-md [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:cursor-ew-resize " +
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:rounded-md [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-accent [&::-moz-range-thumb]:cursor-ew-resize";

/**
 * Plays the recorded video and lets the packer pick which part to keep. The video itself is never
 * changed here; the chosen start and end go back to the parent, which sends them to the camera agent.
 * While it plays, playback stays inside the chosen part.
 */
export function TrimPlayer({
  src,
  trim,
  duration,
  onDuration,
  onTrim,
  disabled = false,
}: {
  src: string;
  trim: TrimRange;
  /** Length of the video in seconds, or 0 until the player has read it. */
  duration: number;
  onDuration: (seconds: number) => void;
  onTrim: (range: TrimRange) => void;
  disabled?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [failed, setFailed] = useState(false);

  const pct = (t: number) => (duration > 0 ? (t / duration) * 100 : 0);
  const trimmed =
    duration > 0 && (trim.start > 0.05 || trim.end < duration - 0.05);

  const setStart = (value: number) => {
    const start = Math.min(Math.max(0, value), trim.end - MIN_CLIP_SECONDS);
    onTrim({ start, end: trim.end });
    if (video.current && video.current.currentTime < start)
      video.current.currentTime = start;
  };
  const setEnd = (value: number) => {
    const end = Math.max(
      Math.min(duration, value),
      trim.start + MIN_CLIP_SECONDS,
    );
    onTrim({ start: trim.start, end });
    if (video.current && video.current.currentTime > end)
      video.current.currentTime = end;
  };

  // Keep playback inside the chosen part.
  const onTimeUpdate = () => {
    const v = video.current;
    if (!v) return;
    setTime(v.currentTime);
    if (v.currentTime >= trim.end) {
      v.pause();
      v.currentTime = trim.end;
    } else if (v.currentTime < trim.start - 0.05) {
      v.currentTime = trim.start;
    }
  };

  const playClip = () => {
    const v = video.current;
    if (!v) return;
    v.currentTime = trim.start;
    void v.play();
  };

  if (failed) {
    return (
      <div className="aspect-video rounded-2xl bg-ink flex items-center justify-center px-6 text-center text-white/80 text-sm">
        <p>
          The recording can&apos;t be played here. It is only available on the
          computer the camera agent runs on. It will be saved untrimmed a few
          minutes after you stop if nobody reviews it.
        </p>
      </div>
    );
  }

  return (
    <div>
      <video
        ref={video}
        src={src}
        controls
        preload="metadata"
        playsInline
        onLoadedMetadata={(e) => onDuration(e.currentTarget.duration)}
        onTimeUpdate={onTimeUpdate}
        onError={() => setFailed(true)}
        className="w-full aspect-video rounded-2xl bg-ink object-contain"
      />

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold inline-flex items-center gap-2">
            <Scissors className="w-4 h-4" />
            Trim
          </p>
          <button
            onClick={playClip}
            disabled={duration === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-canvas hover:bg-[#E1E5EF] disabled:opacity-50 cursor-pointer transition-colors"
          >
            Play selected part
          </button>
        </div>

        {/* Two handles on one track: the part between them is kept. */}
        <div className="relative h-8 mt-3">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-canvas" />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-accent"
            style={{
              left: `${pct(trim.start)}%`,
              width: `${pct(trim.end - trim.start)}%`,
            }}
          />
          <div
            className="absolute top-1 bottom-1 w-0.5 bg-ink/60 pointer-events-none"
            style={{ left: `${pct(time)}%` }}
            aria-hidden="true"
          />
          <input
            type="range"
            aria-label="Trim start"
            min={0}
            max={duration || 1}
            step={0.1}
            value={trim.start}
            disabled={disabled || duration === 0}
            onChange={(e) => setStart(Number(e.target.value))}
            className={`absolute inset-0 w-full h-full appearance-none bg-transparent pointer-events-none ${thumb}`}
          />
          <input
            type="range"
            aria-label="Trim end"
            min={0}
            max={duration || 1}
            step={0.1}
            value={trim.end}
            disabled={disabled || duration === 0}
            onChange={(e) => setEnd(Number(e.target.value))}
            className={`absolute inset-0 w-full h-full appearance-none bg-transparent pointer-events-none ${thumb}`}
          />
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-canvas/60 px-3 py-2">
            <p className="text-[11px] text-muted">Start</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatClip(trim.start)}
            </p>
            <button
              onClick={() => setStart(video.current?.currentTime ?? 0)}
              disabled={disabled || duration === 0}
              className="mt-1 text-[11px] font-medium text-accent hover:text-accent-dark disabled:opacity-40 cursor-pointer"
            >
              Set to now
            </button>
          </div>
          <div className="rounded-xl bg-canvas/60 px-3 py-2">
            <p className="text-[11px] text-muted">Length kept</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatClip(trim.end - trim.start)}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {trimmed ? "Trimmed" : "Whole video"}
            </p>
          </div>
          <div className="rounded-xl bg-canvas/60 px-3 py-2">
            <p className="text-[11px] text-muted">End</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatClip(trim.end)}
            </p>
            <button
              onClick={() => setEnd(video.current?.currentTime ?? duration)}
              disabled={disabled || duration === 0}
              className="mt-1 text-[11px] font-medium text-accent hover:text-accent-dark disabled:opacity-40 cursor-pointer"
            >
              Set to now
            </button>
          </div>
        </div>
        {trimmed && (
          <button
            onClick={() => onTrim({ start: 0, end: duration })}
            disabled={disabled}
            className="mt-2 text-xs font-medium text-muted hover:text-ink cursor-pointer"
          >
            Reset to the whole video
          </button>
        )}
      </div>
    </div>
  );
}
