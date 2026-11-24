import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { config } from "../config/env.config.js";
import { shopifyClient } from "../integrations/shopify/shopify.client.js";
import { sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

/**
 * Verifies the X-Shopify-Hmac-SHA256 header against the raw request body.
 * Only demo mode (no store connected) skips the check; a missing header is always rejected otherwise.
 */
export function validateShopifyHmac(req: Request, res: Response, next: NextFunction) {
  if (shopifyClient.isMock) {
    logger.warn("Shopify webhook accepted without verification (demo mode, no store connected).");
    return next();
  }

  const hmacHeader = req.headers["x-shopify-hmac-sha256"];
  const rawBody: Buffer | undefined = (req as any).rawBody;
  if (typeof hmacHeader !== "string" || !rawBody || !config.shopify.webhookSecret) {
    return sendError(res, "Unauthorized Shopify webhook", 401);
  }

  const expected = crypto.createHmac("sha256", config.shopify.webhookSecret).update(rawBody).digest();
  const received = Buffer.from(hmacHeader, "base64");
  if (received.length === expected.length && crypto.timingSafeEqual(received, expected)) {
    return next();
  }

  logger.warn("Rejected Shopify webhook with an invalid signature.", { topic: req.headers["x-shopify-topic"] });
  return sendError(res, "Unauthorized Shopify webhook signature", 401);
}
