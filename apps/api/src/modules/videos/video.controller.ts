import { Request, Response } from "express";
import { videoService } from "./video.service.js";
import { sendSuccess, sendError } from "../../utils/response.js";

export class VideoController {
  async requestUploadUrl(req: Request, res: Response) {
    try {
      const { orderId, sessionId, stationId, fileName } = req.body;
      if (!orderId || !sessionId || !stationId || !fileName) {
        return sendError(res, "Missing required fields: orderId, sessionId, stationId, fileName", 400);
      }

      const result = await videoService.requestUploadUrl(orderId, sessionId, stationId, fileName);
      return sendSuccess(res, result, "Upload URL created successfully");
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  async completeUpload(req: Request, res: Response) {
    try {
      const { orderId, sessionId, fileSizeBytes, durationSeconds, interrupted } = req.body;
      if (!orderId || !sessionId) {
        return sendError(res, "Missing required fields: orderId, sessionId", 400);
      }

      const video = await videoService.completeUpload(orderId, sessionId, fileSizeBytes || 0, durationSeconds || 0, !!interrupted);
      return sendSuccess(res, video, "Video recording processed successfully");
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  async getVideoForOrder(req: Request, res: Response) {
    try {
      const orderId = String(req.params.orderId || "");
      const video = await videoService.getVideoForOrder(orderId);
      if (!video) {
        return sendError(res, "Video not found for this order", 404);
      }
      return sendSuccess(res, video);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  async listVideos(req: Request, res: Response) {
    try {
      const videos = await videoService.listVideos();
      return sendSuccess(res, videos);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}

export const videoController = new VideoController();
