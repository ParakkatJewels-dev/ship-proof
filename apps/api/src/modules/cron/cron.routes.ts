import crypto from "crypto";
import { Router, Request, Response, NextFunction } from "express";
import { videoService } from "../videos/video.service.js";
import { sendError, sendSuccess } from "../../utils/response.js";
import { logger } from "../../utils/logger.js";

/**
 * Scheduled background work, called by Vercel Cron (see vercel.json). Vercel sends
 * "Authorization: Bearer <CRON_SECRET>", so nobody else can trigger these runs.
 */
const router = Router();

function requireCronSecret(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.CRON_SECRET || "";
  const given = String(req.headers.authorization || "");
  const expected = `Bearer ${secret}`;
  const ok =
    !!secret &&
    given.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return sendError(res, "Not allowed.", 401);
  next();
}

/** Hourly: delete videos whose retention period is over and take their Watch button off Shopify. */
router.get("/retention", requireCronSecret, async (_req, res) => {
  try {
    const purged = await videoService.purgeExpired();
    if (purged > 0) logger.info(`Retention: deleted ${purged} expired video(s).`);
    return sendSuccess(res, { purged });
  } catch (err: any) {
    logger.error("Retention run failed:", err);
    return sendError(res, "Retention run failed.", 500);
  }
});

/** Every 5 minutes: send the packed status and watch link again where Shopify was unreachable. */
router.get("/shopify-retry", requireCronSecret, async (_req, res) => {
  try {
    const sent = await videoService.retryShopifySync();
    if (sent > 0) logger.info(`Shopify retry: updated ${sent} order(s).`);
    return sendSuccess(res, { sent });
  } catch (err: any) {
    logger.error("Shopify retry failed:", err);
    return sendError(res, "Shopify retry failed.", 500);
  }
});

export default router;
