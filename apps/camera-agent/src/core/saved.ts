import fs from "fs";
import path from "path";
import crypto from "crypto";
import { agentConfig } from "../config/agent.config.js";
import { agentLogger } from "../utils/localLogger.js";
import {
  listSessionDirs,
  readSession,
  sessionDir,
  writeSession,
} from "./sessionStore.js";
import { probeDurationSeconds, runFfmpeg } from "./review.js";

/**
 * Videos that were already saved can be played again and trimmed from this computer, for as long as a
 * copy is still here: waiting to upload, or kept after upload (KEEP_LOCAL_COPIES). A trimmed video is
 * saved as a new version and uploaded; the newest video of an order is the one that counts.
 */

/** Secret handed only to the dashboard (the browser blocks other websites from reading it). */
export const savedToken = crypto.randomBytes(16).toString("hex");

const clean = (orderNumber: string) => orderNumber.replace(/[^a-zA-Z0-9]/g, "");

/** The newest copy of this order's video that is still on this computer, or null. */
export function findSavedCopy(
  orderNumber: string,
): { file: string; savedAt: number } | null {
  const key = clean(orderNumber);
  if (!key) return null;
  const found: { file: string; savedAt: number }[] = [];

  for (const dir of listSessionDirs()) {
    const s = readSession(dir);
    if (!s || s.status !== "stopped" || clean(s.orderNumber) !== key) continue;
    const file = path.join(dir, s.finalFile || "final.mp4");
    if (fs.existsSync(file))
      found.push({ file, savedAt: fs.statSync(file).mtimeMs });
  }
  const kept = path.join(agentConfig.recordingsDir, "kept");
  if (fs.existsSync(kept)) {
    for (const name of fs.readdirSync(kept)) {
      if (!name.startsWith(`${key}_`) || !name.endsWith(".mp4")) continue;
      const file = path.join(kept, name);
      found.push({ file, savedAt: fs.statSync(file).mtimeMs });
    }
  }
  found.sort((a, b) => b.savedAt - a.savedAt);
  return found[0] ?? null;
}

/** Cuts the saved copy to [start, end] seconds and queues the result for upload as a new version. */
export async function trimSavedCopy(
  orderId: string,
  orderNumber: string,
  req: { start: number; end: number },
) {
  const source = findSavedCopy(orderNumber);
  if (!source)
    throw new Error(
      "The saved video is no longer on this computer, so it can't be trimmed.",
    );
  const duration = probeDurationSeconds(source.file) ?? 0;
  const start = Math.max(0, req.start);
  const end = Math.min(duration, req.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end - start < 0.9)
    throw new Error("The part to keep must be at least one second long.");

  const sessionId = crypto.randomUUID();
  const dir = sessionDir(orderId, sessionId);
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, "final.mp4");
  agentLogger.info(
    `Trimming saved video of Order ${orderNumber}: ${start.toFixed(1)}s to ${end.toFixed(1)}s.`,
  );
  const result = await runFfmpeg(
    [
      "-y",
      "-ss",
      start.toFixed(3),
      "-i",
      source.file,
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
    fs.rmSync(dir, { recursive: true, force: true });
    agentLogger.error(
      `Trimming saved video failed: ${result.stderr.slice(-300)}`,
    );
    throw new Error("Trimming the video failed. The saved video is untouched.");
  }
  const now = new Date().toISOString();
  writeSession(dir, {
    sessionId,
    orderId,
    orderNumber,
    packerId: "dashboard",
    startedAt: now,
    stoppedAt: now,
    status: "stopped",
    finalFile: "final.mp4",
    trimmed: true,
    videoDurationSeconds: end - start,
    durationSeconds: Math.max(1, Math.round(end - start)),
    fileSizeBytes: fs.statSync(out).size,
    attempts: 0,
  });
  return { durationSeconds: end - start };
}
