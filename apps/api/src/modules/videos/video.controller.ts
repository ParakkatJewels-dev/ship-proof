import { Request, Response } from "express";
import { videoService } from "./video.service.js";
import { trimOrderVideo } from "./video.trim.service.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { HttpError } from "../../utils/httpError.js";
import { logger } from "../../utils/logger.js";

/** Known problems keep their status; anything else is logged and answered with a plain message. */
const fail = (res: Response, err: unknown) => {
  if (err instanceof HttpError) return sendError(res, err.message, err.status);
  logger.error("Video request failed:", err);
  return sendError(res, "Something went wrong. Try again.", 500);
};

export class VideoController {
  async requestUploadUrl(req: Request, res: Response) {
    try {
      const { orderId, sessionId, stationId, fileName, orderNumber, recordedAt } = req.body;
      if (!orderId || !sessionId || !stationId || !fileName) {
        return sendError(res, "Missing required fields: orderId, sessionId, stationId, fileName", 400);
      }

      const result = await videoService.requestUploadUrl(
        String(orderId),
        String(sessionId),
        String(stationId),
        String(fileName),
        orderNumber ? String(orderNumber) : undefined,
        typeof recordedAt === "string" && !Number.isNaN(Date.parse(recordedAt)) ? new Date(recordedAt).toISOString() : undefined,
      );
      return sendSuccess(res, result, "Upload URL created successfully");
    } catch (err) {
      return fail(res, err);
    }
  }

  async completeUpload(req: Request, res: Response) {
    try {
      const { orderId, sessionId, fileSizeBytes, durationSeconds, interrupted, width, height, fps } = req.body;
      // Picture size and speed are measured by the camera computer. Anything that is not a sensible number is ignored.
      const sane = (n: unknown, max: number) => (Number.isFinite(Number(n)) && Number(n) > 0 && Number(n) <= max ? Number(n) : undefined);
      if (!orderId || !sessionId) {
        return sendError(res, "Missing required fields: orderId, sessionId", 400);
      }

      const video = await videoService.completeUpload(
        String(orderId),
        String(sessionId),
        Number(fileSizeBytes) || 0,
        Number(durationSeconds) || 0,
        !!interrupted,
        { width: sane(width, 16384), height: sane(height, 16384), fps: sane(fps, 1000) },
      );
      return sendSuccess(res, video, "Video recording processed successfully");
    } catch (err) {
      return fail(res, err);
    }
  }

  /** The order's current video: its status and length, never its storage address. */
  async getVideoForOrder(req: Request, res: Response) {
    try {
      const video = await videoService.getSummaryForOrder(String(req.params.orderId || ""));
      if (!video) return sendError(res, "Video not found for this order", 404);
      return sendSuccess(res, video);
    } catch (err) {
      return fail(res, err);
    }
  }

  /** A temporary address to play the order's video, for signed-in staff. */
  async getPlayback(req: Request, res: Response) {
    try {
      const playback = await videoService.getPlayback(String(req.params.orderId || ""));
      if (!playback) return sendError(res, "This order has no playable video.", 404);
      res.setHeader("Cache-Control", "no-store");
      return sendSuccess(res, playback);
    } catch (err) {
      return fail(res, err);
    }
  }

  async trim(req: Request, res: Response) {
    try {
      const video = await trimOrderVideo(String(req.params.orderId || ""), Number(req.body?.start), Number(req.body?.end));
      return sendSuccess(res, video, "Video trimmed");
    } catch (err) {
      return fail(res, err);
    }
  }

  async listVideos(_req: Request, res: Response) {
    try {
      return sendSuccess(res, await videoService.listVideos());
    } catch (err) {
      return fail(res, err);
    }
  }
}

export const videoController = new VideoController();
