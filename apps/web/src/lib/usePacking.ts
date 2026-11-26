"use client";

import { useEffect, useRef, useState } from "react";
import type { OrderRecord } from "./orders";
import { AGENT_URL } from "./shipproofApi";
import { issues, type StartIssue } from "./startIssues";

export interface PackingSession {
  status: "idle" | "starting" | "recording" | "stopping" | "review" | "saving";
  sessionId?: string;
  orderId?: string;
  orderNumber?: string;
  startedAt?: string;
  /** One-time key for the live preview of this recording, issued by the camera agent. */
  previewToken?: string;
  /** The camera device lost its connection to ShipProof. It keeps recording on the packing station. */
  offline?: boolean;
  /** One-time key to play the finished recording while it waits for review. */
  reviewToken?: string;
  /** Length of the finished recording, in seconds. */
  videoSeconds?: number;
}

/** A finished recording the camera device is holding for the packer to review, trim and save. */
export interface DeviceReview {
  sessionId: string;
  orderId: string;
  orderNumber: string;
  reviewToken: string;
  videoSeconds: number;
}

/** The recording the camera device reports it is running right now. */
export interface DeviceRecording {
  sessionId: string;
  orderId: string;
  orderNumber: string;
  startedAt: string;
  previewToken?: string;
}

/** How long to wait for the camera agent on this computer to start recording. */
const START_TIMEOUT_MS = 15_000;
/** After this long, a recording the device no longer reports is treated as ended (its reports can lag a few seconds). */
const STALE_AFTER_MS = 20_000;

/**
 * Starts and stops packing (video recording) for one order on the camera device.
 * Start and stop go straight to the camera agent on this computer (the packing computer), and the
 * session only changes state when the agent answers. The device's own report of what it is recording
 * (`deviceRecording`, relayed by the ShipProof server) lets a recording be picked up again after a page
 * reload, and shows when a recording ended by itself.
 */
export function usePacking({
  stationId,
  packerId,
  deviceConnected,
  deviceRecording,
  deviceReview,
  onStatusChange,
}: {
  stationId: string | null;
  packerId: string;
  deviceConnected: boolean;
  deviceRecording: DeviceRecording | null;
  deviceReview: DeviceReview | null;
  onStatusChange: (orderId: string, status: OrderRecord["status"]) => void;
}) {
  const [local, setLocal] = useState<PackingSession>({ status: "idle" });
  const [endedSessionId, setEndedSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    tone: "error" | "ok";
    text: string;
  } | null>(null);
  /** Why the last attempt to start packing failed, shown to the packer in a window until they close it. */
  const [startFailure, setStartFailure] = useState<StartIssue | null>(null);
  const [now, setNow] = useState(0);
  /** The order to record again once the current recording has been thrown away. */
  const retakeRef = useRef<OrderRecord | null>(null);
  /** Set by finish(): save the video as soon as it is ready, without the review and trim step. */
  const autoSaveRef = useRef(false);
  /** True from pressing Finish until the video is saved (or the attempt fails). */
  const [finishing, setFinishing] = useState(false);
  // Keep the latest callback without re-running effects when it changes.
  const statusCallback = useRef(onStatusChange);
  useEffect(() => {
    statusCallback.current = onStatusChange;
  }, [onStatusChange]);

  // What to show: this page's own session, or the device's report when this page doesn't know of one.
  let session: PackingSession = local;
  if (
    local.status === "idle" &&
    deviceRecording &&
    deviceRecording.sessionId !== endedSessionId
  ) {
    session = { status: "recording", ...deviceRecording };
  } else if (
    local.status === "idle" &&
    deviceReview &&
    deviceReview.sessionId !== endedSessionId
  ) {
    session = { ...deviceReview, status: "review" };
  } else if (
    local.status === "recording" &&
    deviceReview &&
    deviceReview.sessionId === local.sessionId
  ) {
    // The recording ended by itself (maximum length reached) and now waits for review.
    session = { ...deviceReview, status: "review" };
  } else if (
    local.status === "recording" &&
    !local.offline &&
    deviceConnected &&
    deviceRecording?.sessionId !== local.sessionId &&
    local.startedAt &&
    now - Date.parse(local.startedAt) > STALE_AFTER_MS
  ) {
    // The device has been reporting for a while without this recording (for example the camera agent
    // was restarted): it is no longer running.
    session = { status: "idle" };
  } else if (local.offline && deviceConnected) {
    // The device is back. If it still reports the recording, carry on; if not, it ended while away.
    session =
      deviceRecording?.sessionId === local.sessionId
        ? { ...local, offline: false }
        : { status: "idle" };
  }

  // Tick the recording timer.
  useEffect(() => {
    if (session.status !== "recording") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [session.status]);

  /** Returns the new session's id so the caller can open its packing page, or null when it could not start. */
  const start = (order: OrderRecord): string | null => {
    if (session.status !== "idle") return null;
    return beginStart(order);
  };

  /** Asks the camera agent on this computer to start recording. Used for a first start and for a retake. */
  const beginStart = (order: OrderRecord): string | null => {
    if (!stationId) return null;
    const sessionId = crypto.randomUUID();
    setMessage(null);
    setLocal({
      status: "starting",
      sessionId,
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
    const giveUp = (issue: StartIssue) => {
      setLocal((s) => (s.sessionId === sessionId ? { status: "idle" } : s));
      setStartFailure(issue);
    };
    void (async () => {
      let result: {
        startedAt?: string;
        previewToken?: string;
        error?: string;
      } | null = null;
      try {
        const res = await fetch(`${AGENT_URL}/record/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stationId,
            orderId: order.id,
            orderNumber: order.orderNumber,
            sessionId,
            packerId,
          }),
          signal: AbortSignal.timeout(START_TIMEOUT_MS),
        });
        result = await res.json().catch(() => null);
        if (!res.ok) return giveUp(issues.startFailed(result?.error));
      } catch (err) {
        return giveUp(
          err instanceof DOMException && err.name === "TimeoutError"
            ? issues.noResponse()
            : issues.agentUnreachable(),
        );
      }
      setLocal((s) =>
        s.sessionId === sessionId && s.status === "starting"
          ? {
              ...s,
              status: "recording",
              startedAt: result?.startedAt || new Date().toISOString(),
              previewToken: result?.previewToken,
            }
          : s,
      );
      setNow(Date.now());
    })();
    return sessionId;
  };

  /** Stops through the camera agent on this computer. With `discard`, the video is thrown away. */
  const stopLocally = async (current: PackingSession, discard = false) => {
    setLocal({ ...current, status: "stopping" });
    try {
      const res = await fetch(`${AGENT_URL}/record/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discard }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok)
        throw new Error(
          (await res.json().catch(() => null))?.error ||
            `Agent answered ${res.status}`,
        );
      if (current.sessionId) setEndedSessionId(current.sessionId);
      if (discard) {
        const retake = retakeRef.current;
        retakeRef.current = null;
        if (!retake || !beginStart(retake)) {
          setLocal({ status: "idle" });
          setMessage({
            tone: retake ? "error" : "ok",
            text: retake
              ? "The old recording was discarded, but a new one could not start. Check the connection and try again."
              : "Recording discarded. Nothing was saved.",
          });
        }
        return;
      }
      const result = await res.json().catch(() => null);
      // The video is finished but not saved yet: review and trim it first.
      setLocal({
        ...current,
        status: "review",
        offline: false,
        reviewToken: result?.reviewToken,
        videoSeconds: result?.videoSeconds,
      });
    } catch (err) {
      retakeRef.current = null;
      autoSaveRef.current = false;
      setFinishing(false);
      setLocal({ ...current, status: "recording", offline: true });
      setMessage({
        tone: "error",
        text: `Could not stop the recording: ${err instanceof Error ? err.message : "the camera agent on this computer did not answer"}.`,
      });
    }
  };

  /** Stops the recording. With `discard`, the video is thrown away instead of saved. */
  const stop = (opts: { discard?: boolean } = {}) => {
    if (session.status !== "recording") return;
    void stopLocally(session, !!opts.discard);
  };

  /** Tells the camera agent on this computer what to do with the recording waiting for review. */
  const reviewRequest = async (
    action: "save" | "discard",
    body: Record<string, unknown>,
  ) => {
    const { sessionId, reviewToken } = session;
    const res = await fetch(
      `${AGENT_URL}/review/${encodeURIComponent(sessionId ?? "")}/${action}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: reviewToken, ...body }),
        signal: AbortSignal.timeout(10 * 60_000),
      },
    );
    const result = await res.json().catch(() => null);
    if (!res.ok)
      throw new Error(
        result?.error || `The camera agent answered ${res.status}`,
      );
    return result;
  };

  /** Saves the reviewed recording, trimmed to [start, end] seconds, and uploads it. */
  const saveReview = async (trim: { start?: number; end?: number } = {}) => {
    if (session.status !== "review") return;
    const current = session;
    setLocal({ ...current, status: "saving" });
    try {
      await reviewRequest("save", trim);
      setFinishing(false);
      if (current.sessionId) setEndedSessionId(current.sessionId);
      setLocal({ status: "idle" });
      if (current.orderId) statusCallback.current(current.orderId, "Packed");
      setMessage({
        tone: "ok",
        text: `Video for ${current.orderNumber} saved and uploading.`,
      });
    } catch (err) {
      setFinishing(false);
      setLocal({ ...current, status: "review" });
      setMessage({
        tone: "error",
        text: `Could not save the recording: ${err instanceof Error ? err.message : "the camera agent did not answer"}.`,
      });
    }
  };

  /** Throws the reviewed recording away. With `thenRecord`, a new recording of that order starts straight away. */
  const discardReview = async (thenRecord?: OrderRecord) => {
    if (session.status !== "review") return;
    const current = session;
    setLocal({ ...current, status: "saving" });
    try {
      await reviewRequest("discard", {});
      if (current.sessionId) setEndedSessionId(current.sessionId);
      if (thenRecord && beginStart(thenRecord)) return;
      setLocal({ status: "idle" });
      setMessage(
        thenRecord
          ? {
              tone: "error",
              text: "The old recording was discarded, but a new one could not start. Check the connection and try again.",
            }
          : { tone: "ok", text: "Recording discarded. Nothing was saved." },
      );
    } catch (err) {
      setLocal({ ...current, status: "review" });
      setMessage({
        tone: "error",
        text: `Could not discard the recording: ${err instanceof Error ? err.message : "the camera agent did not answer"}.`,
      });
    }
  };

  /** Throws the current recording away and starts a new one for the same order. */
  const retake = (order: OrderRecord) => {
    if (session.status !== "recording") return;
    retakeRef.current = order;
    stop({ discard: true });
  };

  const elapsedSeconds =
    (session.status === "recording" || session.status === "stopping") &&
    session.startedAt
      ? Math.max(
          0,
          Math.floor((now - new Date(session.startedAt).getTime()) / 1000),
        )
      : 0;

  /** Stops the recording and saves the whole video straight away, with no review or trim step. */
  const finish = () => {
    if (session.status !== "recording") return;
    autoSaveRef.current = true;
    setFinishing(true);
    stop();
  };
  const saveReviewRef = useRef(saveReview);
  useEffect(() => {
    saveReviewRef.current = saveReview;
  });
  const reviewReady = session.status === "review";
  useEffect(() => {
    if (!reviewReady || !autoSaveRef.current) return;
    autoSaveRef.current = false;
    void saveReviewRef.current();
  }, [reviewReady]);

  return {
    session,
    message,
    setMessage,
    start,
    stop,
    retake,
    saveReview,
    finish,
    finishing,
    discardReview,
    elapsedSeconds,
    startFailure,
    setStartFailure,
  };
}

export const formatDuration = (secs: number) =>
  `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
