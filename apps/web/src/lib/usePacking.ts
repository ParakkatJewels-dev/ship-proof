"use client";

import { useEffect, useRef, useState } from "react";
import type { OrderRecord } from "./orders";
import { AGENT_URL, STATIONS_WS_URL } from "./shipproofApi";
import { getAccessToken, refreshSession } from "./auth";
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

/** Fields read from messages the API's station hub relays from the camera device. */
interface HubPayload {
  sessionId?: string;
  orderId?: string;
  startedAt?: string;
  previewToken?: string;
  /** True when the recording was thrown away (a retake) instead of saved. */
  discarded?: boolean;
  /** True when the finished recording now waits for the packer to review it. */
  needsReview?: boolean;
  reviewToken?: string;
  videoSeconds?: number;
  orderNumber?: string;
  status?: string;
  code?: string;
  message?: string;
}

const START_TIMEOUT_MS = 8_000;
const STOP_TIMEOUT_MS = 15_000;

/**
 * Starts and stops packing (video recording) for one order on the connected camera device.
 * Commands go through the API's WebSocket hub, and the session only changes state when the device
 * confirms. The device's own report of what it is recording (`deviceRecording`) is the source of
 * truth, so a recording is picked up again after a page reload, and keeps showing when the device
 * drops off the network. If the server can't be reached, Stop falls back to the camera agent on this
 * computer.
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
  const wsRef = useRef<WebSocket | null>(null);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The order to record again once the current recording has been thrown away. */
  const retakeRef = useRef<OrderRecord | null>(null);
  /** Set by finish(): save the video as soon as it is ready, without the review and trim step. */
  const autoSaveRef = useRef(false);
  /** True from pressing Finish until the video is saved (or the attempt fails). */
  const [finishing, setFinishing] = useState(false);
  const beginStartRef = useRef<(order: OrderRecord) => string | null>(
    () => null,
  );
  // Keep the latest callback without reconnecting the socket when it changes.
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
  } else if (local.offline && deviceConnected) {
    // The device is back. If it still reports the recording, carry on; if not, it ended while away.
    session =
      deviceRecording?.sessionId === local.sessionId
        ? { ...local, offline: false }
        : { status: "idle" };
  }

  const shownRef = useRef<PackingSession>(session);
  useEffect(() => {
    shownRef.current = session;
  });

  useEffect(() => {
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const clearPending = () => {
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
      pendingTimer.current = null;
    };

    const handle = (msg: { event: string; payload?: HubPayload }) => {
      const p = msg.payload || {};
      if (msg.event === "RECORDING_STARTED") {
        clearPending();
        setLocal((s) =>
          s.sessionId === p.sessionId
            ? {
                ...s,
                status: "recording",
                startedAt: p.startedAt || new Date().toISOString(),
                previewToken: p.previewToken,
              }
            : s,
        );
        setNow(Date.now());
      } else if (msg.event === "RECORDING_STOPPED" && p.discarded) {
        clearPending();
        if (p.sessionId) setEndedSessionId(p.sessionId);
        const retake = retakeRef.current;
        retakeRef.current = null;
        // Retake: straight into a new recording of the same order. Otherwise the recording is just gone.
        if (!retake || !beginStartRef.current(retake)) {
          setLocal({ status: "idle" });
          setMessage({
            tone: retake ? "error" : "ok",
            text: retake
              ? "The old recording was discarded, but a new one could not start. Check the connection and try again."
              : "Recording discarded. Nothing was saved.",
          });
        }
      } else if (msg.event === "RECORDING_STOPPED" && p.needsReview) {
        clearPending();
        // The recording is finished but not saved yet: the packer reviews and trims it first.
        setLocal((s) => {
          if (s.sessionId !== undefined && s.sessionId !== p.sessionId)
            return s;
          return {
            ...s,
            status: "review",
            sessionId: p.sessionId,
            orderId: p.orderId ?? s.orderId,
            orderNumber: p.orderNumber ?? s.orderNumber,
            reviewToken: p.reviewToken,
            videoSeconds: p.videoSeconds,
            offline: false,
          };
        });
      } else if (msg.event === "RECORDING_STOPPED") {
        clearPending();
        if (p.sessionId) setEndedSessionId(p.sessionId);
        setLocal((s) => {
          if (s.sessionId !== undefined && s.sessionId !== p.sessionId)
            return s;
          setMessage({
            tone: "ok",
            text: `Video for ${s.orderNumber ?? "the order"} saved and uploading.`,
          });
          return { status: "idle" };
        });
        if (p.orderId) statusCallback.current(p.orderId, "Packed");
      } else if (msg.event === "ERROR" && p.sessionId) {
        clearPending();
        if (p.code === "STOP_FAILED") retakeRef.current = null;
        setLocal((s) => {
          if (s.sessionId !== p.sessionId) return s;
          if (p.code === "START_FAILED") {
            setStartFailure(issues.startFailed(p.message));
          } else {
            setMessage({
              tone: "error",
              text: p.message || "The camera device reported an error.",
            });
          }
          // A failed stop leaves the camera recording; a failed start leaves it idle.
          return p.code === "STOP_FAILED"
            ? { ...s, status: "recording" }
            : { status: "idle" };
        });
      } else if (
        msg.event === "CAMERA_STATUS_CHANGED" &&
        p.status === "DISCONNECTED"
      ) {
        clearPending();
        const shown = shownRef.current;
        setLocal((current) => {
          // A recording picked up from the device has no local session; keep what is on screen.
          const s = current.status === "idle" ? shown : current;
          if (
            s.status === "idle" ||
            s.status === "review" ||
            s.status === "saving"
          )
            return current;
          if (s.status === "starting") {
            setStartFailure(issues.noCamera());
            return { status: "idle" };
          }
          // Recording: the device keeps recording on the packing station and uploads once it is back.
          setMessage({
            tone: "error",
            text: "The camera device lost its connection. It keeps recording on the packing station and will upload when it is back online.",
          });
          return { ...s, status: "recording", offline: true };
        });
      }
    };

    const connect = async () => {
      // The server only accepts people who are signed in, so the connection carries the access token.
      const token = await getAccessToken();
      if (closed) return;
      if (!token) {
        retry = setTimeout(connect, 5000);
        return;
      }
      const ws = new WebSocket(
        `${STATIONS_WS_URL}&token=${encodeURIComponent(token)}`,
      );
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          handle(JSON.parse(String(e.data)));
        } catch {
          // Ignore malformed messages.
        }
      };
      ws.onclose = (e) => {
        if (wsRef.current === ws) wsRef.current = null;
        // 4401: the sign-in was refused. Get a fresh one (or sign out if it has ended) before retrying.
        if (e.code === 4401) void refreshSession();
        if (!closed) retry = setTimeout(connect, 5000);
      };
    };
    connect();

    return () => {
      closed = true;
      clearTimeout(retry);
      clearPending();
      wsRef.current?.close();
    };
  }, []);

  // Tick the recording timer.
  useEffect(() => {
    if (session.status !== "recording") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [session.status]);

  const send = (
    event: "START_RECORDING" | "STOP_RECORDING",
    payload: Record<string, unknown>,
  ) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(
      JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
    );
    return true;
  };

  /** Returns the new session's id so the caller can open its packing page, or null when it could not start. */
  const start = (order: OrderRecord): string | null => {
    if (session.status !== "idle") return null;
    return beginStart(order);
  };

  /** Sends the start command and enters the "starting" state. Used for a first start and for a retake. */
  const beginStart = (order: OrderRecord): string | null => {
    if (!stationId) return null;
    const sessionId = crypto.randomUUID();
    setMessage(null);
    const sent = send("START_RECORDING", {
      stationId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      sessionId,
      packerId,
    });
    if (!sent) {
      setStartFailure(issues.server());
      return null;
    }
    setLocal({
      status: "starting",
      sessionId,
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
    pendingTimer.current = setTimeout(() => {
      setLocal((s) =>
        s.sessionId === sessionId && s.status === "starting"
          ? { status: "idle" }
          : s,
      );
      setStartFailure(issues.noResponse());
    }, START_TIMEOUT_MS);
    return sessionId;
  };
  useEffect(() => {
    beginStartRef.current = beginStart;
  });

  /** Stops through the camera agent on this computer, for when the server or the device's link to it is down. */
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
    const discard = !!opts.discard;
    const { sessionId, orderId } = session;
    // Use the camera agent on this computer when the server link is down.
    if (
      session.offline ||
      !stationId ||
      !send("STOP_RECORDING", { stationId, sessionId, orderId, discard })
    ) {
      void stopLocally(session, discard);
      return;
    }
    setLocal({ ...session, status: "stopping" });
    pendingTimer.current = setTimeout(() => {
      setLocal((s) =>
        s.sessionId === sessionId && s.status === "stopping"
          ? { ...s, status: "recording" }
          : s,
      );
      retakeRef.current = null;
      autoSaveRef.current = false;
      setFinishing(false);
      setMessage({
        tone: "error",
        text: "The camera device didn't confirm the stop. Try again.",
      });
    }, STOP_TIMEOUT_MS);
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
