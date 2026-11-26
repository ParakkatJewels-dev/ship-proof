import cron from "node-cron";
import { videoService } from "../modules/videos/video.service.js";
import { orderService } from "../modules/orders/order.service.js";
import { announceOrdersChanged } from "../integrations/supabase/realtime.js";
import { logger } from "../utils/logger.js";

/**
 * Background work for stored videos, started when the API starts:
 *  - retention: delete videos whose period is over (30 days after the real delivery date, 60 after a return to origin) from storage and
 *    take their Watch button off the Shopify order. Runs every hour, so a video goes within an hour of its time.
 *  - Shopify retry: send the packed status and watch link again for videos where Shopify was unreachable.
 *
 * The delivery date itself comes from Shopify (a "delivered" shipment update). The database sets each
 * video's expiry from it; this job only acts on expiry dates that already exist.
 */
export function startVideoRetentionJob() {
  const retention = async () => {
    try {
      const purged = await videoService.purgeExpired();
      if (purged > 0) logger.info(`Retention: deleted ${purged} expired video(s).`);
    } catch (err) {
      logger.error("Retention run failed:", err);
    }
  };

  const shopifyRetry = async () => {
    try {
      const sent = await videoService.retryShopifySync();
      if (sent > 0) logger.info(`Shopify retry: updated ${sent} order(s).`);
    } catch (err) {
      logger.error("Shopify retry failed:", err);
    }
  };

  const ordersSync = async () => {
    try {
      const { added, updated } = await orderService.syncRecentFromShopify();
      if (added || updated) logger.info(`Order sync: ${added} added, ${updated} updated.`);
      if (added) await announceOrdersChanged();
    } catch (err) {
      logger.error("Order sync failed:", err);
    }
  };

  logger.info("Starting background jobs (retention hourly, Shopify retry and order sync every 5 minutes).");
  cron.schedule("0 * * * *", retention);
  cron.schedule("*/5 * * * *", shopifyRetry);
  cron.schedule("*/5 * * * *", ordersSync);

  // Catch up on anything that came due while the API was down.
  setTimeout(() => {
    void retention();
    void shopifyRetry();
    void ordersSync();
  }, 15_000).unref();
}
