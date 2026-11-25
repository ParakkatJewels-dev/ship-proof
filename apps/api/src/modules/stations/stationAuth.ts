import crypto from "crypto";
import { config } from "../../config/env.config.js";
import { supabase, isMockSupabase } from "../../integrations/supabase/db.client.js";
import { logger } from "../../utils/logger.js";

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

let warned = false;

/**
 * Checks the key a camera station sends. A station is accepted when its key matches either the shared
 * STATION_API_KEY of this server, or the hash stored for it in the stations table.
 * Without any key configured, stations are accepted in development only.
 */
export async function verifyStationKey(stationId: string, key: string): Promise<boolean> {
  if (!stationId || !key) return false;

  if (config.stationApiKey && safeEqual(key, config.stationApiKey)) return true;

  if (!isMockSupabase) {
    const { data } = await supabase.from("stations").select("api_key_hash").eq("id", stationId).maybeSingle();
    if (data?.api_key_hash && safeEqual(sha256(key), data.api_key_hash)) return true;
  }

  if (!config.stationApiKey && isMockSupabase && config.nodeEnv !== "production") {
    if (!warned) {
      logger.warn("STATION_API_KEY is not set: any camera station is accepted. Set it before going live.");
      warned = true;
    }
    return true;
  }
  return false;
}
