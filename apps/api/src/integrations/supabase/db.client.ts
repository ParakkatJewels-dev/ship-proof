import { createClient } from "@supabase/supabase-js";
import { config } from "../../config/env.config.js";
import { logger } from "../../utils/logger.js";

// Check if credentials are mock/default
export const isMockSupabase = config.supabase.url.includes("mock.supabase.co");

if (isMockSupabase) {
  logger.warn("Using mock Supabase instance. Live DB operations will run on in-memory mock store.");
}

export const supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
