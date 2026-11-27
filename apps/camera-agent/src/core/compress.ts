import fs from "fs";
import path from "path";
import { agentConfig } from "../config/agent.config.js";
import { agentLogger } from "../utils/localLogger.js";
import { spawnSync } from "child_process";
import { probeDurationSeconds, runFfmpeg } from "./review.js";
import { updateSession, type SessionRecord } from "./sessionStore.js";

/** Picture size, frame rate and codec of a video file, read from ffmpeg's own report. Null when it cannot be read. */
export function probeVideoInfo(file: string): { width: number; height: number; fps: number; codec?: string } | null {
  try {
    const run = spawnSync(agentConfig.ffmpegPath, ["-hide_banner", "-i", file], { timeout: 30_000 });
    const line = /Stream #\d+:\d+[^\n]*?Video:[^\n]*/.exec(run.stderr?.toString() ?? "")?.[0];
    if (!line) return null;
    const size = /,\s*(\d{2,5})x(\d{2,5})[\s,[]/.exec(line);
    const rate = /([\d.]+)\s*fps/.exec(line);
    if (!size || !rate) return null;
    const codec = /Video:\s*(\w+)/.exec(line)?.[1]?.toLowerCase();
    return { width: Number(size[1]), height: Number(size[2]), fps: Math.round(parseFloat(rate[1]) * 100) / 100, codec };
  } catch {
    return null;
  }
}

/**
 * Makes a finished recording much smaller before it is uploaded.
 *
 * While recording, the video is encoded for speed (a fast, loose setting that never drops frames). That
 * leaves it several times larger than it needs to be. Before upload, the finished video is encoded once
 * more with a slower, tighter setting. On a real 3-minute packing recording this took 75 MB down to about
 * 14 MB, with the picture still very close to the original, in about 16 seconds.
 *
 * The compressed copy is only used when it is checked and good: it must play, have the same length and be
 * clearly smaller. Otherwise the original is uploaded, exactly as before. The original stays on disk until the
 * cloud confirms the upload, so a failure at any point loses nothing.
 */
/** The ffmpeg filter that keeps the source frame rate (capped at COMPRESS_FPS) and limits the height. */
function videoFilter(sourceFps: number | undefined) {
  const capFps = sourceFps === undefined || sourceFps > agentConfig.compressFps + 0.5;
  return `${capFps ? `fps=${agentConfig.compressFps},` : ""}scale=-2:'min(ih,${agentConfig.compressMaxHeight})'`;
}

/**
 * H.264 encoding with the upload settings. `preset` is the speed setting: the review copy of an H.265
 * recording uses a fast one, because the packer is waiting for it.
 */
function encodeArgs(input: string, output: string, sourceFps: number | undefined, preset: string) {
  return [
    "-y",
    "-i", input,
    "-an",
    "-vf", videoFilter(sourceFps),
    "-c:v", "libx264",
    "-preset", preset,
    "-crf", String(agentConfig.compressCrf),
    ...(agentConfig.compressMaxKbps > 0
      ? ["-maxrate", `${agentConfig.compressMaxKbps}k`, "-bufsize", `${agentConfig.compressMaxKbps * 2}k`]
      : []),
    "-threads", String(agentConfig.compressThreads),
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    output,
  ];
}

/**
 * A DVR often sends H.265, which many browsers cannot play, so the packer could not review it. Right after
 * the recording stops, such a video is converted once to H.264 with the upload settings. It then serves both
 * the review and the upload (it is marked as already compressed, so it is not encoded a second time).
 * Any other video is left as it is. On failure the original stays, exactly as before.
 */
export async function makeBrowserPlayable(dir: string, session: SessionRecord): Promise<SessionRecord> {
  if (session.mock || session.compressed) return session;
  const input = path.join(dir, session.finalFile || "final.mp4");
  const info = fs.existsSync(input) ? probeVideoInfo(input) : null;
  if (!info || (info.codec !== "hevc" && info.codec !== "h265")) return session;
  const output = path.join(dir, "upload.mp4");
  const inSeconds = probeDurationSeconds(input);
  const started = Date.now();
  agentLogger.info(`Order ${session.orderNumber}: converting the H.265 recording to H.264 so it can be reviewed in the browser...`);
  const result = await runFfmpeg(encodeArgs(input, output, info.fps, "veryfast"), 20 * 60_000);
  const outSeconds = result.ok && fs.existsSync(output) ? probeDurationSeconds(output) : null;
  if (!result.ok || outSeconds === null || (inSeconds && Math.abs(outSeconds - inSeconds) > Math.max(1.5, inSeconds * 0.02))) {
    fs.rmSync(output, { force: true });
    agentLogger.warn(`Order ${session.orderNumber}: H.265 conversion failed; keeping the original (it may not play in the review window).`);
    return session;
  }
  agentLogger.info(`Order ${session.orderNumber}: converted to H.264 in ${((Date.now() - started) / 1000).toFixed(0)}s.`);
  return (
    updateSession(dir, {
      finalFile: "upload.mp4",
      compressed: true,
      originalFileSizeBytes: fs.statSync(input).size,
      fileSizeBytes: fs.statSync(output).size,
      videoDurationSeconds: outSeconds,
    }) ?? session
  );
}

export async function compressForUpload(dir: string, session: SessionRecord): Promise<SessionRecord> {
  if (!agentConfig.compressUpload || session.mock || session.compressed || session.compressSkipped) return session;

  const input = path.join(dir, session.finalFile || "final.mp4");
  const output = path.join(dir, "upload.mp4");
  try {
    if (!fs.existsSync(input)) return session;
    const inSize = fs.statSync(input).size;
    const inSeconds = probeDurationSeconds(input);
    if (!inSeconds || inSeconds < 1) return session;
    const source = probeVideoInfo(input);

    // Optional: an efficient H.264 recording (for example a DVR stream) is uploaded as it is, with no loss.
    const kbps = (inSize * 8) / inSeconds / 1000;
    if (agentConfig.compressSkipBelowKbps > 0 && source?.codec === "h264" && kbps <= agentConfig.compressSkipBelowKbps) {
      agentLogger.info(`Order ${session.orderNumber}: H.264 at ${kbps.toFixed(0)} kbps is within COMPRESS_SKIP_BELOW_KBPS; uploading it as recorded.`);
      return updateSession(dir, { compressSkipped: true }) ?? session;
    }

    fs.rmSync(output, { force: true });
    const started = Date.now();
    const result = await runFfmpeg(
      [
        "-y",
        "-i", input,
        "-an",
        // The camera's own frame rate (never more than COMPRESS_FPS), and never taller than the limit.
        "-vf", videoFilter(source?.fps),
        "-c:v", "libx264",
        "-preset", agentConfig.compressPreset,
        "-crf", String(agentConfig.compressCrf),
        // A ceiling on the data rate, so storage is predictable. The quality setting above still lets quiet scenes be smaller.
        ...(agentConfig.compressMaxKbps > 0
          ? ["-maxrate", `${agentConfig.compressMaxKbps}k`, "-bufsize", `${agentConfig.compressMaxKbps * 2}k`]
          : []),
        // Limit the threads so compressing never starves a recording that is running at the same time.
        "-threads", String(agentConfig.compressThreads),
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        output,
      ],
      20 * 60_000,
    );

    const outSize = fs.existsSync(output) ? fs.statSync(output).size : 0;
    const outSeconds = outSize > 0 ? probeDurationSeconds(output) : null;
    const sameLength = outSeconds !== null && Math.abs(outSeconds - inSeconds) <= Math.max(1.5, inSeconds * 0.02);
    const smaller = outSize > 0 && outSize < inSize * 0.9;

    if (!result.ok || !sameLength || !smaller) {
      fs.rmSync(output, { force: true });
      agentLogger.warn(
        `Order ${session.orderNumber}: compression was not used (${!result.ok ? "ffmpeg failed" : !sameLength ? "length changed" : "not smaller"}); uploading the original.`,
      );
      return updateSession(dir, { compressSkipped: true }) ?? session;
    }

    agentLogger.info(
      `Order ${session.orderNumber}: compressed ${(inSize / 1048576).toFixed(1)} MB to ${(outSize / 1048576).toFixed(1)} MB in ${((Date.now() - started) / 1000).toFixed(0)}s.`,
    );
    return (
      updateSession(dir, {
        finalFile: "upload.mp4",
        compressed: true,
        originalFileSizeBytes: inSize,
        fileSizeBytes: outSize,
        videoDurationSeconds: outSeconds ?? undefined,
      }) ?? session
    );
  } catch (err: any) {
    // Compression is an optimisation. Whatever goes wrong, the original video is still uploaded.
    fs.rmSync(output, { force: true });
    agentLogger.warn(`Order ${session.orderNumber}: compression failed (${err?.message}); uploading the original.`);
    try {
      return updateSession(dir, { compressSkipped: true }) ?? session;
    } catch {
      return session;
    }
  }
}
