"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stationHub = exports.StationHub = void 0;
const ws_1 = require("ws");
const logger_js_1 = require("../utils/logger.js");
const shared_1 = require("@shipproof/shared");
const station_service_js_1 = require("../modules/stations/station.service.js");
class StationHub {
    wss = null;
    stationSockets = new Map();
    clientSockets = new Set();
    init(server) {
        this.wss = new ws_1.WebSocketServer({ server, path: "/ws/stations" });
        this.wss.on("connection", (ws, req) => {
            const url = new URL(req.url || "", `http://${req.headers.host}`);
            const stationId = url.searchParams.get("stationId");
            const clientType = url.searchParams.get("type") || "client"; // "agent" or "client"
            if (clientType === "agent" && stationId) {
                logger_js_1.logger.info(`Camera Agent connected for station: ${stationId}`);
                this.stationSockets.set(stationId, {
                    stationId,
                    socket: ws,
                    isAlive: true,
                });
                ws.on("message", (data) => this.handleAgentMessage(stationId, data.toString()));
                ws.on("close", () => {
                    logger_js_1.logger.warn(`Camera Agent disconnected for station: ${stationId}`);
                    this.stationSockets.delete(stationId);
                    this.broadcastToClients({
                        event: shared_1.WsEvents.CAMERA_STATUS_CHANGED,
                        payload: { stationId, status: "DISCONNECTED" },
                        timestamp: new Date().toISOString(),
                    });
                });
            }
            else {
                // Packer / Admin web client connection
                this.clientSockets.add(ws);
                ws.on("message", (data) => this.handleClientMessage(ws, data.toString()));
                ws.on("close", () => this.clientSockets.delete(ws));
            }
        });
        logger_js_1.logger.info("Station WebSocket Hub initialized at /ws/stations");
    }
    handleAgentMessage(stationId, raw) {
        try {
            const message = JSON.parse(raw);
            // Handle heartbeats
            if (message.event === shared_1.WsEvents.HEARTBEAT) {
                station_service_js_1.stationService.recordHeartbeat(message.payload);
            }
            // Forward telemetry to web clients
            this.broadcastToClients(message);
        }
        catch (err) {
            logger_js_1.logger.error("Failed to parse agent WS message:", err);
        }
    }
    handleClientMessage(ws, raw) {
        try {
            const message = JSON.parse(raw);
            // If client requests start/stop recording, route directly to the target station's camera agent
            if (message.event === shared_1.WsEvents.START_RECORDING || message.event === shared_1.WsEvents.STOP_RECORDING) {
                const targetStationId = message.payload?.stationId;
                if (targetStationId && this.stationSockets.has(targetStationId)) {
                    const station = this.stationSockets.get(targetStationId);
                    if (station.socket.readyState === ws_1.WebSocket.OPEN) {
                        station.socket.send(JSON.stringify(message));
                        logger_js_1.logger.info(`Forwarded ${message.event} to camera agent on station ${targetStationId}`);
                    }
                }
            }
        }
        catch (err) {
            logger_js_1.logger.error("Failed to parse client WS message:", err);
        }
    }
    broadcastToClients(message) {
        const raw = JSON.stringify(message);
        for (const client of this.clientSockets) {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(raw);
            }
        }
    }
}
exports.StationHub = StationHub;
exports.stationHub = new StationHub();
