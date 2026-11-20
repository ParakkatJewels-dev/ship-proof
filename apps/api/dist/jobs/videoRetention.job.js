"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startVideoRetentionJob = startVideoRetentionJob;
const node_cron_1 = __importDefault(require("node-cron"));
const db_client_js_1 = require("../integrations/supabase/db.client.js");
const storage_client_js_1 = require("../integrations/supabase/storage.client.js");
const logger_js_1 = require("../utils/logger.js");
const shared_1 = require("@shipproof/shared");
/**
 * Scheduled job to enforce the 7-day video retention policy:
 * Automatically purges video files from Supabase Storage and updates the database record.
 */
function startVideoRetentionJob() {
    // Run daily at midnight: "0 0 * * *" (or every hour for testing in dev)
    const schedule = process.env.NODE_ENV === "production" ? "0 0 * * *" : "0 * * * *";
    logger_js_1.logger.info(`Starting video retention cleanup worker [Cron: ${schedule}]`);
    node_cron_1.default.schedule(schedule, async () => {
        logger_js_1.logger.info("Running automated 7-day video retention cleanup...");
        try {
            if (db_client_js_1.isMockSupabase) {
                logger_js_1.logger.info("[Mock Storage] Retention check executed. No expired files in mock store.");
                return;
            }
            // 1. Find videos marked EXPIRED or where expires_at <= NOW()
            const now = new Date().toISOString();
            const { data: expiredVideos, error } = await db_client_js_1.supabase
                .from("videos")
                .select("id, storage_path, order_id")
                .or(`status.eq.EXPIRED,and(expires_at.lte.${now},status.eq.ACTIVE)`)
                .limit(100);
            if (error) {
                logger_js_1.logger.error("Failed to query expired videos:", error);
                return;
            }
            if (!expiredVideos || expiredVideos.length === 0) {
                logger_js_1.logger.info("No expired videos to purge today.");
                return;
            }
            logger_js_1.logger.info(`Found ${expiredVideos.length} expired videos to delete.`);
            for (const vid of expiredVideos) {
                // Delete from Supabase Storage
                const deleted = await storage_client_js_1.storageService.deleteFile(vid.storage_path);
                if (deleted) {
                    // Update DB record to DELETED
                    await db_client_js_1.supabase
                        .from("videos")
                        .update({
                        status: shared_1.VideoStatus.DELETED,
                        deleted_at: new Date().toISOString(),
                        download_url: null,
                    })
                        .eq("id", vid.id);
                    logger_js_1.logger.info(`Successfully purged expired video ${vid.id} (Order: ${vid.order_id})`);
                }
            }
        }
        catch (err) {
            logger_js_1.logger.error("Error during video retention cleanup:", err);
        }
    });
}
