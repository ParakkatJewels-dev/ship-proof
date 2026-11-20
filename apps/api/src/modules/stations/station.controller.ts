import { Request, Response } from "express";
import { stationService } from "./station.service.js";
import { sendSuccess, sendError } from "../../utils/response.js";

export class StationController {
  async listStations(req: Request, res: Response) {
    try {
      const stations = await stationService.listStations();
      return sendSuccess(res, stations);
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
