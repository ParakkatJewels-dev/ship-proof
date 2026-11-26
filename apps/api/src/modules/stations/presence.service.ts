import { StationHeartbeat } from "@shipproof/shared";
import { supabase, isMockSupabase } from "../../integrations/supabase/db.client.js";
import { logger } from "../../utils/logger.js";

/**
 * A station counts as connected while its last status report is younger than this. The agent reports
 * every 10 seconds, so this allows two missed reports before the dashboard shows it as gone.
 */
export const PRESENCE_TIMEOUT_MS = 30_000;

export interface Presence {
  stationId: string;
  report: StationHeartbeat;
  connectedAt: string;
  lastSeen: string;
}

/** The result of a status report: accepted, or refused because another device is connected. */
export type ReportResult = { ok: true } | { ok: false; activeStationId: string };

/** Without a database (demo mode) presence lives in memory. */
const memory = new Map<string, Presence>();

const isFresh = (lastSeen: string, now = Date.now()) => now - Date.parse(lastSeen) < PRESENCE_TIMEOUT_MS;

/**
 * Where camera devices report their status. Replaces the long-lived WebSocket hub: the agent posts a
 * report every few seconds, and the dashboard reads the latest one. Only one camera device may be
 * connected at a time; a second station is refused while the first is still reporting.
 */
class PresenceService {
  async report(stationId: string, report: StationHeartbeat): Promise<ReportResult> {
    const now = new Date();
    const active = await this.getActive();
    if (active && active.stationId !== stationId) {
      return { ok: false, activeStationId: active.stationId };
    }
    // Same connection while the station keeps reporting; a new one after it was silent.
    const connectedAt = active?.stationId === stationId ? active.connectedAt : now.toISOString();
    const row: Presence = { stationId, report, connectedAt, lastSeen: now.toISOString() };

    if (isMockSupabase) {
      memory.set(stationId, row);
      return { ok: true };
    }
    const { error } = await supabase.from("station_presence").upsert({
      station_id: stationId,
      report,
      connected_at: connectedAt,
      last_seen: row.lastSeen,
    });
    if (error) {
      logger.error("Failed to save the camera device status:", error.message);
      throw new Error("Could not save the camera device status.");
    }
    return { ok: true };
  }

  /** The camera device that reported most recently, if it is still within the timeout. */
  async getActive(): Promise<Presence | null> {
    if (isMockSupabase) {
      const latest = [...memory.values()].sort((a, b) => Date.parse(b.lastSeen) - Date.parse(a.lastSeen))[0];
      return latest && isFresh(latest.lastSeen) ? latest : null;
    }
    const { data, error } = await supabase
      .from("station_presence")
      .select("station_id, report, connected_at, last_seen")
      .order("last_seen", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      logger.error("Failed to read the camera device status:", error.message);
      throw new Error("Could not read the camera device status.");
    }
    if (!data || !isFresh(data.last_seen)) return null;
    return {
      stationId: data.station_id,
      report: data.report as StationHeartbeat,
      connectedAt: data.connected_at,
      lastSeen: data.last_seen,
    };
  }
}

export const presenceService = new PresenceService();
