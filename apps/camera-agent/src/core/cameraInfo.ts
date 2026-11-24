import { spawn } from "child_process";
import { agentConfig } from "../config/agent.config.js";
import { agentLogger } from "../utils/localLogger.js";

/**
 * What the camera really delivers (picture size and frame rate), read from ffmpeg's own report of the
 * camera it opened. It is sent to the dashboard with every heartbeat, so the "Connected Device" card
 * shows the camera's actual video, not a guess.
 */

export interface CameraInfo {
  /** For example "1920×1080". Undefined until the camera has been seen. */
  resolution?: string;
  fps?: number;
}

let info: CameraInfo = {};

export const getCameraInfo = (): CameraInfo => info;

/** The ffmpeg arguments that open the camera. Shared by recording and by the check below. */
export function cameraInputArgs(): string[] {
  if (agentConfig.rtspStreamUrl)
    return ["-rtsp_transport", "tcp", "-i", agentConfig.rtspStreamUrl];
  return process.platform === "win32"
    ? ["-f", "dshow", "-i", `video=${agentConfig.cameraDeviceName}`]
    : ["-f", "v4l2", "-i", `/dev/video${agentConfig.cameraDeviceIndex}`];
}

/**
 * Reads the camera's picture size and frame rate from ffmpeg's start-up report. Only the input part of
 * the report counts: the later output lines describe our own re-encoded copies, not the camera.
 * Returns true when something was learned.
 */
export function parseStreamInfo(report: string): boolean {
  const start = report.indexOf("Input #0");
  if (start < 0) return false;
  const end = report.indexOf("Output #", start);
  const input = report.slice(start, end < 0 ? undefined : end);
  const line = /Stream #\d+:\d+[^\n]*?Video:[^\n]*/.exec(input)?.[0];
  if (!line) return false;

  const size = /,\s*(\d{3,5})x(\d{3,5})[\s,[]/.exec(line);
  const rate = /([\d.]+)\s*fps/.exec(line);
  if (!size && !rate) return false;

  const next: CameraInfo = { ...info };
  if (size) next.resolution = `${size[1]}×${size[2]}`;
  if (rate) {
    const fps = Math.round(parseFloat(rate[1]));
    if (fps > 0) next.fps = fps;
  }
  if (next.resolution !== info.resolution || next.fps !== info.fps) {
    info = next;
    agentLogger.info(
      `Camera video: ${info.resolution ?? "unknown size"}${info.fps ? ` at ${info.fps} fps` : ""}.`,
    );
  }
  return true;
}

/**
 * Opens the camera for about a second to read its video details. Skipped while recording (the camera is
 * in use, and the recording's own report is read instead). Tries again a few times if the camera is not
 * ready yet, for example when the phone app is still starting.
 */
export function probeCamera(isBusy: () => boolean, attempt = 1) {
  const retry = () => {
    if (attempt < 6) setTimeout(() => probeCamera(isBusy, attempt + 1), 60_000);
  };
  if (info.resolution) return;
  if (isBusy()) return retry();

  let report = "";
  let proc;
  try {
    proc = spawn(agentConfig.ffmpegPath, ["-hide_banner", ...cameraInputArgs(), "-t", "1", "-f", "null", "-"]);
  } catch {
    return;
  }
  const timer = setTimeout(() => proc.kill("SIGKILL"), 15_000);
  proc.stderr?.on("data", (d) => (report += d.toString()));
  proc.on("error", () => {
    clearTimeout(timer);
  });
  proc.on("close", () => {
    clearTimeout(timer);
    if (!parseStreamInfo(report)) retry();
  });
}
