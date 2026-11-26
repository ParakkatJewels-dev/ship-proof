"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchActiveDevice,
  type ActiveDevice,
  type UploadItem,
} from "./shipproofApi";

/** How long a video this page just saved is shown as uploading before the device has reported it. */
const EXPECTED_UPLOAD_MS = 90_000;

type ExpectedUpload = UploadItem & { expectedAt: number };

/**
 * The single camera device connected to ShipProof, refreshed every 5 seconds.
 * `reachable` is null until the first answer, then whether the API responded.
 * `refresh` asks right now and returns the fresh answer.
 * `expectUpload` shows a video that was just saved in the uploads list straight away: the device's own
 * report reaches the API a few seconds later, and replaces this placeholder as soon as it arrives.
 */
export function useActiveDevice() {
  const [state, setState] = useState<{
    info: ActiveDevice | null;
    reachable: boolean | null;
  }>({
    info: null,
    reachable: null,
  });
  const [expected, setExpected] = useState<ExpectedUpload[]>([]);
  const expectedRef = useRef(expected);
  useEffect(() => {
    expectedRef.current = expected;
  }, [expected]);
  const wake = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Every 5 seconds, or every 1.5 seconds while videos are uploading so the Uploads list moves smoothly.
    const tick = async () => {
      clearTimeout(timer);
      let next = 5000;
      try {
        const info = await fetchActiveDevice();
        if (!cancelled) {
          setState({ info, reachable: true });
          // Drop a placeholder once the device reports that video, or when it has waited too long.
          const known = new Set(
            (info.connected ? (info.uploads ?? []) : []).map(
              (u) => u.sessionId,
            ),
          );
          setExpected((prev) => {
            const keep = prev.filter(
              (u) =>
                !known.has(u.sessionId) &&
                Date.now() - u.expectedAt < EXPECTED_UPLOAD_MS,
            );
            return keep.length === prev.length ? prev : keep;
          });
        }
        if (info.connected && info.uploads?.some((u) => u.state !== "done"))
          next = 1500;
      } catch {
        if (!cancelled) setState({ info: null, reachable: false });
      }
      if (expectedRef.current.length) next = 1000;
      if (!cancelled) timer = setTimeout(tick, next);
    };
    wake.current = () => void tick();
    tick();
    return () => {
      cancelled = true;
      wake.current = null;
      clearTimeout(timer);
    };
  }, []);

  /** Checks again now, outside the 5-second schedule. */
  const refresh = async (): Promise<{
    reachable: boolean;
    info: ActiveDevice | null;
  }> => {
    try {
      const info = await fetchActiveDevice();
      setState({ info, reachable: true });
      return { reachable: true, info };
    } catch {
      setState({ info: null, reachable: false });
      return { reachable: false, info: null };
    }
  };

  /** A video was just saved on this computer: list it as uploading now, and ask for the device's report at once. */
  const expectUpload = useCallback((sessionId: string, orderNumber: string) => {
    setExpected((prev) => [
      ...prev.filter((u) => u.sessionId !== sessionId),
      { sessionId, orderNumber, state: "compressing", expectedAt: Date.now() },
    ]);
    wake.current?.();
  }, []);

  /** The save did not happen after all (for example the recording could not be stopped). */
  const forgetUpload = useCallback((sessionId: string) => {
    setExpected((prev) => prev.filter((u) => u.sessionId !== sessionId));
  }, []);

  let connected = state.info?.connected ? state.info : null;
  if (connected && expected.length) {
    const known = new Set((connected.uploads ?? []).map((u) => u.sessionId));
    const extra = expected
      .filter((u) => !known.has(u.sessionId))
      .map((u): UploadItem => ({
        sessionId: u.sessionId,
        orderNumber: u.orderNumber,
        state: u.state,
      }));
    if (extra.length)
      connected = {
        ...connected,
        uploads: [...extra, ...(connected.uploads ?? [])],
      };
  }
  const info = state.info?.connected ? connected : state.info;
  return { ...state, info, connected, refresh, expectUpload, forgetUpload };
}
