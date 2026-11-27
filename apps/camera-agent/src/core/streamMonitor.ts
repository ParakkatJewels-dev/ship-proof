import { spawn } from "child_process";
import { CameraStatus } from "@shipproof/shared";
import { agentConfig } from "../config/agent.config.js";
import { agentLogger } from "../utils/localLogger.js";
import { cameraInputArgs, parseStreamInfo } from "./cameraInfo.js";

/** After repeated failures, wait at most this long between checks. */
const MAX_BACKOFF_MS = 5 * 60_000;
/** A refused login is retried rarely: a DVR locks an account after a few wrong passwords. */
const LOGIN_REFUSED_WAIT_MS = 10 * 60_000;

/**
 * Whether the camera can be recorded from, as shown on the dashboard ("Camera ready" or the problem).
 *
 * For a DVR / IP camera (RTSP_STREAM_URL), the stream is really checked while nothing is recording: every
 * RTSP_CHECK_SECONDS the agent reads one picture from it. A DVR that is off the network shows as
 * disconnected, and a refused login as an error, instead of a false "Camera ready". Failed checks are
 * spaced out further and further (and a refused login much further), so the DVR is never flooded and its
 * account is not locked by repeated wrong passwords.
 *
 * A webcam keeps the earlier behaviour: its problems are seen when recording starts.
 */
export class StreamMonitor {
  private status: CameraStatus = CameraStatus.CONNECTED;
  private timer: NodeJS.Timeout | null = null;
  private failures = 0;
  /** Called when the status changes, so the dashboard hears about it at once. */
  onChange: (() => void) | null = null;

  getStatus(): CameraStatus {
    return this.status;
  }

  setStatus(newStatus: CameraStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      agentLogger.info(`Camera status changed to: ${newStatus}`);
      this.onChange?.();
    }
  }

  /** `isRecording` tells the monitor to leave the camera alone while a recording is using it. */
  startHealthCheck(isRecording: () => boolean) {
    if (!agentConfig.rtspStreamUrl) {
      // Webcam: no separate check (the camera may allow only one user at a time).
      this.timer = setInterval(() => {
        if (
          this.status === CameraStatus.ERROR ||
          this.status === CameraStatus.DISCONNECTED
        ) {
          agentLogger.warn("Attempting camera driver reconnection...");
          this.setStatus(CameraStatus.CONNECTED);
        }
      }, 5000);
      return;
    }
    this.scheduleRtspCheck(isRecording, 2_000);
  }

  private scheduleRtspCheck(isRecording: () => boolean, delayMs: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      if (isRecording()) {
        // The recording itself shows whether the stream works; check again afterwards.
        return this.scheduleRtspCheck(isRecording, agentConfig.rtspCheckSeconds * 1000);
      }
      const result = await checkRtspStream();
      if (result === "ok") {
        if (this.failures > 0) agentLogger.info("Camera stream (RTSP) is reachable again.");
        this.failures = 0;
        this.setStatus(CameraStatus.CONNECTED);
        return this.scheduleRtspCheck(isRecording, agentConfig.rtspCheckSeconds * 1000);
      }
      this.failures++;
      if (result === "login-refused") {
        this.setStatus(CameraStatus.ERROR);
        agentLogger.error(
          `The DVR / camera refused the user name or password in RTSP_STREAM_URL. Checking again in ${LOGIN_REFUSED_WAIT_MS / 60_000} minutes (to avoid locking the account).`,
        );
        return this.scheduleRtspCheck(isRecording, LOGIN_REFUSED_WAIT_MS);
      }
      this.setStatus(CameraStatus.DISCONNECTED);
      const wait = Math.min(
        agentConfig.rtspCheckSeconds * 1000 * 2 ** (this.failures - 1),
        MAX_BACKOFF_MS,
      );
      agentLogger.warn(
        `Camera stream (RTSP) not reachable (${result}). Checking again in ${Math.round(wait / 1000)}s.`,
      );
      this.scheduleRtspCheck(isRecording, wait);
    }, delayMs);
  }
}

/**
 * Reads one picture from the RTSP stream. "ok" when it worked, "login-refused" for a wrong user name or
 * password, otherwise a short reason. The stream's picture size and frame rate are recorded on the way.
 */
function checkRtspStream(): Promise<"ok" | "login-refused" | string> {
  return new Promise((resolve) => {
    let report = "";
    let done = false;
    const finish = (r: string) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(r);
    };
    let proc: ReturnType<typeof spawn>;
    try {
      proc = spawn(agentConfig.ffmpegPath, [
        "-hide_banner",
        ...cameraInputArgs(),
        "-frames:v",
        "1",
        "-f",
        "null",
        "-",
      ]);
    } catch (err: any) {
      return resolve(`ffmpeg could not start: ${err.message}`);
    }
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      finish("no video within 20 s");
    }, 20_000);
    proc.stderr?.on("data", (d) => (report += d.toString()));
    proc.on("error", (err) => finish(`ffmpeg could not start: ${err.message}`));
    proc.on("close", (code) => {
      parseStreamInfo(report);
      if (code === 0) return finish("ok");
      if (/401|Unauthorized/i.test(report)) return finish("login-refused");
      if (/404|Not Found/i.test(report)) return finish("stream not found: check the channel in the address");
      if (/refused/i.test(report)) return finish("connection refused: check the address and RTSP port");
      if (/timed? ?out|Timeout/i.test(report)) return finish("timed out: is the DVR on the network?");
      finish(`ffmpeg exited with code ${code}`);
    });
  });
}

export const streamMonitor = new StreamMonitor();
