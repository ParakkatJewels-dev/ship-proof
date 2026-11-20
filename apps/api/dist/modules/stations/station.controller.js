"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stationController = exports.StationController = void 0;
const station_service_js_1 = require("./station.service.js");
const response_js_1 = require("../../utils/response.js");
class StationController {
    async listStations(req, res) {
        try {
            const stations = await station_service_js_1.stationService.listStations();
            return (0, response_js_1.sendSuccess)(res, stations);
        }
        catch (err) {
            return (0, response_js_1.sendError)(res, err.message, 500);
        }
    }
    async getStation(req, res) {
        try {
            const id = String(req.params.id || "");
            const station = await station_service_js_1.stationService.getStation(id);
            if (!station) {
                return (0, response_js_1.sendError)(res, "Station not found", 404);
            }
            return (0, response_js_1.sendSuccess)(res, station);
        }
        catch (err) {
            return (0, response_js_1.sendError)(res, err.message, 500);
        }
    }
}
exports.StationController = StationController;
exports.stationController = new StationController();
