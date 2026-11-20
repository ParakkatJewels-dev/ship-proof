"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoService = exports.VideoService = void 0;
const db_client_js_1 = require("../../integrations/supabase/db.client.js");
const storage_client_js_1 = require("../../integrations/supabase/storage.client.js");
const shopify_client_js_1 = require("../../integrations/shopify/shopify.client.js");
const shared_1 = require("@shipproof/shared");
const logger_js_1 = require("../../utils/logger.js");
const uuid_1 = require("uuid");
const mockVideosStore = new Map();
class VideoService {
    /**
     * Generates a signed upload URL so the camera agent can upload directly to Supabase Storage.
     */
    async requestUploadUrl(orderId, sessionId, stationId, fileName) {
        const videoId = (0, uuid_1.v4)();
        const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `orders/${orderId}/${sessionId}_${cleanFileName}`;
        const { signedUrl, token } = await storage_client_js_1.storageService.createSignedUploadUrl(storagePath);
        const initialRecord = {
            id: videoId,
            sessionId,
            orderId,
            stationId,
            storagePath,
            fileName: cleanFileName,
            fileSizeBytes: 0,
            durationSeconds: 0,
            status: shared_1.VideoStatus.UPLOADING,
            retentionDays: 7,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        if (db_client_js_1.isMockSupabase) {
            mockVideosStore.set(orderId, initialRecord);
        }
        else {
            await db_client_js_1.supabase.from("videos").insert({
                id: videoId,
                session_id: sessionId,
                order_id: orderId,
                station_id: stationId,
                storage_path: storagePath,
                file_name: cleanFileName,
                status: shared_1.VideoStatus.UPLOADING,
                retention_days: 7,
            });
        }
        return {
            videoId,
            storagePath,
            signedUrl,
            token,
        };
    }
    /**
     * Finalizes upload confirmation after camera agent finishes streaming the file.
     */
    async completeUpload(orderId, sessionId, fileSizeBytes, durationSeconds) {
        logger_js_1.logger.info(`Video upload completed for order ${orderId}, size: ${fileSizeBytes} bytes`);
        // Generate signed download URL for playback
        const existing = await this.getVideoForOrder(orderId);
        if (!existing) {
            throw new Error(`No video record found for order ${orderId}`);
        }
        const downloadUrl = await storage_client_js_1.storageService.createSignedDownloadUrl(existing.storagePath, 7 * 86400);
        const updatedRecord = {
            ...existing,
            fileSizeBytes,
            durationSeconds,
            status: shared_1.VideoStatus.ACTIVE,
            downloadUrl,
            updatedAt: new Date().toISOString(),
        };
        if (db_client_js_1.isMockSupabase) {
            mockVideosStore.set(orderId, updatedRecord);
        }
        else {
            await db_client_js_1.supabase
                .from("videos")
                .update({
                file_size_bytes: fileSizeBytes,
                duration_seconds: durationSeconds,
                status: shared_1.VideoStatus.ACTIVE,
                download_url: downloadUrl,
                updated_at: new Date().toISOString(),
            })
                .eq("order_id", orderId);
        }
        // Attach link into Shopify order metafield
        await shopify_client_js_1.shopifyClient.attachVideoProofMetafield(orderId, downloadUrl);
        return updatedRecord;
    }
    /**
     * Get packing video for an order.
     */
    async getVideoForOrder(orderId) {
        if (db_client_js_1.isMockSupabase) {
            return mockVideosStore.get(orderId) || null;
        }
        const { data } = await db_client_js_1.supabase
            .from("videos")
            .select("*")
            .eq("order_id", orderId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (!data)
            return null;
        return {
            id: data.id,
            sessionId: data.session_id,
            orderId: data.order_id,
            stationId: data.station_id,
            storagePath: data.storage_path,
            fileName: data.file_name,
            fileSizeBytes: data.file_size_bytes,
            durationSeconds: data.duration_seconds,
            status: data.status,
            downloadUrl: data.download_url,
            retentionDays: data.retention_days,
            expiresAt: data.expires_at,
            deletedAt: data.deleted_at,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    }
    /**
     * List all videos for admin monitoring.
     */
    async listVideos() {
        if (db_client_js_1.isMockSupabase) {
            return Array.from(mockVideosStore.values());
        }
        const { data } = await db_client_js_1.supabase
            .from("videos")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50);
        return (data || []).map((d) => ({
            id: d.id,
            sessionId: d.session_id,
            orderId: d.order_id,
            stationId: d.station_id,
            storagePath: d.storage_path,
            fileName: d.file_name,
            fileSizeBytes: d.file_size_bytes,
            durationSeconds: d.duration_seconds,
            status: d.status,
            downloadUrl: d.download_url,
            retentionDays: d.retention_days,
            expiresAt: d.expires_at,
            deletedAt: d.deleted_at,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
        }));
    }
}
exports.VideoService = VideoService;
exports.videoService = new VideoService();
