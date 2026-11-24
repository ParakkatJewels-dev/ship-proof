import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { shopifyClient } from "../../integrations/shopify/shopify.client.js";
import { config } from "../../config/env.config.js";
import { sendSuccess } from "../../utils/response.js";

const router = Router();

/** Connection check for the dashboard and for setup: which store, which auth mode, and any missing scopes. */
router.get("/status", authenticate, async (_req, res) => {
  if (shopifyClient.isMock) {
    return sendSuccess(res, { connected: false, mode: "mock", reason: "No Shopify credentials configured" });
  }
  try {
    const shop = await shopifyClient.getShopInfo();
    return sendSuccess(res, {
      connected: true,
      mode: shopifyClient.mode,
      apiVersion: config.shopify.apiVersion,
      shopName: shop.name,
      shopDomain: shop.myshopifyDomain,
      currency: shop.currencyCode,
      missingScopes: shop.missingScopes,
    });
  } catch (err: any) {
    return sendSuccess(res, { connected: false, mode: shopifyClient.mode, reason: err.message });
  }
});

export default router;
