"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = exports.StorageService = void 0;
const db_client_js_1 = require("./db.client.js");
const env_config_js_1 = require("../../config/env.config.js");
const logger_js_1 = require("../../utils/logger.js");
class StorageService {
    bucket = env_config_js_1.config.supabase.bucket;
    /**
     * Generates a signed upload URL for the camera agent to upload directly to Supabase Storage.
     */
    async createSignedUploadUrl(filePath) {
        if (db_client_js_1.isMockSupabase) {
            return {
                signedUrl: `https://mock-storage.supabase.co/upload/${this.bucket}/${filePath}`,
                token: `mock-token-${Date.now()}`,
            };
        }
        const { data, error } = await db_client_js_1.supabase.storage
            .from(this.bucket)
            .createSignedUploadUrl(filePath);
        if (error || !data) {
            logger_js_1.logger.error("Failed to generate signed upload URL", error);
            throw new Error(`Storage error: ${error?.message || "Failed to create upload URL"}`);
        }
        return {
            signedUrl: data.signedUrl,
            token: data.token,
        };
    }
    /**
     * Generates a temporary signed download URL for viewing or customer playback.
     */
    async createSignedDownloadUrl(filePath, expiresInSeconds = 3600) {
        if (db_client_js_1.isMockSupabase) {
            return `https://mock-storage.supabase.co/download/${this.bucket}/${filePath}?token=mock-token`;
        }
        const { data, error } = await db_client_js_1.supabase.storage
            .from(this.bucket)
            .createSignedUrl(filePath, expiresInSeconds);
        if (error || !data) {
            logger_js_1.logger.error("Failed to generate signed download URL", error);
            throw new Error(`Storage error: ${error?.message || "Failed to create download URL"}`);
        }
        return data.signedUrl;
    }
    /**
     * Deletes video object from storage upon retention expiry.
     */
    async deleteFile(filePath) {
        if (db_client_js_1.isMockSupabase) {
            logger_js_1.logger.info(`[Mock Storage] Deleted ${filePath}`);
            return true;
        }
        const { error } = await db_client_js_1.supabase.storage.from(this.bucket).remove([filePath]);
        if (error) {
            logger_js_1.logger.error(`Failed to delete storage file: ${filePath}`, error);
            return false;
        }
        return true;
    }
}
exports.StorageService = StorageService;
exports.storageService = new StorageService();
