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
  retention: {
    daysAfterDelivery: parseInt(process.env.VIDEO_RETENTION_DAYS || "7", 10),
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
