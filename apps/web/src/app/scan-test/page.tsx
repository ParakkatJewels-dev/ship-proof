"use client";

import { useEffect, useState } from "react";
import {
  MAX_GAP_MS,
  createScanDetector,
  type ScanKeyEvent,
} from "../../lib/useBarcodeScanner";

/**
 * Scanner check: shows every key a barcode reader sends, the time between keys, and whether ShipProof
 * recognises it as a scan. Nothing is recorded or looked up here. Open /scan-test and scan a label.
 */
export default function ScanTestPage() {
  const [keys, setKeys] = useState<ScanKeyEvent[]>([]);
  const [scans, setScans] = useState<string[]>([]);

  useEffect(() => {
    const onKey = createScanDetector(
      (code) => setScans((s) => [code, ...s].slice(0, 10)),
      (e) => setKeys((k) => [...k, e].slice(-60)),
    );
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return (
    <main className="min-h-screen bg-canvas p-6 sm:p-10 text-ink">
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Scanner check</h1>
          <p className="text-sm text-muted mt-1">
            Click anywhere on this page, then scan a barcode. A scan counts when
            its characters arrive at most {MAX_GAP_MS} ms apart and end with
            Enter. Nothing is recorded here.
          </p>
        </header>

        <section className="bg-white rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-2">Recognised scans</h2>
          {scans.length ? (
            <ul className="space-y-1">
              {scans.map((s, i) => (
                <li
                  key={`${s}-${i}`}
                  className="font-mono text-lg text-[#2F6B3F]"
                >
                  ✓ {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">None yet.</p>
          )}
        </section>

        <section className="bg-white rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">Keys received</h2>
            <button
              type="button"
              onClick={() => {
                setKeys([]);
                setScans([]);
              }}
              className="text-xs font-semibold text-accent"
            >
              Clear
            </button>
          </div>
          {keys.length ? (
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="text-left text-[11px] uppercase text-muted">
                  <th className="py-1">Key</th>
                  <th className="py-1">Gap</th>
                  <th className="py-1">Result</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k, i) => (
                  <tr key={i} className="border-t border-canvas">
                    <td className="py-1">{k.key === " " ? "Space" : k.key}</td>
                    <td
                      className={`py-1 ${k.gapMs !== null && k.gapMs > MAX_GAP_MS ? "text-[#D9443A]" : ""}`}
                    >
                      {k.gapMs === null ? "—" : `${k.gapMs} ms`}
                    </td>
                    <td className="py-1">
                      {k.result.kind === "scan"
                        ? `SCAN "${k.result.code}"`
                        : k.result.kind === "char"
                          ? `so far "${k.result.buffer}"`
                          : `ignored: ${k.result.reason}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted">
              Nothing received yet. If scanning shows nothing here, the
              scanner&apos;s keys are not reaching this browser tab: click on
              the page first.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
