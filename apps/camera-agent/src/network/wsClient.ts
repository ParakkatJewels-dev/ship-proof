import { WebSocket } from "ws";
import { agentConfig } from "../config/agent.config.js";
import { agentLogger } from "../utils/localLogger.js";
import { recorder } from "../core/ffmpeg.recorder.js";
import { uploadQueue } from "./uploadQueue.js";
import { getCameraInfo } from "../core/cameraInfo.js";
import { streamMonitor } from "../core/streamMonitor.js";
import {
  WsEvents,
  WsMessage,
  StationStatus,
  CameraStatus,
  WS_CLOSE_DEVICE_IN_USE,
} from "@shipproof/shared";

const RECONNECT_DELAY_MS = 5_000;
/** Longer wait when another device holds the single device slot. */
const DEVICE_IN_USE_RETRY_MS = 30_000;

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

      this.ws.on("close", (code) => {
        this.cleanup();
        if (code === WS_CLOSE_DEVICE_IN_USE) {
          agentLogger.error(
            `Another camera device is already connected to ShipProof. Only one device can be connected at a time. ` +
              `Disconnect the other device; retrying in ${DEVICE_IN_USE_RETRY_MS / 1000}s.`,
          );
          this.scheduleReconnect(DEVICE_IN_USE_RETRY_MS);
          return;
        }
        agentLogger.warn(
          "Cloud WebSocket connection closed. Scheduling auto-reconnect...",
        );
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
        let started;
        try {
          started = recorder.startRecording(
            orderId,
            orderNumber,
            sessionId,
            packerId,
          );
        } catch (err: any) {
          this.sendMessage(WsEvents.ERROR, {
            stationId: agentConfig.stationId,
            sessionId,
            code: "START_FAILED",
            message: err.message,
          });
          return;
        }
        this.sendMessage(WsEvents.RECORDING_STARTED, {
          stationId: agentConfig.stationId,
          orderId,
          orderNumber,
          sessionId,
          startedAt: new Date(started.startTime).toISOString(),
          previewToken: started.previewToken,
        });
      } else if (msg.event === WsEvents.STOP_RECORDING) {
        const active = recorder.getCurrentSession();
        const discard = !!msg.payload?.discard;
        if (active) {
          recorder
            .stopRecording({ discard })
            .then((result) => {
              this.sendMessage(WsEvents.RECORDING_STOPPED, {
                stationId: agentConfig.stationId,
                orderId: active.orderId,
                sessionId: active.sessionId,
                durationSeconds: result.durationSeconds,
                discarded: !!result.discarded,
                // A finished recording waits for the packer to review it; it uploads after they save it.
                needsReview: !result.discarded,
                orderNumber: active.orderNumber,
                reviewToken: result.reviewToken,
                videoSeconds: result.videoSeconds,
              });
            })
            .catch((err: Error) => {
              this.sendMessage(WsEvents.ERROR, {
                stationId: agentConfig.stationId,
                sessionId: active.sessionId,
                code: "STOP_FAILED",
                message: err.message,
              });
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

  private sendHeartbeat() {
    this.sendMessage(WsEvents.HEARTBEAT, {
      stationId: agentConfig.stationId,
      stationName: agentConfig.stationName,
      cameraName: agentConfig.rtspStreamUrl
        ? "IP camera (RTSP)"
        : agentConfig.cameraDeviceName,
      status: recorder.isRecording()
        ? StationStatus.BUSY
        : StationStatus.ONLINE,
      cameraStatus: recorder.isRecording()
        ? CameraStatus.RECORDING
        : streamMonitor.getStatus(),
      pendingUploads: uploadQueue.pending().length,
      ...getCameraInfo(),
      recording: this.currentRecording(),
      review: this.currentReview(),
      timestamp: new Date().toISOString(),
    });
  }

  /** The finished recording waiting for the packer's review, so the dashboard can find it again after a reload. */
  private currentReview() {
    const r = uploadQueue.reviewing();
    return r && r.reviewToken
      ? {
          sessionId: r.sessionId,
          orderId: r.orderId,
          orderNumber: r.orderNumber,
          reviewToken: r.reviewToken,
          videoSeconds: r.videoDurationSeconds ?? r.durationSeconds ?? 0,
        }
      : null;
  }

  /** What this device is recording right now, so the dashboard can pick it up again after a reload or a dropped connection. */
  private currentRecording() {
    const s = recorder.getCurrentSession();
    return s
      ? {
          sessionId: s.sessionId,
          orderId: s.orderId,
          orderNumber: s.orderNumber,
          startedAt: new Date(s.startTime).toISOString(),
          previewToken: s.previewToken,
        }
      : null;
  }

  /** Tells the dashboard a recording ended by itself (maximum length reached). */
  announceAutoStop(result: {
    orderId: string;
    sessionId: string;
    durationSeconds: number;
    reviewToken?: string;
    videoSeconds?: number;
    orderNumber?: string;
  }) {
    this.sendMessage(WsEvents.RECORDING_STOPPED, {
      stationId: agentConfig.stationId,
      orderId: result.orderId,
      sessionId: result.sessionId,
      durationSeconds: result.durationSeconds,
      needsReview: true,
      orderNumber: result.orderNumber,
      reviewToken: result.reviewToken,
      videoSeconds: result.videoSeconds,
    });
  }

  private startHeartbeat() {
    // Announce the device straight away so the dashboard shows it without waiting 10 seconds.
    this.sendHeartbeat();
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), 10000);
  }

  private scheduleReconnect(delayMs = RECONNECT_DELAY_MS) {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, delayMs);
    }
  }

  private cleanup() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
  }
}

export const wsClient = new AgentWsClient();
