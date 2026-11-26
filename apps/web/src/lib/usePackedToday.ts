"use client";

import { useEffect, useState } from "react";
import { fetchVideoList } from "./shipproofApi";

export interface PackedToday {
  /** Orders packed since midnight (this computer's time). */
  count: number;
  /** Average length of those packing videos, in seconds. Null when none were packed. */
  averageSeconds: number | null;
}

/** Orders packed today and how much video that is, from the saved videos. Null until known or if the API is unreachable. */
export function usePackedToday(): PackedToday | null {
  const [today, setToday] = useState<PackedToday | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const videos = await fetchVideoList();
        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);
        const mine = videos.filter(
          (v) =>
            v.status === "ACTIVE" &&
            Date.parse(v.recordedAt) >= midnight.getTime(),
        );
        if (!cancelled)
          setToday({
            count: mine.length,
            averageSeconds: mine.length
              ? mine.reduce((sum, v) => sum + (v.durationSeconds || 0), 0) /
                mine.length
              : null,
          });
      } catch {
        if (!cancelled) setToday(null);
      }
    };
    void load();
    const timer = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return today;
}

/** 161 -> "2 min 41 s", 45 -> "45 s", 3700 -> "1 h 2 min". */
export function formatAverage(totalSeconds: number) {
  const s = Math.round(totalSeconds);
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${s % 60} s`;
  return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
}
