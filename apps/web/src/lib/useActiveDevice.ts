"use client";

import { useEffect, useState } from "react";
import { fetchActiveDevice, type ActiveDevice } from "./shipproofApi";

/**
 * The single camera device connected to ShipProof, refreshed every 5 seconds.
 * `reachable` is null until the first answer, then whether the API responded.
 * `refresh` asks right now and returns the fresh answer.
 */
export function useActiveDevice() {
  const [state, setState] = useState<{ info: ActiveDevice | null; reachable: boolean | null }>({
    info: null,
    reachable: null,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const info = await fetchActiveDevice();
        if (!cancelled) setState({ info, reachable: true });
      } catch {
        if (!cancelled) setState({ info: null, reachable: false });
      }
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  /** Checks again now, outside the 5-second schedule. */
  const refresh = async (): Promise<{ reachable: boolean; info: ActiveDevice | null }> => {
    try {
      const info = await fetchActiveDevice();
      setState({ info, reachable: true });
      return { reachable: true, info };
    } catch {
      setState({ info: null, reachable: false });
      return { reachable: false, info: null };
    }
  };

  const connected = state.info?.connected ? state.info : null;
  return { ...state, connected, refresh };
}
