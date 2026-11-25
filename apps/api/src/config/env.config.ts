import dotenv from "dotenv";

dotenv.config();

/** Accepts "store", "store.myshopify.com" or "https://store.myshopify.com/" and returns "store.myshopify.com". */
function normalizeShopDomain(raw: string | undefined): string {
  const value = (raw || "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!value) return "";
  return value.includes(".") ? value : `${value}.myshopify.com`;
}

const shopifyClientId = process.env.SHOPIFY_CLIENT_ID || "";
const shopifyClientSecret = process.env.SHOPIFY_CLIENT_SECRET || "";
const shopifyAdminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "";

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "shipproof-secret-key-default",
  /** Public HTTPS address of this API, used when registering Shopify webhooks. */
  publicUrl: (process.env.API_PUBLIC_URL || "").replace(/\/$/, ""),
  supabase: {
    url: process.env.SUPABASE_URL || "https://mock.supabase.co",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "mock-key",
    /** The public (publishable) key. Used only for signing people in; it can do nothing else. */
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || "",
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "packing-videos",
  },
  shopify: {
    /** Must be the store's *.myshopify.com domain, not its custom storefront domain. */
    shopDomain: normalizeShopDomain(process.env.SHOPIFY_SHOP_DOMAIN),
    apiVersion: process.env.SHOPIFY_API_VERSION || "2026-10",
    /** Dev Dashboard app credentials (client credentials grant). Preferred. */
    clientId: shopifyClientId,
    clientSecret: shopifyClientSecret,
    /** Legacy admin-created custom app token (shpat_...). Used only when no client credentials are set. */
    adminAccessToken: shopifyAdminToken,
    /** Webhooks from a Dev Dashboard app are signed with the app's client secret. */
    webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET || shopifyClientSecret,
  },
  /** Public address of the web app. Customer watch links are built from it. */
  publicWebUrl: (process.env.PUBLIC_WEB_URL || "http://localhost:3000").replace(/\/$/, ""),
  /** Websites allowed to call this API from a browser, comma separated. */
  webOrigins: (process.env.WEB_ORIGINS || process.env.PUBLIC_WEB_URL || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean),
  /** Shared secret the camera agents send. In production every request without it is refused. */
  stationApiKey: process.env.STATION_API_KEY || "",
  /** ffmpeg on the machine that runs this API, used to trim videos stored in the cloud. */
  ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
  retention: {
    /** Days a video is kept after the order is delivered. The database (table retention_policy) decides the real date. */
    daysAfterDelivery: parseInt(process.env.VIDEO_RETENTION_DAYS || "30", 10),
    /** Days a video is kept after an order is returned to origin (RTO). */
    daysAfterReturn: parseInt(process.env.RTO_RETENTION_DAYS || "60", 10),
    /**
     * Shopify has no "returned to origin" status. An order counts as returned when it carries any of these tags
     * (comma separated, not case sensitive, whole tag only). The defaults are the tags Shiprocket adds when a
     * return starts: the 60 days are counted from the start of the return.
     */
    rtoTags: (process.env.RTO_TAGS || "RTO,RTO Initiated via Shiprocket")
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/\s+/g, " "))
      .filter(Boolean),
  },
};

/** "client_credentials" | "admin_token" | "mock" */
export const shopifyAuthMode: "client_credentials" | "admin_token" | "mock" =
  !config.shopify.shopDomain
    ? "mock"
    : shopifyClientId && shopifyClientSecret
      ? "client_credentials"
      : shopifyAdminToken && !shopifyAdminToken.startsWith("shpat_xxxx")
        ? "admin_token"
        : "mock";
