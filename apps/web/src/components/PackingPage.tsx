"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  LoaderCircle,
  RotateCcw,
  Square,
} from "lucide-react";
import { AGENT_URL, reviewVideoUrl } from "../lib/shipproofApi";
import { formatDuration } from "../lib/usePacking";
import { AppShell } from "./AppShell";
import { useAppData } from "./AppData";
import { TrimPlayer, formatClip } from "./TrimPlayer";
import { Card, ProductThumb } from "./ui";

/**
 * The page a packer works from while an order is being recorded: the order's products, the live
 * camera picture, and the Stop recording and Retake buttons. After Stop it turns into a review: the
 * recorded video, trim controls, and the Save and Retake buttons.
 */
export function PackingPage() {
  const router = useRouter();
  const { packing, orders, device, navLocked } = useAppData();
  const { session } = packing;
  const order = orders.orders.find((o) => o.id === session.orderId);

  // Leave for the Orders page once the recording has been saved. A retake never goes idle in between.
  const previous = useRef(session.status);
  useEffect(() => {
    if (previous.current !== "idle" && session.status === "idle")
      router.push("/orders");
    previous.current = session.status;
  }, [session.status, router]);

  const [confirmingRetake, setConfirmingRetake] = useState(false);

  // The part of the recorded video to keep. Tied to the recording it belongs to, so a new recording starts untrimmed.
  const [clip, setClip] = useState<{
    sessionId?: string;
    duration: number;
    start: number;
    end: number;
  }>({
    duration: 0,
    start: 0,
    end: 0,
  });
  const trim =
    clip.sessionId === session.sessionId
      ? clip
      : {
          sessionId: session.sessionId,
          duration: session.videoSeconds ?? 0,
          start: 0,
          end: session.videoSeconds ?? 0,
        };

  // The live picture comes from the camera agent on this computer, using the recording's one-time key.
  const previewUrl = session.previewToken
    ? `${AGENT_URL}/preview.mjpg?token=${encodeURIComponent(session.previewToken)}`
    : null;
  const [picture, setPicture] = useState<{
    url: string | null;
    state: "loading" | "live" | "failed";
  }>({
    url: previewUrl,
    state: "loading",
  });
  // Start waiting again whenever the address changes (a new recording after a retake).
  const pictureState = picture.url === previewUrl ? picture.state : "loading";

  const starting = session.status === "starting";
  const recording = session.status === "recording";
  const stopping = session.status === "stopping";
  const reviewing = session.status === "review" || session.status === "saving";
  const saving = session.status === "saving";
  const busy = starting || stopping || saving;

  if (session.status === "idle") {
    return (
      <AppShell>
        <Card className="max-w-xl mx-auto text-center mt-10">
          <h1 className="text-xl font-semibold">No recording in progress</h1>
          <p className="text-sm text-muted mt-2">
            Start packing from the Orders page, or with the Start packing
            button, to open this page.
          </p>
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-accent hover:bg-accent-dark transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Orders
          </Link>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="flex flex-wrap items-center justify-between gap-3 mb-4 min-h-14">
        <div className="min-w-0">
          {!navLocked && (
            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Orders
            </Link>
          )}
          <h1 className="text-2xl sm:text-[26px] font-medium tracking-tight mt-1 flex items-center gap-3">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${recording ? "bg-[#D9443A] animate-pulse" : "bg-[#9AA0AE]"}`}
            />
            {reviewing
              ? "Review"
              : starting
                ? "Starting"
                : stopping
                  ? "Finishing"
                  : "Packing"}{" "}
            {session.orderNumber}
          </h1>
        </div>
        <span className="text-3xl font-semibold tabular-nums">
          {reviewing
            ? formatClip(trim.end - trim.start)
            : formatDuration(packing.elapsedSeconds)}
        </span>
      </header>

      <main className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Review: the recorded video and trim controls */}
        {reviewing && session.sessionId && session.reviewToken && (
          <Card className="xl:col-span-5 xl:self-start">
            <h2 className="text-lg font-semibold">Recorded video</h2>
            <div className="mt-4">
              <TrimPlayer
                src={reviewVideoUrl(session.sessionId, session.reviewToken)}
                trim={{ start: trim.start, end: trim.end }}
                duration={trim.duration}
                disabled={saving}
                onDuration={(d) =>
                  setClip({
                    sessionId: session.sessionId,
                    duration: d,
                    start: 0,
                    end: d,
                  })
                }
                onTrim={(range) => setClip({ ...trim, ...range })}
              />
            </div>
            <p className="text-xs text-muted mt-3">
              Watch the recording and keep only the part you need. If it is
              wrong, use Retake to record this order again. Nothing is uploaded
              until you press Save.
            </p>
          </Card>
        )}

        {/* Live preview */}
        {!reviewing && (
          <Card className="xl:col-span-5 xl:self-start">
            <h2 className="text-lg font-semibold">Camera preview</h2>
            <div className="relative mt-4 aspect-video rounded-2xl overflow-hidden bg-ink">
              {previewUrl && pictureState !== "failed" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={previewUrl}
                  src={previewUrl}
                  alt="Live camera picture"
                  onLoad={() => setPicture({ url: previewUrl, state: "live" })}
                  onError={() =>
                    setPicture({ url: previewUrl, state: "failed" })
                  }
                  className="absolute inset-0 w-full h-full object-contain"
                />
              )}
              {recording && pictureState === "live" && (
                <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/60 text-white text-xs font-semibold tabular-nums">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A4F] animate-pulse" />
                  REC {formatDuration(packing.elapsedSeconds)}
                </span>
              )}
              {(!previewUrl || pictureState !== "live") && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white/80 text-sm">
                  {pictureState === "failed" ? (
                    <p>
                      The live picture isn&apos;t available here. It only shows
                      on the computer the camera agent runs on. The recording is
                      still running.
                    </p>
                  ) : session.offline ? (
                    <p>
                      The camera device is offline. It keeps recording on the
                      packing station.
                    </p>
                  ) : (
                    <>
                      <LoaderCircle className="w-6 h-6 animate-spin" />
                      <p>
                        {device.connected || starting
                          ? "Connecting to the camera…"
                          : "Waiting for the camera device…"}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-muted mt-3">
              Pack every item in front of the camera. If the picture is wrong,
              use Retake to start this order again.
            </p>
          </Card>
        )}

        {/* Right column: the products, with the action buttons right below them */}
        <div className="xl:col-span-7 flex flex-col gap-4 xl:self-start">
          <Card className="flex flex-col">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Products to pack</h2>
              {order && (
                <span className="px-2 py-0.5 rounded-full bg-accent-pale text-accent-dark text-[11px] font-semibold">
                  {order.items.reduce((sum, it) => sum + it.quantity, 0)} items
                </span>
              )}
            </div>

            {order ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-[#E1E5EF]">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                      <th
                        scope="col"
                        className="px-4 py-2.5 bg-canvas/60 font-semibold border-b border-r border-[#E1E5EF]"
                      >
                        Product name
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-2.5 bg-canvas/60 font-semibold text-right w-24 border-b border-[#E1E5EF]"
                      >
                        Quantity
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((it) => (
                      <tr key={it.id} className="[&:last-child>*]:border-b-0">
                        <td className="px-4 py-2.5 border-b border-r border-[#E1E5EF]">
                          <div className="flex items-center gap-3">
                            <ProductThumb
                              src={it.imageUrl}
                              name={it.name}
                              size={48}
                            />
                            <span className="min-w-0">{it.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold border-b border-[#E1E5EF]">
                          {it.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted mt-4">
                The product list for {session.orderNumber} isn&apos;t loaded on
                this page. Open the order from the Orders page to see it.
              </p>
            )}
          </Card>

          {/* Actions */}
          <div className="bg-white rounded-[22px] p-4 sm:p-5">
            {confirmingRetake ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  <span className="font-semibold">
                    {reviewing
                      ? "Throw away this recording and record this order again?"
                      : "Throw away this recording and start again?"}
                  </span>{" "}
                  <span className="text-muted">Nothing from it is saved.</span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmingRetake(false)}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium bg-canvas hover:bg-[#E1E5EF] cursor-pointer transition-colors"
                  >
                    Keep recording
                  </button>
                  <button
                    onClick={() => {
                      setConfirmingRetake(false);
                      if (order) {
                        if (reviewing) void packing.discardReview(order);
                        else packing.retake(order);
                      }
                    }}
                    disabled={!order}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-ink hover:bg-black disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Yes, retake
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => setConfirmingRetake(true)}
                  disabled={
                    (!recording && !(session.status === "review")) || !order
                  }
                  title={
                    !order
                      ? "Needs the order's product list"
                      : "Discard this recording and start again"
                  }
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border border-[#E1E5EF] bg-white hover:bg-canvas disabled:opacity-50 disabled:hover:bg-white disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retake
                </button>
                {reviewing ? (
                  <button
                    onClick={() =>
                      void packing.saveReview({
                        start: trim.start,
                        end: trim.end,
                      })
                    }
                    disabled={saving || trim.duration === 0}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-accent hover:bg-accent-dark disabled:opacity-60 disabled:hover:bg-accent disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    {saving ? (
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {saving ? "Saving…" : "Save recording"}
                  </button>
                ) : (
                  <button
                    onClick={() => packing.finish()}
                    disabled={!recording}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[#D9443A] hover:bg-[#C23A31] disabled:opacity-60 disabled:hover:bg-[#D9443A] disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    {busy ? (
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                    ) : (
                      <Square className="w-4 h-4" fill="currentColor" />
                    )}
                    {stopping
                      ? "Finishing…"
                      : starting
                        ? "Starting…"
                        : "Finish recording"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
