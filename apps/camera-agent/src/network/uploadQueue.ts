import fs from "fs";
import path from "path";
import { Readable, Transform } from "stream";
import type { UploadItem } from "@shipproof/shared";
import { agentConfig } from "../config/agent.config.js";
import { agentLogger } from "../utils/localLogger.js";
import { compressForUpload, probeVideoInfo } from "../core/compress.js";
import { finalizeSession } from "../core/finalize.js";
import { approveSession, reviewTimeoutMs } from "../core/review.js";
import {
  listParts,
  listSessionDirs,
  readSession,
  updateSession,
  type SessionRecord,
} from "../core/sessionStore.js";

const CHECK_INTERVAL_MS = 15_000;
const MAX_BACKOFF_MS = 5 * 60_000;
const UPLOAD_TIMEOUT_MS = 30 * 60_000;

const stationHeaders = {
  "Content-Type": "application/json",
  "X-Station-Id": agentConfig.stationId,
  "X-Station-Key": agentConfig.stationApiKey,
};

/**
 * Recordings waiting to be uploaded. Everything lives on disk, so the queue survives restarts and power cuts.
 * A recording is deleted from the computer only after the cloud confirms it. Failures are retried
 * with growing delays (5s, 10s, 20s ... up to 5 minutes), forever, until the upload succeeds.
 */
export class UploadQueue {
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  /** Most recent upload error, for the status endpoint. */
  lastError: string | null = null;
  /** What the queue is doing right now: one video at a time. */
  private active: UploadItem | null = null;
  /** Videos confirmed by the cloud in the last few minutes, so the dashboard can show them as done. */
  private recentlyDone: UploadItem[] = [];
  /** Called when the list changes, so the dashboard hears about progress at once instead of every 10 seconds. */
  onChange: (() => void) | null = null;
  private lastNotify = 0;

  private notify(force = false) {
    const now = Date.now();
    if (!force && now - this.lastNotify < 800) return;
    this.lastNotify = now;
    this.onChange?.();
  }

  /**
   * Every video the dashboard should list: the one being worked on, those waiting (or waiting to retry), and
   * those finished in the last three minutes. Read from disk each time, so it is right after a restart too.
   */
  snapshot(): UploadItem[] {
    const items: UploadItem[] = [];
    if (this.active) items.push({ ...this.active });
    for (const s of this.pending()) {
      if (s.sessionId === this.active?.sessionId) continue;
      const retryAt = s.nextAttemptAt && Date.parse(s.nextAttemptAt) > Date.now() ? s.nextAttemptAt : undefined;
      items.push({
        sessionId: s.sessionId,
        orderNumber: s.orderNumber,
        state: retryAt ? "retrying" : "waiting",
        totalBytes: s.fileSizeBytes,
        durationSeconds: s.durationSeconds,
        ...(retryAt ? { retryAt, error: s.lastError } : {}),
      });
    }
    const cutoff = Date.now() - 3 * 60_000;
    this.recentlyDone = this.recentlyDone.filter((d) => Date.parse(d.finishedAt ?? "") > cutoff);
    return [...items, ...this.recentlyDone];
  }

  start() {
    this.timer = setInterval(() => this.kick(), CHECK_INTERVAL_MS);
    this.kick();
  }

  /** Looks for work now. Safe to call at any time; only one run happens at once. */
  kick() {
    if (this.running) return;
    this.running = true;
    this.processAll()
      .catch((err) => agentLogger.error("Upload queue error:", err.message))
      .finally(() => {
        this.running = false;
      });
  }

  /** Sessions finished recording and still waiting for the cloud to confirm them. */
  pending(): SessionRecord[] {
    return listSessionDirs()
      .map((d) => readSession(d))
      .filter((r): r is SessionRecord => !!r && r.status === "stopped");
  }

  /** The recording waiting for the packer to review it, if any. */
  reviewing(): SessionRecord | null {
    return (
      listSessionDirs()
        .map((d) => readSession(d))
        .find((r): r is SessionRecord => !!r && r.status === "review") ?? null
    );
  }

  private async processAll() {
    // A recording nobody reviewed in time is saved as it is, so no video is lost waiting for a decision.
    for (const dir of listSessionDirs()) {
      const session = readSession(dir);
      if (
        session?.status === "review" &&
        Date.now() - Date.parse(session.stoppedAt ?? session.startedAt) >
          reviewTimeoutMs()
      ) {
        agentLogger.warn(
          `Order ${session.orderNumber} was not reviewed in time; saving it untrimmed.`,
        );
        try {
          await approveSession(dir);
        } catch (err: any) {
          agentLogger.error(
            `Could not save Order ${session.orderNumber} automatically: ${err.message}`,
          );
        }
      }
    }
    for (const dir of listSessionDirs()) {
      const session = readSession(dir);
      if (!session || session.status !== "stopped") continue;
      if (
        session.nextAttemptAt &&
        Date.now() < Date.parse(session.nextAttemptAt)
      )
        continue;
      await this.uploadOne(dir, session);
    }
  }

  private async uploadOne(dir: string, session: SessionRecord) {
    // Smaller before upload. Never throws: on any problem the original video is uploaded.
    const willCompress = agentConfig.compressUpload && !session.mock && !session.compressed && !session.compressSkipped;
    this.active = { sessionId: session.sessionId, orderNumber: session.orderNumber, state: willCompress ? "compressing" : "uploading", totalBytes: session.fileSizeBytes, durationSeconds: session.durationSeconds };
    this.notify(true);
    session = await compressForUpload(dir, session);
    const file = path.join(dir, session.finalFile || "final.mp4");
    try {
      if (!fs.existsSync(file)) throw new Error("Recording file is missing");
      const size = fs.statSync(file).size;
      this.active = { sessionId: session.sessionId, orderNumber: session.orderNumber, state: "uploading", totalBytes: size, bytesSent: 0, durationSeconds: session.durationSeconds };
      this.notify(true);
      agentLogger.info(
        `Uploading Order ${session.orderNumber} (${size} bytes, attempt ${session.attempts + 1})${session.interrupted ? " [interrupted recording]" : ""}...`,
      );

      // 1. Ask the cloud where to upload.
      const urlRes = await fetch(
        `${agentConfig.cloudApiUrl}/api/videos/upload-url`,
        {
          method: "POST",
          headers: stationHeaders,
          body: JSON.stringify({
            orderId: session.orderId,
            sessionId: session.sessionId,
            stationId: agentConfig.stationId,
            orderNumber: session.orderNumber,
            recordedAt: session.startedAt,
            fileName: `${session.sessionId}.mp4`,
          }),
          signal: AbortSignal.timeout(30_000),
        },
      );
      if (!urlRes.ok)
        throw new Error(`Could not get an upload address (${urlRes.status})`);
      const { data: upload } = (await urlRes.json()) as {
        data: { signedUrl: string };
      };

      // 2. Send the file as a stream, so a long video is never loaded into memory.
      if (!upload.signedUrl.includes("mock-storage")) {
        const putRes = await fetch(upload.signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "video/mp4",
            "Content-Length": String(size),
          },
          // The file is counted as it is read, so the dashboard can show how much has been sent.
          body: Readable.toWeb(
            fs.createReadStream(file).pipe(
              new Transform({
                transform: (chunk, _encoding, done) => {
                  if (this.active) {
                    this.active.bytesSent = (this.active.bytesSent ?? 0) + chunk.length;
                    this.notify();
                  }
                  done(null, chunk);
                },
              }),
            ),
          ) as unknown as BodyInit,
          // Required by Node when the request body is a stream.
          duplex: "half",
          signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
        } as RequestInit);
        if (!putRes.ok)
          throw new Error(`Storage upload failed (${putRes.status})`);
      }

      // 3. Tell the cloud it is done.
      if (this.active) this.active = { ...this.active, state: "confirming", bytesSent: size };
      this.notify(true);
      const doneRes = await fetch(
        `${agentConfig.cloudApiUrl}/api/videos/complete`,
        {
          method: "POST",
          headers: stationHeaders,
          body: JSON.stringify({
            orderId: session.orderId,
            sessionId: session.sessionId,
            fileSizeBytes: size,
            // The size and speed of the file actually being stored (after compression).
            ...(probeVideoInfo(file) ?? {}),
            durationSeconds: session.durationSeconds ?? 0,
            interrupted: !!session.interrupted,
          }),
          signal: AbortSignal.timeout(30_000),
        },
      );
      if (!doneRes.ok)
        throw new Error(`Cloud did not confirm the video (${doneRes.status})`);

      // 4. Only now is it safe to delete the local copy (unless KEEP_LOCAL_COPIES is on, for testing).
      if (agentConfig.keepLocalCopies) {
        const keptDir = path.join(agentConfig.recordingsDir, "kept");
        fs.mkdirSync(keptDir, { recursive: true });
        fs.copyFileSync(
          file,
          path.join(
            keptDir,
            `${session.orderNumber.replace(/[^a-zA-Z0-9]/g, "")}_${session.sessionId.slice(0, 8)}.mp4`,
          ),
        );
      }
      fs.rmSync(dir, { recursive: true, force: true });
      this.lastError = null;
      this.recentlyDone.unshift({
        sessionId: session.sessionId,
        orderNumber: session.orderNumber,
        state: "done",
        totalBytes: size,
        durationSeconds: session.durationSeconds,
        finishedAt: new Date().toISOString(),
      });
      this.recentlyDone = this.recentlyDone.slice(0, 5);
      this.active = null;
      this.notify(true);
      agentLogger.info(
        `Order ${session.orderNumber} uploaded and confirmed. Local copy removed.`,
      );
    } catch (err: any) {
      const attempts = session.attempts + 1;
      const delay = Math.min(5_000 * 2 ** (attempts - 1), MAX_BACKOFF_MS);
      const reason = err?.cause?.code || err?.message || String(err);
      this.lastError = reason;
      this.active = null;
      this.notify(true);
      updateSession(dir, {
        attempts,
        lastError: reason,
        nextAttemptAt: new Date(Date.now() + delay).toISOString(),
      });
      agentLogger.warn(
        `Upload of Order ${session.orderNumber} failed (${reason}). The recording is kept on this computer; retrying in ${Math.round(delay / 1000)}s.`,
      );
    }
  }
}

/**
 * Run once at startup. Recordings still marked "recording" were cut off (power cut, crash, closed
 * window). Close them properly, keep what was captured, and queue them for upload as "interrupted".
 */
export function recoverInterruptedSessions() {
  for (const dir of listSessionDirs()) {
    const session = readSession(dir);
    if (!session || session.status !== "recording") continue;
    agentLogger.warn(
      `Found an unfinished recording for Order ${session.orderNumber}. Recovering what was saved...`,
    );
    try {
      const recovered = finalizeSession(dir, { interrupted: true });
      agentLogger.info(
        `Recovered Order ${session.orderNumber}: ${recovered.durationSeconds}s, ${recovered.fileSizeBytes} bytes. Queued for upload.`,
      );
    } catch (err: any) {
      agentLogger.error(
        `Could not recover Order ${session.orderNumber}: ${err.message}. Files are kept in ${dir}.`,
      );
    }
  }
  for (const dir of listSessionDirs()) {
    const s = readSession(dir);
    // A restart usually means something changed (internet back, power restored), so try again right
    // away instead of waiting out a retry delay that was set before the restart.
    if (s?.status === "stopped" && s.nextAttemptAt)
      updateSession(dir, { nextAttemptAt: undefined });
    // Make sure nothing is left pointing at a file that no longer exists.
    if (
      s?.status === "stopped" &&
      listParts(dir).length === 0 &&
      !fs.existsSync(path.join(dir, s.finalFile || "final.mp4"))
    ) {
      updateSession(dir, {
        status: "failed",
        lastError: "Recording file is missing",
      });
    }
  }
}

export const uploadQueue = new UploadQueue();
