import { authService } from "../modules/auth/auth.service.js";
import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { logger } from "../utils/logger.js";
import { WsEvents, WsMessage, StationHeartbeat, WS_CLOSE_DEVICE_IN_USE } from "@shipproof/shared";
import { stationService } from "../modules/stations/station.service.js";

/** How often the hub pings the connected device; a device that misses a ping is dropped. */
const PING_INTERVAL_MS = 30_000;

interface ConnectedDevice {
  stationId: string;
  socket: WebSocket;
  isAlive: boolean;
  connectedAt: string;
  lastHeartbeat: StationHeartbeat | null;
}

export interface ActiveDeviceInfo {
  stationId: string;
  connectedAt: string;
  lastHeartbeat: StationHeartbeat | null;
}

/**
 * Relays commands and telemetry between camera agents and web clients.
 * Only one camera device may be connected at a time: a second agent is rejected with
 * close code WS_CLOSE_DEVICE_IN_USE until the first disconnects or stops answering pings.
 */
/** Close code sent to a web client whose sign-in is missing or no longer valid. */
const WS_CLOSE_UNAUTHORIZED = 4401;

export class StationHub {
  private wss: WebSocketServer | null = null;
  private activeDevice: ConnectedDevice | null = null;
  private clientSockets = new Set<WebSocket>();

  init(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: "/ws/stations" });

    this.wss.on("connection", async (ws: WebSocket, req) => {
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const stationId = url.searchParams.get("stationId");
      const clientType = url.searchParams.get("type") || "client"; // "agent" or "client"

      if (clientType === "agent" && stationId) {
        this.handleAgentConnection(ws, stationId);
      } else {
        // Packer / Admin web client connection: only signed-in people may connect.
        try {
          await authService.verify(url.searchParams.get("token") || "");
        } catch {
          ws.close(WS_CLOSE_UNAUTHORIZED, "Sign in to continue");
          return;
        }
        this.clientSockets.add(ws);
        ws.on("message", (data) => this.handleClientMessage(data.toString()));
        ws.on("close", () => this.clientSockets.delete(ws));
      }
    });

    // Drop a device that stopped answering, so a crashed agent can't hold the slot forever.
    const pinger = setInterval(() => {
      const device = this.activeDevice;
      if (!device) return;
      if (!device.isAlive) {
        logger.warn(`Camera device for station ${device.stationId} stopped responding; releasing the device slot.`);
        device.socket.terminate();
        return;
      }
      device.isAlive = false;
      device.socket.ping();
    }, PING_INTERVAL_MS);
    this.wss.on("close", () => clearInterval(pinger));

    logger.info("Station WebSocket Hub initialized at /ws/stations (one camera device at a time)");
  }

  private handleAgentConnection(ws: WebSocket, stationId: string) {
    const current = this.activeDevice;

    if (current && current.socket.readyState === WebSocket.OPEN) {
      if (current.stationId !== stationId) {
        logger.warn(
          `Rejected camera device for station ${stationId}: station ${current.stationId} is already connected.`
        );
        ws.send(
          JSON.stringify({
            event: WsEvents.ERROR,
            payload: {
              code: "DEVICE_IN_USE",
              message: `Another device (station ${current.stationId}) is already connected. Only one device can be connected at a time.`,
              activeStationId: current.stationId,
            },
            timestamp: new Date().toISOString(),
          } satisfies WsMessage)
        );
        ws.close(WS_CLOSE_DEVICE_IN_USE, "Another device is already connected");
        return;
      }
      // Same station reconnecting (for example after a network drop): replace the stale socket.
      logger.info(`Camera device for station ${stationId} reconnected; replacing its previous connection.`);
      current.socket.removeAllListeners("close");
      current.socket.terminate();
    }

    const device: ConnectedDevice = {
      stationId,
      socket: ws,
      isAlive: true,
      connectedAt: new Date().toISOString(),
      lastHeartbeat: null,
    };
    this.activeDevice = device;
    logger.info(`Camera device connected for station: ${stationId}`);
    this.broadcastDeviceChange("CONNECTED", stationId);

    ws.on("pong", () => {
      device.isAlive = true;
    });
    ws.on("message", (data) => this.handleAgentMessage(device, data.toString()));
    ws.on("close", () => {
      if (this.activeDevice !== device) return;
      this.activeDevice = null;
      logger.warn(`Camera device disconnected for station: ${stationId}`);
      this.broadcastDeviceChange("DISCONNECTED", stationId);
    });
  }

  private handleAgentMessage(device: ConnectedDevice, raw: string) {
    try {
      const message = JSON.parse(raw) as WsMessage;
      device.isAlive = true;
      if (message.event === WsEvents.HEARTBEAT) {
        device.lastHeartbeat = { ...message.payload, stationId: device.stationId };
        stationService.recordHeartbeat(device.lastHeartbeat!);
      }
      // Forward telemetry to web clients
      this.broadcastToClients(message);
    } catch (err) {
      logger.error("Failed to parse agent WS message:", err);
    }
  }

  private handleClientMessage(raw: string) {
    try {
      const message = JSON.parse(raw) as WsMessage;

      // Start/stop commands go to the connected device, and only if it is the station the client targets.
      if (message.event === WsEvents.START_RECORDING || message.event === WsEvents.STOP_RECORDING) {
        const targetStationId = message.payload?.stationId;
        const device = this.activeDevice;
        if (device && device.stationId === targetStationId && device.socket.readyState === WebSocket.OPEN) {
          device.socket.send(JSON.stringify(message));
          logger.info(`Forwarded ${message.event} to camera device on station ${targetStationId}`);
        } else {
          logger.warn(`Dropped ${message.event}: station ${targetStationId} is not the connected device.`);
        }
      }
    } catch (err) {
      logger.error("Failed to parse client WS message:", err);
    }
  }

  private broadcastDeviceChange(status: "CONNECTED" | "DISCONNECTED", stationId: string) {
    this.broadcastToClients({
      event: WsEvents.CAMERA_STATUS_CHANGED,
      payload: { stationId, status },
      timestamp: new Date().toISOString(),
    });
  }

  /** The single connected camera device, or null when none is connected. */
  getActiveDevice(): ActiveDeviceInfo | null {
    const device = this.activeDevice;
    if (!device || device.socket.readyState !== WebSocket.OPEN) return null;
    return { stationId: device.stationId, connectedAt: device.connectedAt, lastHeartbeat: device.lastHeartbeat };
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
