import crypto from "crypto";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { agentConfig } from "../config/agent.config.js";
import { agentLogger } from "../utils/localLogger.js";
import { probeDurationSeconds } from "./review.js";
import {
  listParts,
  readSession,
  updateSession,
  type SessionRecord,
} from "./sessionStore.js";

/**
 * Joins a session's video pieces into one final.mp4. Used both when a packer presses Stop and when the
 * agent recovers a recording that was cut off.
 *
 * `status` says what happens next: "review" holds the video for the packer to play, trim and save, and
 * "stopped" (the default) queues it for upload straight away, which is what recovery wants.
 * `interrupted` is true for the recovery case, and the duration is then taken from the last piece
 * written instead of from a stop time.
 */
export function finalizeSession(
  dir: string,
  opts: { interrupted: boolean; status?: "review" | "stopped" },
): SessionRecord {
  const session = readSession(dir);
  if (!session) throw new Error(`No session journal in ${dir}`);

  let parts = listParts(dir);
  if (!session.mock) {
    // A power cut can leave the last piece as an unplayable stub. Drop any piece ffmpeg can't read, so one
    // bad piece never ruins the join.
    const readable = parts.filter((p) => isPlayable(p.file));
    if (readable.length < parts.length) {
      agentLogger.warn(
        `Skipping ${parts.length - readable.length} unreadable video piece(s) left by the interruption.`,
      );
    }
    parts = readable;
  }
  if (parts.length === 0) {
    updateSession(dir, {
      status: "failed",
      interrupted: opts.interrupted,
      lastError: "No video data was recorded",
    });
    throw new Error("No video data was recorded.");
  }

  const finalPath = path.join(dir, "final.mp4");
  if (session.mock) {
    // Simulated recording (no ffmpeg): the pieces are placeholder bytes, so join them directly.
    fs.writeFileSync(
      finalPath,
      Buffer.concat(parts.map((p) => fs.readFileSync(p.file))),
    );
  } else {
    // Even a single piece goes through ffmpeg: the pieces are fragmented MP4, which has no overall length, so
    // the final file is rewritten with a normal index. That is what lets a player show the length and seek.
    const list = path.join(dir, "parts.txt");
    fs.writeFileSync(
      list,
      parts.map((p) => `file '${path.basename(p.file)}'`).join("\n"),
    );
    const run = spawnSync(
      agentConfig.ffmpegPath,
      [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        list,
        "-c",
        "copy",
        "-movflags",
        "+faststart",
        finalPath,
      ],
      { cwd: dir, timeout: 10 * 60_000 },
    );
    if (
      run.status !== 0 ||
      !fs.existsSync(finalPath) ||
      fs.statSync(finalPath).size === 0
    ) {
      // Joining failed: fall back to the first piece rather than losing everything.
      agentLogger.error(
        `Joining video pieces failed (${run.stderr?.toString().slice(-200)}). Using the first piece only.`,
      );
      fs.copyFileSync(parts[0].file, finalPath);
    }
  }

  const startedMs = Date.parse(session.startedAt);
  const endedMs = opts.interrupted
    ? parts[parts.length - 1].mtimeMs
    : Date.now();
  const status = opts.status ?? "stopped";
  const videoSeconds = session.mock ? null : probeDurationSeconds(finalPath);
  const updated = updateSession(dir, {
    status,
    // Also when the camera dropped and came back during the recording: the video has a jump.
    interrupted: opts.interrupted || !!session.gaps?.length,
    stoppedAt: new Date(endedMs).toISOString(),
    durationSeconds: Math.max(1, Math.round((endedMs - startedMs) / 1000)),
    finalFile: path.basename(finalPath),
    fileSizeBytes: fs.statSync(finalPath).size,
    videoDurationSeconds:
      videoSeconds ?? Math.max(1, (endedMs - startedMs) / 1000),
    // A one-time key to play the video while it is in review.
    reviewToken:
      status === "review" ? crypto.randomBytes(16).toString("hex") : undefined,
  });
  return updated!;
}

/** True when ffmpeg can read the whole file. Copies to nowhere, so it is fast even for a long piece. */
function isPlayable(file: string): boolean {
  const run = spawnSync(
    agentConfig.ffmpegPath,
    ["-v", "error", "-i", file, "-c", "copy", "-f", "null", "-"],
    {
      timeout: 60_000,
    },
  );
  return run.status === 0;
}
