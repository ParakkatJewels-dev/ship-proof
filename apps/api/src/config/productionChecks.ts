import { config, shopifyAuthMode } from "./env.config.js";
import { isMockSupabase } from "../integrations/supabase/db.client.js";

/**
 * Problems that must stop the API from starting in production. In development nothing here is fatal,
 * because the API falls back to demo data.
 */
export function productionProblems(): string[] {
  if (config.nodeEnv !== "production") return [];
  const problems: string[] = [];

  if (config.jwtSecret.length < 32 || config.jwtSecret.includes("change-in-production") || config.jwtSecret.includes("default")) {
    problems.push("JWT_SECRET must be a long random secret (at least 32 characters), not the example value.");
  }
  if (isMockSupabase) problems.push("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set, so videos would not be stored anywhere.");
  if (shopifyAuthMode === "mock") problems.push("Shopify is not configured (SHOPIFY_SHOP_DOMAIN with a client ID and secret).");
  if (!config.publicWebUrl.startsWith("https://")) problems.push("PUBLIC_WEB_URL must be the public https:// address of the web app, because customer links are built from it.");
  if (!config.stationApiKey) problems.push("STATION_API_KEY is not set, so camera stations could not be verified.");
  if (config.webOrigins.some((o) => o.startsWith("http://localhost"))) {
    problems.push("WEB_ORIGINS must list only the real website address, not localhost.");
  }
  return problems;
}
