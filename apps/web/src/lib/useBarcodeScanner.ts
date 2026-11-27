"use client";

import { useEffect, useRef } from "react";

/**
 * A barcode reader types its characters far faster than a person: usually a few milliseconds apart,
 * though some guns pause up to ~100 ms between characters. People typing leave longer gaps.
 */
export const MAX_GAP_MS = 120;
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

/** What the detector made of one key press; the scanner test page shows these. */
export interface ScanKeyEvent {
  key: string;
  /** Milliseconds since the previous key, or null for the first. */
  gapMs: number | null;
  /** "scan": Enter ended a scan; "ignored": the reason this key did not count. */
  result:
    | { kind: "char"; buffer: string }
    | { kind: "scan"; code: string }
    | { kind: "ignored"; reason: string };
}

/**
 * Turns key presses into scans. A USB reader acts like a keyboard: it "types" the code and presses
 * Enter (or Tab). Keys that arrive in a fast burst and end with Enter count as one scan. Text boxes are
 * left alone: a scan made while a box is focused simply fills that box, as for any keyboard.
 */
export function createScanDetector(
  onScan: (code: string) => void,
  onKey?: (e: ScanKeyEvent) => void,
) {
  let buffer = "";
  let last = 0;
  let lastAny = 0;

  return (e: KeyboardEvent) => {
    const now = performance.now();
    const gapMs = lastAny ? Math.round(now - lastAny) : null;
    lastAny = now;
    const report = (result: ScanKeyEvent["result"]) =>
      onKey?.({ key: e.key, gapMs, result });

    if (isTypingField(e.target)) {
      buffer = "";
      return report({ kind: "ignored", reason: "a text box has the cursor" });
    }
    // Shift, Alt and the like on their own: some readers send them around characters. Not a reason to start over.
    if (
      ["Shift", "Alt", "Control", "Meta", "CapsLock", "NumLock"].includes(e.key)
    )
      return report({ kind: "ignored", reason: "modifier key" });
    // A shortcut such as Ctrl+F: not part of a scan.
    if (e.ctrlKey || e.metaKey) {
      buffer = "";
      return report({ kind: "ignored", reason: "Ctrl/Cmd shortcut" });
    }

    if (e.key === "Enter" || e.key === "Tab") {
      const code = buffer;
      buffer = "";
      if (code.length < MIN_LENGTH)
        return report({
          kind: "ignored",
          reason: code
            ? `too short ("${code}")`
            : "Enter with nothing before it",
        });
      if (now - last > MAX_GAP_MS)
        return report({
          kind: "ignored",
          reason: `Enter came ${Math.round(now - last)} ms after the last character (limit ${MAX_GAP_MS} ms)`,
        });
      e.preventDefault();
      onScan(code);
      return report({ kind: "scan", code });
    }

    if (e.key.length !== 1)
      return report({ kind: "ignored", reason: "not a character key" });
    // A pause means a person is typing, not a scanner: start the code again.
    if (now - last > MAX_GAP_MS) buffer = "";
    buffer += e.key;
    last = now;
    report({ kind: "char", buffer });
  };
}

/** Listens for a barcode reader anywhere on the page and passes each scanned code to `onScan`. */
export function useBarcodeScanner(onScan: (code: string) => void) {
  const latest = useRef(onScan);
  useEffect(() => {
    latest.current = onScan;
  });

  useEffect(() => {
    const onKey = createScanDetector((code) => latest.current(code));
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
}
