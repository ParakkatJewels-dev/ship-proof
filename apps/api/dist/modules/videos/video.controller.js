"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoController = exports.VideoController = void 0;
const video_service_js_1 = require("./video.service.js");
const response_js_1 = require("../../utils/response.js");
class VideoController {
    async requestUploadUrl(req, res) {
        try {
            const { orderId, sessionId, stationId, fileName } = req.body;
            if (!orderId || !sessionId || !stationId || !fileName) {
                return (0, response_js_1.sendError)(res, "Missing required fields: orderId, sessionId, stationId, fileName", 400);
            }
            const result = await video_service_js_1.videoService.requestUploadUrl(orderId, sessionId, stationId, fileName);
            return (0, response_js_1.sendSuccess)(res, result, "Upload URL created successfully");
        }
        catch (err) {
            return (0, response_js_1.sendError)(res, err.message, 500);
        }
    }
    async completeUpload(req, res) {
        try {
            const { orderId, sessionId, fileSizeBytes, durationSeconds } = req.body;
            if (!orderId || !sessionId) {
                return (0, response_js_1.sendError)(res, "Missing required fields: orderId, sessionId", 400);
            }
            const video = await video_service_js_1.videoService.completeUpload(orderId, sessionId, fileSizeBytes || 0, durationSeconds || 0);
            return (0, response_js_1.sendSuccess)(res, video, "Video recording processed successfully");
        }
        catch (err) {
            return (0, response_js_1.sendError)(res, err.message, 500);
        }
    }
    async getVideoForOrder(req, res) {
        try {
            const orderId = String(req.params.orderId || "");
            const video = await video_service_js_1.videoService.getVideoForOrder(orderId);
            if (!video) {
                return (0, response_js_1.sendError)(res, "Video not found for this order", 404);
            }
            return (0, response_js_1.sendSuccess)(res, video);
        }
        catch (err) {
            return (0, response_js_1.sendError)(res, err.message, 500);
        }
    }
    async listVideos(req, res) {
        try {
            const videos = await video_service_js_1.videoService.listVideos();
            return (0, response_js_1.sendSuccess)(res, videos);
        }
        catch (err) {
            return (0, response_js_1.sendError)(res, err.message, 500);
        }
    }
}
exports.VideoController = VideoController;
exports.videoController = new VideoController();
