import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { agentConfig } from "../config/agent.config.js";
import { agentLogger } from "../utils/localLogger.js";
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
    const file = path.join(dir, session.finalFile || "final.mp4");
    try {
      if (!fs.existsSync(file)) throw new Error("Recording file is missing");
      const size = fs.statSync(file).size;
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
          body: Readable.toWeb(
            fs.createReadStream(file),
          ) as unknown as BodyInit,
          // Required by Node when the request body is a stream.
          duplex: "half",
          signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
        } as RequestInit);
        if (!putRes.ok)
          throw new Error(`Storage upload failed (${putRes.status})`);
      }

      // 3. Tell the cloud it is done.
      const doneRes = await fetch(
        `${agentConfig.cloudApiUrl}/api/videos/complete`,
        {
          method: "POST",
          headers: stationHeaders,
          body: JSON.stringify({
            orderId: session.orderId,
            sessionId: session.sessionId,
            fileSizeBytes: size,
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
      agentLogger.info(
        `Order ${session.orderNumber} uploaded and confirmed. Local copy removed.`,
      );
    } catch (err: any) {
      const attempts = session.attempts + 1;
      const delay = Math.min(5_000 * 2 ** (attempts - 1), MAX_BACKOFF_MS);
      const reason = err?.cause?.code || err?.message || String(err);
      this.lastError = reason;
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
