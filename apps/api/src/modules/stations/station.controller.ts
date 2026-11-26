import { Request, Response } from "express";
import { stationService } from "./station.service.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { presenceService } from "./presence.service.js";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";
import { StationHeartbeat } from "@shipproof/shared";

export class StationController {
  async listStations(req: Request, res: Response) {
    try {
      const stations = await stationService.listStations();
      return sendSuccess(res, stations);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * A camera device reports its status (every 10 seconds, and straight away when something changes).
   * Only one device may be connected at a time: another station is refused with 409 while one is reporting.
   */
  async reportStatus(req: Request, res: Response) {
    try {
      const stationId = (req as AuthenticatedRequest).user?.stationId;
      if (!stationId) return sendError(res, "Only a camera station can report its status.", 403);
      const report = { ...(req.body ?? {}), stationId } as StationHeartbeat;
      const result = await presenceService.report(stationId, report);
      if (!result.ok) {
        return res.status(409).json({
          success: false,
          code: "DEVICE_IN_USE",
          error: `Another device (station ${result.activeStationId}) is already connected. Only one device can be connected at a time.`,
          activeStationId: result.activeStationId,
        });
      }
      return sendSuccess(res, { received: true });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /** The one camera device currently connected, or { connected: false }. */
  async getActiveDevice(_req: Request, res: Response) {
    try {
      const active = await presenceService.getActive();
      if (!active) return sendSuccess(res, { connected: false });

      const station = await stationService.getStation(active.stationId);
      const hb = active.report;
      return sendSuccess(res, {
        connected: true,
        stationId: active.stationId,
        stationName: hb?.stationName || station?.name || active.stationId,
        location: station?.location || "",
        cameraName: hb?.cameraName || station?.cameraInfo?.name || "Camera",
        // Measured by the camera device itself. Unknown (not a made-up default) until it has reported.
        resolution: hb?.resolution,
        fps: hb?.fps,
        cameraStatus: hb?.cameraStatus || "CONNECTED",
        pendingUploads: hb?.pendingUploads ?? 0,
        uploads: hb?.uploads ?? [],
        recording: hb?.recording ?? null,
        review: hb?.review ?? null,
        connectedAt: active.connectedAt,
        lastHeartbeat: active.lastSeen,
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  async getStation(req: Request, res: Response) {
    try {
      const id = String(req.params.id || "");
      const station = await stationService.getStation(id);
      if (!station) {
        return sendError(res, "Station not found", 404);
      }
      return sendSuccess(res, station);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}

export const stationController = new StationController();
