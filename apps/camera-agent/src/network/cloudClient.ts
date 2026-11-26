import { agentConfig } from "../config/agent.config.js";
import { agentLogger } from "../utils/localLogger.js";
import { recorder } from "../core/ffmpeg.recorder.js";
import { uploadQueue } from "./uploadQueue.js";
import { getCameraInfo } from "../core/cameraInfo.js";
import { streamMonitor } from "../core/streamMonitor.js";
import { StationStatus, CameraStatus } from "@shipproof/shared";

/** How often the device reports its status when nothing changes. */
const REPORT_INTERVAL_MS = 10_000;
/** Reports sent because something changed (upload progress) are spaced at least this far apart. */
const MIN_GAP_MS = 1_500;
/** Longer wait when another device holds the single device slot. */
const DEVICE_IN_USE_RETRY_MS = 30_000;

/**
 * Tells ShipProof what this camera device is doing: camera state, the recording in progress, the
 * recording waiting for review, and the upload queue. Sent over plain HTTPS every few seconds, so the
 * ShipProof server can run on serverless hosting (Vercel). Start and stop commands no longer come from
 * the server: the dashboard on this computer sends them straight to the local port (localHttpServer).
 */
export class CloudReporter {
  private timer: NodeJS.Timeout | null = null;
  private sending = false;
  private lastSentAt = 0;
  private pendingSoon: NodeJS.Timeout | null = null;
  private connected: boolean | null = null;
  private blockedUntil = 0;

  start() {
    agentLogger.info(`Reporting status to ShipProof at ${agentConfig.cloudApiUrl}`);
    void this.send();
    this.timer = setInterval(() => void this.send(), REPORT_INTERVAL_MS);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    if (this.pendingSoon) clearTimeout(this.pendingSoon);
  }

  /** Report now (spaced out), for example when a recording starts or an upload makes progress. */
  reportSoon() {
    if (this.pendingSoon) return;
    const wait = Math.max(0, this.lastSentAt + MIN_GAP_MS - Date.now());
    this.pendingSoon = setTimeout(() => {
      this.pendingSoon = null;
      void this.send();
    }, wait);
  }

  private report() {
    return {
      stationId: agentConfig.stationId,
      stationName: agentConfig.stationName,
      cameraName: agentConfig.rtspStreamUrl ? "IP camera (RTSP)" : agentConfig.cameraDeviceName,
      status: recorder.isRecording() ? StationStatus.BUSY : StationStatus.ONLINE,
      cameraStatus: recorder.isRecording() ? CameraStatus.RECORDING : streamMonitor.getStatus(),
      pendingUploads: uploadQueue.pending().length,
      uploads: uploadQueue.snapshot(),
      ...getCameraInfo(),
      recording: this.currentRecording(),
      review: this.currentReview(),
      timestamp: new Date().toISOString(),
    };
  }

  private async send() {
    if (this.sending || Date.now() < this.blockedUntil) return;
    this.sending = true;
    this.lastSentAt = Date.now();
    try {
      const res = await fetch(`${agentConfig.cloudApiUrl}/api/stations/heartbeat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Station-Id": agentConfig.stationId,
          "X-Station-Key": agentConfig.stationApiKey,
        },
        body: JSON.stringify(this.report()),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.status === 409) {
        this.blockedUntil = Date.now() + DEVICE_IN_USE_RETRY_MS;
        agentLogger.error(
          `Another camera device is already connected to ShipProof. Only one device can be connected at a time. ` +
            `Disconnect the other device; retrying in ${DEVICE_IN_USE_RETRY_MS / 1000}s.`,
        );
        this.setConnected(false);
        return;
      }
      if (res.status === 401) {
        agentLogger.error("ShipProof did not accept this station's key. Check STATION_ID and STATION_API_KEY.");
        this.setConnected(false);
        return;
      }
      if (!res.ok) throw new Error(`ShipProof answered ${res.status}`);
      this.setConnected(true);
    } catch (err: any) {
      if (this.connected !== false) agentLogger.warn(`Could not reach ShipProof: ${err.message}. Retrying.`);
      this.setConnected(false);
    } finally {
      this.sending = false;
    }
  }

  private setConnected(value: boolean) {
    if (value && this.connected !== true) agentLogger.info("Connected to ShipProof.");
    this.connected = value;
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

  /** What this device is recording right now, so the dashboard can pick it up again after a reload. */
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
}

export const cloudReporter = new CloudReporter();
