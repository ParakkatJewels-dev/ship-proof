import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { config } from "../config/env.config.js";
import { sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export function validateShopifyHmac(req: Request, res: Response, next: NextFunction) {
  const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string;

  // In development with mock config, bypass strict HMAC
  if (config.shopify.webhookSecret === "mock-webhook-secret" || !hmacHeader) {
    logger.warn("Shopify webhook received without verification (development bypass).");
    return next();
  }

  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const hash = crypto
      .createHmac("sha256", config.shopify.webhookSecret)
      .update(rawBody, "utf8")
      .digest("base64");

    if (crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader))) {
      return next();
    }
    return sendError(res, "Unauthorized Shopify webhook signature", 401);
  } catch (err) {
    logger.error("HMAC verification failed:", err);
    return sendError(res, "Invalid webhook signature calculation", 401);
  }
}
