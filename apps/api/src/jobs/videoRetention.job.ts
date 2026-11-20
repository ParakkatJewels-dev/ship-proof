import cron from "node-cron";
import { supabase, isMockSupabase } from "../integrations/supabase/db.client.js";
import { storageService } from "../integrations/supabase/storage.client.js";
import { logger } from "../utils/logger.js";
import { VideoStatus } from "@shipproof/shared";

/**
 * Scheduled job to enforce the 7-day video retention policy:
 * Automatically purges video files from Supabase Storage and updates the database record.
 */
export function startVideoRetentionJob() {
  // Run daily at midnight: "0 0 * * *" (or every hour for testing in dev)
  const schedule = process.env.NODE_ENV === "production" ? "0 0 * * *" : "0 * * * *";

  logger.info(`Starting video retention cleanup worker [Cron: ${schedule}]`);

  cron.schedule(schedule, async () => {
    logger.info("Running automated 7-day video retention cleanup...");

    try {
      if (isMockSupabase) {
        logger.info("[Mock Storage] Retention check executed. No expired files in mock store.");
        return;
      }

      // 1. Find videos marked EXPIRED or where expires_at <= NOW()
      const now = new Date().toISOString();
      const { data: expiredVideos, error } = await supabase
        .from("videos")
        .select("id, storage_path, order_id")
        .or(`status.eq.EXPIRED,and(expires_at.lte.${now},status.eq.ACTIVE)`)
        .limit(100);

      if (error) {
        logger.error("Failed to query expired videos:", error);
        return;
      }

      if (!expiredVideos || expiredVideos.length === 0) {
        logger.info("No expired videos to purge today.");
        return;
      }

      logger.info(`Found ${expiredVideos.length} expired videos to delete.`);

      for (const vid of expiredVideos) {
        // Delete from Supabase Storage
        const deleted = await storageService.deleteFile(vid.storage_path);
        if (deleted) {
          // Update DB record to DELETED
          await supabase
            .from("videos")
            .update({
              status: VideoStatus.DELETED,
              deleted_at: new Date().toISOString(),
              download_url: null,
            })
            .eq("id", vid.id);

          logger.info(`Successfully purged expired video ${vid.id} (Order: ${vid.order_id})`);
        }
      }
    } catch (err) {
      logger.error("Error during video retention cleanup:", err);
    }
  });
}
