"use client";

import { useEffect, useRef } from "react";

/** A barcode reader types its digits far faster than a person can: one key every few milliseconds. */
const MAX_GAP_MS = 60;
const MIN_LENGTH = 3;

const isTypingField = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
};

/**
 * Listens for a barcode reader anywhere on the page. A USB reader acts like a keyboard: it "types" the
 * code and presses Enter. Keys that arrive in a fast burst ending in Enter are treated as a scan and
 * passed to `onScan`. Normal typing is slower and is left alone, and so are text boxes: a scan made
 * while a box is focused simply fills that box, as the reader would for any keyboard.
 */
export function useBarcodeScanner(onScan: (code: string) => void) {
  const latest = useRef(onScan);
  useEffect(() => {
    latest.current = onScan;
  });

  useEffect(() => {
    let buffer = "";
    let last = 0;

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || isTypingField(e.target)) {
        buffer = "";
        return;
      }
      const now = performance.now();

      if (e.key === "Enter" || e.key === "Tab") {
        const code = buffer;
        buffer = "";
        if (code.length >= MIN_LENGTH && now - last <= MAX_GAP_MS) {
          e.preventDefault();
          latest.current(code);
        }
        return;
      }

      if (e.key.length !== 1) return; // Shift, arrows and other non-character keys.
      // A pause means a person is typing, not a scanner: start the code again.
      if (now - last > MAX_GAP_MS) buffer = "";
      buffer += e.key;
      last = now;
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
}
