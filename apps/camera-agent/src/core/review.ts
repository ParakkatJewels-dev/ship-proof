import fs from "fs";
import path from "path";
import { spawn, spawnSync } from "child_process";
import { agentConfig } from "../config/agent.config.js";
import { agentLogger } from "../utils/localLogger.js";
import {
  listSessionDirs,
  readSession,
  updateSession,
  type SessionRecord,
} from "./sessionStore.js";

/**
 * After the packer presses Stop, the finished video waits in the "review" state. The packer plays it,
 * optionally trims it, and then saves it (it joins the upload queue) or throws it away (a retake).
 * Nothing is uploaded while a recording is in review.
 */

/** Length of a video file in seconds, read from ffmpeg's own report. Null when it can't be read. */
export function probeDurationSeconds(file: string): number | null {
  const run = spawnSync(agentConfig.ffmpegPath, ["-hide_banner", "-i", file], {
    timeout: 30_000,
  });
  const match = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(
    run.stderr?.toString() ?? "",
  );
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

/** The recording in review with this id, if the key matches. Used by every review route. */
export function findReviewSession(
  sessionId: string,
  token: unknown,
): { dir: string; session: SessionRecord } | null {
  if (typeof token !== "string" || token.length === 0) return null;
  for (const dir of listSessionDirs()) {
    const session = readSession(dir);
    if (
      session &&
      session.sessionId === sessionId &&
      session.status === "review" &&
      session.reviewToken === token
    ) {
      return { dir, session };
    }
  }
  return null;
}

export interface TrimRequest {
  start?: number;
  end?: number;
}

/** True when the request asks for less than the whole video (a small tolerance ignores slider rounding). */
function isTrimmed(req: TrimRequest, duration: number) {
  const start = req.start ?? 0;
  const end = req.end ?? duration;
  return start > 0.15 || end < duration - 0.15;
}

export function runFfmpeg(
  args: string[],
  timeoutMs: number,
): Promise<{ ok: boolean; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(agentConfig.ffmpegPath, args);
    let stderr = "";
    proc.stderr?.on("data", (d) => (stderr += d.toString()));
    const timer = setTimeout(() => proc.kill("SIGKILL"), timeoutMs);
    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, stderr: err.message });
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, stderr });
    });
  });
}

/**
 * Accepts a recording in review: cuts it to the requested part when asked, then queues it for upload.
 * Trimming re-encodes the kept part so the cut is exact to the frame; saving the whole video copies it.
 * Throws, leaving the recording in review, if the request is invalid or the cut fails.
 */
export async function approveSession(
  dir: string,
  req: TrimRequest = {},
): Promise<SessionRecord> {
  const session = readSession(dir);
  if (!session || session.status !== "review")
    throw new Error("This recording is not waiting for review.");

  const file = path.join(dir, session.finalFile || "final.mp4");
  if (!fs.existsSync(file)) throw new Error("The recording file is missing.");
  const duration =
    session.videoDurationSeconds ??
    probeDurationSeconds(file) ??
    session.durationSeconds ??
    0;

  let patch: Partial<SessionRecord> = {};
  const wantsTrim = duration > 0 && isTrimmed(req, duration);

  if (wantsTrim && !session.mock) {
    const start = Math.max(0, req.start ?? 0);
    const end = Math.min(duration, req.end ?? duration);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end - start < 0.9) {
      throw new Error("The part to keep must be at least one second long.");
    }
    const out = path.join(dir, "trimmed.mp4");
    fs.rmSync(out, { force: true });
    agentLogger.info(
      `Trimming Order ${session.orderNumber}: keeping ${start.toFixed(1)}s to ${end.toFixed(1)}s of ${duration.toFixed(1)}s.`,
    );
    const result = await runFfmpeg(
      [
        "-y",
        "-ss",
        start.toFixed(3),
        "-i",
        file,
        "-t",
        (end - start).toFixed(3),
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        out,
      ],
      15 * 60_000,
    );
    if (!result.ok || !fs.existsSync(out) || fs.statSync(out).size === 0) {
      fs.rmSync(out, { force: true });
      agentLogger.error(`Trimming failed: ${result.stderr.slice(-300)}`);
      throw new Error(
        "Trimming the video failed. The recording is untouched; try again or save the whole video.",
      );
    }
    fs.renameSync(out, file);
    patch = {
      trimmed: true,
      videoDurationSeconds: end - start,
      durationSeconds: Math.max(1, Math.round(end - start)),
      fileSizeBytes: fs.statSync(file).size,
    };
  }

  const approved = updateSession(dir, {
    ...patch,
    status: "stopped",
    reviewToken: undefined,
  });
  agentLogger.info(
    `Order ${session.orderNumber} approved${patch.trimmed ? " (trimmed)" : ""}; queued for upload.`,
  );
  return approved!;
}

/** Throws a recording in review away. Nothing is uploaded. */
export function discardSession(dir: string) {
  const session = readSession(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  if (session)
    agentLogger.info(
      `Recording for Order ${session.orderNumber} discarded after review.`,
    );
}

/**
 * Nobody may be there to review a recording (the packer walked away, or the dashboard is on another
 * computer). After this long it is saved as it is, so no video is ever lost waiting for a decision.
 */
export function reviewTimeoutMs() {
  return agentConfig.reviewTimeoutMinutes * 60_000;
}
