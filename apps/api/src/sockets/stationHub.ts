import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { logger } from "../utils/logger.js";
import { WsEvents, WsMessage } from "@shipproof/shared";
import { stationService } from "../modules/stations/station.service.js";

interface ConnectedStation {
  stationId: string;
  socket: WebSocket;
  isAlive: boolean;
}

export class StationHub {
  private wss: WebSocketServer | null = null;
  private stationSockets = new Map<string, ConnectedStation>();
  private clientSockets = new Set<WebSocket>();

  init(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: "/ws/stations" });

    this.wss.on("connection", (ws: WebSocket, req) => {
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const stationId = url.searchParams.get("stationId");
      const clientType = url.searchParams.get("type") || "client"; // "agent" or "client"

      if (clientType === "agent" && stationId) {
        logger.info(`Camera Agent connected for station: ${stationId}`);
        this.stationSockets.set(stationId, {
          stationId,
          socket: ws,
          isAlive: true,
        });

        ws.on("message", (data) => this.handleAgentMessage(stationId, data.toString()));
        ws.on("close", () => {
          logger.warn(`Camera Agent disconnected for station: ${stationId}`);
          this.stationSockets.delete(stationId);
          this.broadcastToClients({
            event: WsEvents.CAMERA_STATUS_CHANGED,
            payload: { stationId, status: "DISCONNECTED" },
            timestamp: new Date().toISOString(),
          });
        });
      } else {
        // Packer / Admin web client connection
        this.clientSockets.add(ws);
        ws.on("message", (data) => this.handleClientMessage(ws, data.toString()));
        ws.on("close", () => this.clientSockets.delete(ws));
      }
    });

    logger.info("Station WebSocket Hub initialized at /ws/stations");
  }

  private handleAgentMessage(stationId: string, raw: string) {
    try {
      const message = JSON.parse(raw) as WsMessage;
      // Handle heartbeats
      if (message.event === WsEvents.HEARTBEAT) {
        stationService.recordHeartbeat(message.payload);
      }
      // Forward telemetry to web clients
      this.broadcastToClients(message);
    } catch (err) {
      logger.error("Failed to parse agent WS message:", err);
    }
  }

  private handleClientMessage(ws: WebSocket, raw: string) {
    try {
      const message = JSON.parse(raw) as WsMessage;

      // If client requests start/stop recording, route directly to the target station's camera agent
      if (message.event === WsEvents.START_RECORDING || message.event === WsEvents.STOP_RECORDING) {
        const targetStationId = message.payload?.stationId;
        if (targetStationId && this.stationSockets.has(targetStationId)) {
          const station = this.stationSockets.get(targetStationId)!;
          if (station.socket.readyState === WebSocket.OPEN) {
            station.socket.send(JSON.stringify(message));
            logger.info(`Forwarded ${message.event} to camera agent on station ${targetStationId}`);
          }
        }
      }
    } catch (err) {
      logger.error("Failed to parse client WS message:", err);
    }
  }

  broadcastToClients(message: WsMessage) {
    const raw = JSON.stringify(message);
    for (const client of this.clientSockets) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    }
  }
}

export const stationHub = new StationHub();
