import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { VideoStatus } from "@shipproof/shared";
import { config } from "../../config/env.config.js";
import { isMockSupabase } from "../../integrations/supabase/db.client.js";
import { storageService } from "../../integrations/supabase/storage.client.js";
import { logger } from "../../utils/logger.js";
import { HttpError } from "../../utils/httpError.js";
import { videoRepository as repo } from "./video.repository.js";
import { toSummary, videoService } from "./video.service.js";

const MIN_CLIP_SECONDS = 1;
const FFMPEG_TIMEOUT_MS = 15 * 60_000;

/** Orders being trimmed right now. Two cuts of the same video at once would overwrite each other. */
const busy = new Set<string>();

function runFfmpeg(args: string[]): Promise<{ ok: boolean; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(config.ffmpegPath, args);
    let stderr = "";
    proc.stderr?.on("data", (d) => (stderr += d.toString()));
    const timer = setTimeout(() => proc.kill("SIGKILL"), FFMPEG_TIMEOUT_MS);
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
 * Cuts an order's stored video down to [start, end] seconds, on the server, so it does not matter whether
 * the original is still on the packing computer. The cut replaces the video in storage; the customer's
 * watch link and the Shopify order stay exactly as they were.
 *
 * Steps: download, cut with ffmpeg (re-encoded, so the cut is exact to the frame), upload the result,
 * check it arrived, point the record at it, then delete the original.
 */
export async function trimOrderVideo(orderId: string, start: number, end: number) {
  if (isMockSupabase) {
    throw new HttpError(501, "Trimming a stored video needs Supabase storage. Connect Supabase first.");
  }
  orderId = await videoService.orderIdForVideos(orderId);
  const video = await repo.findLatestByOrder(orderId);
  if (!video || video.status !== VideoStatus.ACTIVE) throw new HttpError(404, "This order has no saved video to trim.");

  const length = video.durationSeconds;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
    throw new HttpError(400, "Choose a start before the end.");
  }
  const to = Math.min(end, length || end);
  if (to - start < MIN_CLIP_SECONDS) throw new HttpError(400, "The part to keep must be at least one second long.");
  if (start < 0.15 && length > 0 && to >= length - 0.15) throw new HttpError(400, "That keeps the whole video, so there is nothing to trim.");

  if (busy.has(orderId)) throw new HttpError(409, "This video is already being trimmed.");
  busy.add(orderId);

  const work = fs.mkdtempSync(path.join(os.tmpdir(), "shipproof-trim-"));
  try {
    // 1. Download the original.
    const source = path.join(work, "source.mp4");
    const download = await fetch(await storageService.createSignedDownloadUrl(video.storagePath, 600), {
      signal: AbortSignal.timeout(15 * 60_000),
    });
    if (!download.ok || !download.body) throw new HttpError(502, "Could not read the video from storage.");
    await pipeline(Readable.fromWeb(download.body as any), fs.createWriteStream(source));

    // 2. Cut it.
    const output = path.join(work, "trimmed.mp4");
    logger.info(`Trimming video of order ${orderId}: keeping ${start.toFixed(1)}s to ${to.toFixed(1)}s.`);
    const result = await runFfmpeg([
      "-y", "-ss", start.toFixed(3), "-i", source, "-t", (to - start).toFixed(3),
      "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
      "-movflags", "+faststart", output,
    ]);
    if (!result.ok || !fs.existsSync(output) || fs.statSync(output).size === 0) {
      logger.error(`Trimming failed: ${result.stderr.slice(-300)}`);
      throw new HttpError(500, "Trimming the video failed. The saved video is unchanged.");
    }
    const size = fs.statSync(output).size;

    // 3. Upload the result next to the original.
    const newPath = `orders/${orderId}/trim_${Date.now()}.mp4`;
    const upload = await storageService.createSignedUploadUrl(newPath);
    const put = await fetch(upload.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": "video/mp4", "Content-Length": String(size) },
      body: Readable.toWeb(fs.createReadStream(output)) as unknown as BodyInit,
      duplex: "half",
      signal: AbortSignal.timeout(30 * 60_000),
    } as RequestInit);
    if (!put.ok) throw new HttpError(502, `Uploading the trimmed video failed (${put.status}). The saved video is unchanged.`);
    if ((await storageService.statObject(newPath)) === null) {
      throw new HttpError(502, "The trimmed video did not arrive in storage. The saved video is unchanged.");
    }

    // 4. Switch over, then remove the original. If the switch fails the original is still there.
    await repo.update(video.id, {
      storagePath: newPath,
      fileName: path.basename(newPath),
      fileSizeBytes: size,
      durationSeconds: Math.max(1, Math.round(to - start)),
    });
    await storageService.deleteFile(video.storagePath);

    return toSummary((await repo.findLatestByOrder(orderId)) ?? video);
  } finally {
    busy.delete(orderId);
    fs.rmSync(work, { recursive: true, force: true });
  }
}
