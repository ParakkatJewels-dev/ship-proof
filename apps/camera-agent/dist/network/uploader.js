"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploader = exports.VideoUploader = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const agent_config_js_1 = require("../config/agent.config.js");
const localLogger_js_1 = require("../utils/localLogger.js");
const fileManager_js_1 = require("../core/fileManager.js");
class VideoUploader {
    /**
     * Uploads recorded video directly to Supabase Storage using presigned URL obtained from Cloud API.
     */
    async uploadRecording(orderId, sessionId, filePath, durationSeconds) {
        localLogger_js_1.agentLogger.info(`Starting cloud upload pipeline for Order ${orderId}...`);
        try {
            const fileName = path_1.default.basename(filePath);
            const fileSizeBytes = fileManager_js_1.fileManager.getFileSize(filePath);
            // 1. Request presigned upload URL from Cloud API
            const requestRes = await fetch(`${agent_config_js_1.agentConfig.cloudApiUrl}/api/videos/upload-url`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Station-Id": agent_config_js_1.agentConfig.stationId,
                    "X-Station-Key": agent_config_js_1.agentConfig.stationApiKey,
                },
                body: JSON.stringify({
                    orderId,
                    sessionId,
                    stationId: agent_config_js_1.agentConfig.stationId,
                    fileName,
                }),
            });
            if (!requestRes.ok) {
                throw new Error(`Failed to obtain upload URL from Cloud API: ${requestRes.statusText}`);
            }
            const { data: uploadInfo } = (await requestRes.json());
            localLogger_js_1.agentLogger.info(`Acquired presigned upload URL for path: ${uploadInfo.storagePath}`);
            // 2. Direct HTTP PUT upload to Supabase Storage
            const fileBuffer = fs_1.default.readFileSync(filePath);
            if (!uploadInfo.signedUrl.includes("mock-storage")) {
                const uploadRes = await fetch(uploadInfo.signedUrl, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "video/mp4",
                    },
                    body: fileBuffer,
                });
                if (!uploadRes.ok) {
                    throw new Error(`Storage direct upload failed with status ${uploadRes.status}`);
                }
            }
            // 3. Notify Cloud API of upload completion
            const completeRes = await fetch(`${agent_config_js_1.agentConfig.cloudApiUrl}/api/videos/complete`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Station-Id": agent_config_js_1.agentConfig.stationId,
                    "X-Station-Key": agent_config_js_1.agentConfig.stationApiKey,
                },
                body: JSON.stringify({
                    orderId,
                    sessionId,
                    fileSizeBytes,
                    durationSeconds,
                }),
            });
            if (!completeRes.ok) {
                throw new Error("Failed to finalize video record with backend");
            }
            localLogger_js_1.agentLogger.info(`Video successfully uploaded and registered for Order ${orderId}!`);
            // 4. Clean up local temp file after confirmed cloud persistence
            fileManager_js_1.fileManager.deleteLocalFile(filePath);
            return true;
        }
        catch (err) {
            localLogger_js_1.agentLogger.error("Upload pipeline error:", err.message);
            return false;
        }
    }
}
exports.VideoUploader = VideoUploader;
exports.uploader = new VideoUploader();
