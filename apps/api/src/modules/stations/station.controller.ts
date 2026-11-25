import { Request, Response } from "express";
import { stationService } from "./station.service.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { stationHub } from "../../sockets/stationHub.js";

export class StationController {
  async listStations(req: Request, res: Response) {
    try {
      const stations = await stationService.listStations();
      return sendSuccess(res, stations);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /** The one camera device currently connected, or { connected: false }. */
  async getActiveDevice(_req: Request, res: Response) {
    try {
      const active = stationHub.getActiveDevice();
      if (!active) return sendSuccess(res, { connected: false });

      const station = await stationService.getStation(active.stationId);
      const hb = active.lastHeartbeat;
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
        lastHeartbeat: hb?.timestamp || active.connectedAt,
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
