import { agentConfig } from "../config/agent.config.js";
import { agentLogger } from "../utils/localLogger.js";
import { recorder } from "../core/ffmpeg.recorder.js";
import { uploadQueue, serverFor } from "./uploadQueue.js";
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
/** What is known about one ShipProof server this device reports to. */
interface ServerState {
  sending: boolean;
  connected: boolean | null;
  blockedUntil: number;
}

export class CloudReporter {
  private timer: NodeJS.Timeout | null = null;
  private lastSentAt = 0;
  private pendingSoon: NodeJS.Timeout | null = null;
  private servers = new Map<string, ServerState>(
    agentConfig.cloudApiUrls.map((url) => [url, { sending: false, connected: null, blockedUntil: 0 }]),
  );

  start() {
    agentLogger.info(`Reporting status to ShipProof at ${agentConfig.cloudApiUrls.join(" and ")}`);
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

  /** The status for one server: the camera is shared, but each server only sees its own recordings and uploads. */
  private report(server: string) {
    const mine = <T extends { apiUrl?: string }>(x: T | null) => (x && serverFor(x) === server ? x : null);
    const recording = mine(recorder.getCurrentSession());
    const review = mine(uploadQueue.reviewing());
    const uploads = uploadQueue
      .snapshot()
      .filter((u) => u.apiUrl === server)
      .map(({ apiUrl: _server, ...u }) => u);
    return {
      stationId: agentConfig.stationId,
      stationName: agentConfig.stationName,
      cameraName: agentConfig.rtspStreamUrl ? "IP camera (RTSP)" : agentConfig.cameraDeviceName,
      status: recorder.isRecording() ? StationStatus.BUSY : StationStatus.ONLINE,
      cameraStatus: recorder.isRecording() ? CameraStatus.RECORDING : streamMonitor.getStatus(),
      pendingUploads: uploads.filter((u) => u.state !== "done").length,
      uploads,
      ...getCameraInfo(),
      recording: this.currentRecording(recording),
      review: this.currentReview(review),
      timestamp: new Date().toISOString(),
    };
  }

  private async send() {
    this.lastSentAt = Date.now();
    await Promise.all([...this.servers.keys()].map((url) => this.sendTo(url)));
  }

  private async sendTo(url: string) {
    const state = this.servers.get(url)!;
    if (state.sending || Date.now() < state.blockedUntil) return;
    state.sending = true;
    const name = this.servers.size > 1 ? ` (${url})` : "";
    try {
      const res = await fetch(`${url}/api/stations/heartbeat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Station-Id": agentConfig.stationId,
          "X-Station-Key": agentConfig.stationApiKey,
        },
        body: JSON.stringify(this.report(url)),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.status === 409) {
        state.blockedUntil = Date.now() + DEVICE_IN_USE_RETRY_MS;
        agentLogger.error(
          `Another camera device is already connected to ShipProof${name}. Only one device can be connected at a time. ` +
            `Disconnect the other device; retrying in ${DEVICE_IN_USE_RETRY_MS / 1000}s.`,
        );
        this.setConnected(state, false, name);
        return;
      }
      if (res.status === 401) {
        agentLogger.error(`ShipProof${name} did not accept this station's key. Check STATION_ID and STATION_API_KEY.`);
        this.setConnected(state, false, name);
        return;
      }
      if (!res.ok) throw new Error(`ShipProof answered ${res.status}`);
      this.setConnected(state, true, name);
    } catch (err: any) {
      if (state.connected !== false) agentLogger.warn(`Could not reach ShipProof${name}: ${err.message}. Retrying.`);
      this.setConnected(state, false, name);
    } finally {
      state.sending = false;
    }
  }

  private setConnected(state: ServerState, value: boolean, name: string) {
    if (value && state.connected !== true) agentLogger.info(`Connected to ShipProof${name}.`);
    state.connected = value;
  }

  /** The finished recording waiting for the packer's review, so the dashboard can find it again after a reload. */
  private currentReview(r: ReturnType<typeof uploadQueue.reviewing>) {
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
  private currentRecording(s: ReturnType<typeof recorder.getCurrentSession>) {
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
