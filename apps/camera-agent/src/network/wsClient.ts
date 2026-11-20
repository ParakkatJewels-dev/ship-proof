import { WebSocket } from "ws";
import { agentConfig } from "../config/agent.config.js";
import { agentLogger } from "../utils/localLogger.js";
import { recorder } from "../core/ffmpeg.recorder.js";
import { uploader } from "./uploader.js";
import { streamMonitor } from "../core/streamMonitor.js";
import { WsEvents, WsMessage, StationStatus, CameraStatus } from "@shipproof/shared";

export class AgentWsClient {
  private ws: WebSocket | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  connect() {
    const wsUrl = `${agentConfig.cloudWsUrl}?stationId=${agentConfig.stationId}&type=agent`;
    agentLogger.info(`Connecting to Cloud WebSocket Gateway: ${wsUrl}`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.on("open", () => {
        agentLogger.info("Successfully connected to ShipProof Cloud Hub.");
        this.startHeartbeat();
      });

      this.ws.on("message", (data) => this.handleMessage(data.toString()));

      this.ws.on("close", () => {
        agentLogger.warn("Cloud WebSocket connection closed. Scheduling auto-reconnect...");
        this.cleanup();
        this.scheduleReconnect();
      });

      this.ws.on("error", (err) => {
        agentLogger.error("WebSocket connection error:", err.message);
      });
    } catch (err: any) {
      agentLogger.error("Failed to initialize WebSocket client:", err.message);
      this.scheduleReconnect();
    }
  }

  private handleMessage(raw: string) {
    try {
      const msg = JSON.parse(raw) as WsMessage;
      agentLogger.info(`Received Cloud Command: ${msg.event}`);

      if (msg.event === WsEvents.START_RECORDING) {
        const { orderId, orderNumber, sessionId, packerId } = msg.payload;
        recorder.startRecording(orderId, orderNumber, sessionId, packerId);
        this.sendMessage(WsEvents.RECORDING_STARTED, {
          stationId: agentConfig.stationId,
          orderId,
          sessionId,
          startedAt: new Date().toISOString(),
        });
      } else if (msg.event === WsEvents.STOP_RECORDING) {
        const active = recorder.getCurrentSession();
        if (active) {
          recorder.stopRecording().then((result) => {
            this.sendMessage(WsEvents.RECORDING_STOPPED, {
              stationId: agentConfig.stationId,
              orderId: active.orderId,
              sessionId: active.sessionId,
              durationSeconds: result.durationSeconds,
            });

            // Asynchronously upload to Supabase Storage
            uploader.uploadRecording(active.orderId, active.sessionId, result.filePath, result.durationSeconds);
          });
        }
      }
    } catch (err) {
      agentLogger.error("Error processing cloud message:", err);
    }
  }

  sendMessage(event: any, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WsMessage = {
        event,
        payload,
        timestamp: new Date().toISOString(),
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.sendMessage(WsEvents.HEARTBEAT, {
        stationId: agentConfig.stationId,
        status: recorder.isRecording() ? StationStatus.BUSY : StationStatus.ONLINE,
        cameraStatus: recorder.isRecording() ? CameraStatus.RECORDING : streamMonitor.getStatus(),
        timestamp: new Date().toISOString(),
      });
    }, 10000);
  }

  private scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 5000);
    }
  }

  private cleanup() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
  }
}

export const wsClient = new AgentWsClient();
