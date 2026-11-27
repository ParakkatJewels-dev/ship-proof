import { spawn, ChildProcess } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { agentConfig } from "../config/agent.config.js";
import { agentLogger } from "../utils/localLogger.js";
import { finalizeSession } from "./finalize.js";
import {
  listParts,
  sessionDir,
  updateSession,
  writeSession,
} from "./sessionStore.js";
import { streamMonitor } from "./streamMonitor.js";
import { cameraInputArgs, parseStreamInfo } from "./cameraInfo.js";
import { CameraStatus } from "@shipproof/shared";

export interface RecordingSession {
  sessionId: string;
  orderId: string;
  orderNumber: string;
  packerId: string;
  startTime: number;
  dir: string;
  isMock: boolean;
  /** One-time key the dashboard needs to open this recording's live preview. */
  previewToken: string;
  /** The ShipProof server this recording belongs to. */
  apiUrl: string;
}

export interface StopResult {
  sessionId: string;
  orderId: string;
  filePath: string;
  durationSeconds: number;
  fileSizeBytes: number;
  /** True when the recording was thrown away (a retake) and nothing will be uploaded. */
  discarded?: boolean;
  /** One-time key to play the finished video while it waits for review. */
  reviewToken?: string;
  /** Length of the finished video in seconds. */
  videoSeconds?: number;
  orderNumber?: string;
}

/** Arguments for ffmpeg. Video is cut into short pieces, each a fragmented MP4 that stays playable if cut off. */
export function buildFfmpegArgs(dir: string, startNumber: number): string[] {
  const input = cameraInputArgs();
  let codec: string[];
  if (agentConfig.rtspStreamUrl) {
    // IP / CCTV camera: copy the stream as it is, with no re-encoding, which is light on the computer.
    codec = ["-c:v", "copy"];
  } else {
    codec = [
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-tune",
      "zerolatency",
      "-pix_fmt",
      "yuv420p",
      // A key frame at every piece boundary, so each piece starts cleanly.
      "-force_key_frames",
      `expr:gte(t,n_forced*${agentConfig.segmentSeconds})`,
    ];
  }
  return [
    ...input,
    "-an",
    ...codec,
    "-f",
    "segment",
    "-segment_time",
    String(agentConfig.segmentSeconds),
    "-segment_start_number",
    String(startNumber),
    "-reset_timestamps",
    "1",
    "-segment_format",
    "mp4",
    "-segment_format_options",
    "movflags=+frag_keyframe+empty_moov+default_base_moof",
    path.join(dir, "part_%04d.mp4"),
    // Second output: a small, low-rate picture stream for the live preview on the dashboard.
    "-an",
    "-vf",
    `fps=${agentConfig.previewFps},scale=${agentConfig.previewWidth}:-2`,
    "-c:v",
    "mjpeg",
    "-q:v",
    "7",
    "-flush_packets",
    "1",
    "-f",
    "image2pipe",
    "pipe:1",
  ];
}

/** Splits ffmpeg's stream of back-to-back JPEG pictures into single frames. */
class JpegFrameParser {
  private buf = Buffer.alloc(0);
  constructor(private onFrame: (frame: Buffer) => void) {}
  push(chunk: Buffer) {
    this.buf = Buffer.concat([this.buf, chunk]);
    for (;;) {
      const start = this.buf.indexOf(Buffer.from([0xff, 0xd8]));
      if (start < 0) break;
      const end = this.buf.indexOf(Buffer.from([0xff, 0xd9]), start + 2);
      if (end < 0) {
        if (this.buf.length > 4 * 1024 * 1024)
          this.buf = Buffer.alloc(0); // runaway data, start over
        else if (start > 0) this.buf = this.buf.subarray(start);
        break;
      }
      this.onFrame(this.buf.subarray(start, end + 2));
      this.buf = this.buf.subarray(end + 2);
    }
  }
}

const RESTART_DELAY_MS = 3_000;

export class FfmpegRecorder {
  private proc: ChildProcess | null = null;
  private session: RecordingSession | null = null;
  private stopping = false;
  private mockTimer: NodeJS.Timeout | null = null;
  private restartTimer: NodeJS.Timeout | null = null;
  private autoStopTimer: NodeJS.Timeout | null = null;
  private latestFrame: Buffer | null = null;
  private frameListeners = new Set<(frame: Buffer | null) => void>();

  /** Called when a recording stops by itself because it reached the maximum length. */
  onAutoStop?: (result: StopResult) => void;

  /** The newest preview picture, or null when nothing is being recorded or no picture has arrived yet. */
  getPreviewFrame(): Buffer | null {
    return this.latestFrame;
  }

  /** Calls `listener` with each new preview picture, and with null when the recording ends. Returns an unsubscribe function. */
  onPreviewFrame(listener: (frame: Buffer | null) => void): () => void {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  }

  isRecording(): boolean {
    return this.session !== null;
  }

  getCurrentSession(): RecordingSession | null {
    return this.session;
  }

  startRecording(
    orderId: string,
    orderNumber: string,
    sessionId: string,
    packerId: string,
    apiUrl: string = agentConfig.cloudApiUrl,
  ): RecordingSession {
    if (this.session)
      throw new Error("A recording is already in progress on this station.");

    fs.mkdirSync(agentConfig.recordingsDir, { recursive: true });
    const freeMb = freeDiskMb(agentConfig.recordingsDir);
    if (freeMb !== null && freeMb < agentConfig.minFreeDiskMb) {
      throw new Error(
        `Not enough free disk space to record (${freeMb} MB free, ${agentConfig.minFreeDiskMb} MB needed).`,
      );
    }

    const dir = sessionDir(orderId, sessionId);
    fs.mkdirSync(dir, { recursive: true });
    const startedAt = new Date();
    writeSession(dir, {
      sessionId,
      orderId,
      orderNumber,
      packerId,
      apiUrl,
      startedAt: startedAt.toISOString(),
      status: "recording",
      attempts: 0,
    });

    this.session = {
      sessionId,
      orderId,
      orderNumber,
      packerId,
      startTime: startedAt.getTime(),
      dir,
      isMock: false,
      previewToken: crypto.randomBytes(16).toString("hex"),
      apiUrl,
    };
    this.latestFrame = null;
    this.stopping = false;
    agentLogger.info(
      `Recording started for Order ${orderNumber} (${orderId}) -> ${dir}`,
    );

    this.spawnFfmpeg();

    // Safety net: stop by itself if nobody presses Stop.
    this.autoStopTimer = setTimeout(() => {
      agentLogger.warn(
        `Recording reached the ${agentConfig.maxRecordingMinutes}-minute limit; stopping automatically.`,
      );
      this.stopRecording()
        .then((result) => this.onAutoStop?.(result))
        .catch((err) =>
          agentLogger.error("Automatic stop failed:", err.message),
        );
    }, agentConfig.maxRecordingMinutes * 60_000);

    return this.session;
  }

  /** Starts ffmpeg, continuing the piece numbering when it is restarted after the camera dropped. */
  private spawnFfmpeg() {
    const session = this.session;
    if (!session || this.stopping) return;
    const startNumber = listParts(session.dir).length;
    const proc = spawn(
      agentConfig.ffmpegPath,
      buildFfmpegArgs(session.dir, startNumber),
    );
    this.proc = proc;

    const parser = new JpegFrameParser((frame) => {
      this.latestFrame = Buffer.from(frame);
      for (const listener of this.frameListeners) listener(this.latestFrame);
    });
    proc.stdout?.on("data", (data: Buffer) => parser.push(data));

    proc.stderr?.on("data", (data) => {
      const text = data.toString();
      // ffmpeg's start-up report says what size and speed the camera really delivers.
      parseStreamInfo(text);
      if (/error|fatal|Connection refused|timed out/i.test(text))
        agentLogger.error("FFmpeg:", text.trim().slice(-300));
    });

    proc.on("error", (err) => {
      // ffmpeg isn't installed: fall back to simulated recording so the rest of the system can be tried.
      agentLogger.warn(
        `FFmpeg could not start (${err.message}). Using simulated recording.`,
      );
      this.proc = null;
      this.startMock();
    });

    proc.on("close", (code) => {
      if (this.proc !== proc) return;
      this.proc = null;
      if (this.stopping || !this.session) return;
      // The camera dropped or ffmpeg crashed mid-recording: keep what we have and reconnect.
      agentLogger.error(
        `FFmpeg stopped unexpectedly (code ${code}). Reconnecting to the camera in ${RESTART_DELAY_MS / 1000}s.`,
      );
      streamMonitor.setStatus(CameraStatus.ERROR);
      this.restartTimer = setTimeout(() => {
        this.restartTimer = null;
        streamMonitor.setStatus(CameraStatus.CONNECTED);
        this.spawnFfmpeg();
      }, RESTART_DELAY_MS);
    });
  }

  /** Simulated recording: writes a small placeholder piece on the same schedule real recording would. */
  private startMock() {
    const session = this.session;
    if (!session || this.mockTimer) return;
    session.isMock = true;
    updateSession(session.dir, { mock: true });
    const writePiece = () => {
      const n = listParts(session.dir).length;
      fs.writeFileSync(
        path.join(session.dir, `part_${String(n).padStart(4, "0")}.mp4`),
        Buffer.from(
          `SHIPPROOF_SIMULATED_VIDEO_${session.orderNumber}_piece${n}_${Date.now()}\n`,
        ),
      );
    };
    writePiece();
    this.mockTimer = setInterval(writePiece, agentConfig.segmentSeconds * 1000);
  }

  /** Stops the recording. With `discard`, the video is deleted and never uploaded (used for a retake). */
  async stopRecording(opts: { discard?: boolean } = {}): Promise<StopResult> {
    const session = this.session;
    if (!session) throw new Error("No active recording session to stop.");

    this.stopping = true;
    if (this.autoStopTimer) clearTimeout(this.autoStopTimer);
    if (this.restartTimer) clearTimeout(this.restartTimer);
    if (this.mockTimer) clearInterval(this.mockTimer);
    this.autoStopTimer = this.restartTimer = this.mockTimer = null;

    const proc = this.proc;
    this.proc = null;
    if (proc && proc.exitCode === null) {
      agentLogger.info("Stopping FFmpeg gracefully...");
      const closed = new Promise<void>((resolve) =>
        proc.once("close", () => resolve()),
      );
      proc.stdin?.write("q");
      await Promise.race([closed, new Promise((r) => setTimeout(r, 8_000))]);
      if (proc.exitCode === null) proc.kill("SIGTERM");
    }

    try {
      if (opts.discard) {
        fs.rmSync(session.dir, { recursive: true, force: true });
        agentLogger.info(
          `Recording for Order ${session.orderNumber} discarded (retake). Nothing will be uploaded.`,
        );
        return {
          sessionId: session.sessionId,
          orderId: session.orderId,
          filePath: "",
          durationSeconds: 0,
          fileSizeBytes: 0,
          discarded: true,
        };
      }
      const final = finalizeSession(session.dir, {
        interrupted: false,
        status: "review",
      });
      const result: StopResult = {
        sessionId: session.sessionId,
        orderId: session.orderId,
        filePath: path.join(session.dir, final.finalFile!),
        durationSeconds: final.durationSeconds!,
        fileSizeBytes: final.fileSizeBytes!,
        reviewToken: final.reviewToken,
        videoSeconds: final.videoDurationSeconds,
        orderNumber: session.orderNumber,
      };
      agentLogger.info(
        `Recording stopped. Duration: ${result.durationSeconds}s, size: ${result.fileSizeBytes} bytes`,
      );
      return result;
    } finally {
      this.session = null;
      this.stopping = false;
      this.latestFrame = null;
      for (const listener of this.frameListeners) listener(null);
    }
  }
}

/** Free disk space in MB where the recordings go, or null when it can't be read. */
function freeDiskMb(dir: string): number | null {
  try {
    const s = fs.statfsSync(dir);
    return Math.floor((Number(s.bavail) * Number(s.bsize)) / (1024 * 1024));
  } catch {
    return null;
  }
}

export const recorder = new FfmpegRecorder();
