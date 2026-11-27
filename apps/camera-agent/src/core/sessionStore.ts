import fs from "fs";
import path from "path";
import { agentConfig } from "../config/agent.config.js";

/**
 * Every recording lives in its own folder under the recordings directory, together with a small
 * session.json journal. The journal is written when recording starts and updated at each step, so
 * after a crash or power cut the agent can tell what was in progress and what still has to upload.
 */
export interface SessionRecord {
  sessionId: string;
  orderId: string;
  orderNumber: string;
  packerId: string;
  startedAt: string;
  /** The ShipProof server (one of CLOUD_API_URL) whose dashboard started this recording; it gets the upload. */
  apiUrl?: string;
  /**
   * recording: in progress (or cut off by a crash).
   * review: finished, waiting for the packer to play, trim and save it. Nothing uploads yet.
   * stopped: approved, waiting to upload.
   * failed: nothing usable.
   */
  status: "recording" | "review" | "stopped" | "failed";
  stoppedAt?: string;
  durationSeconds?: number;
  /** True when the recording was cut off (power cut, crash) instead of stopped normally. */
  interrupted?: boolean;
  /** True when ffmpeg was not available and placeholder data was written. */
  mock?: boolean;
  finalFile?: string;
  /** One-time key to play the recording while it is in review. */
  reviewToken?: string;
  /** Length of the video file in seconds, as read from the file itself. */
  videoDurationSeconds?: number;
  /** True when the packer cut the video down before saving. */
  trimmed?: boolean;
  fileSizeBytes?: number;
  /** True when the video was compressed before upload; finalFile then names the compressed file. */
  compressed?: boolean;
  /** True when compression was tried and not used, so the original is uploaded. */
  compressSkipped?: boolean;
  /** Size of the video before compression. */
  originalFileSizeBytes?: number;
  /**
   * Times the camera stream dropped during the recording and came back (`to`), so a jump in the video is
   * explained. A recording with gaps is marked interrupted.
   */
  gaps?: { from: string; to?: string }[];
  attempts: number;
  nextAttemptAt?: string;
  lastError?: string;
}

const JOURNAL = "session.json";

const safe = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_");

export function sessionDir(orderId: string, sessionId: string) {
  return path.join(
    agentConfig.recordingsDir,
    `${safe(orderId)}_${safe(sessionId)}`,
  );
}

export function readSession(dir: string): SessionRecord | null {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(dir, JOURNAL), "utf8"),
    ) as SessionRecord;
  } catch {
    return null;
  }
}

/** Writes the journal through a temp file and a rename, so a power cut never leaves half a file. */
export function writeSession(dir: string, record: SessionRecord) {
  const file = path.join(dir, JOURNAL);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(record, null, 2));
  fs.renameSync(tmp, file);
}

export function updateSession(
  dir: string,
  patch: Partial<SessionRecord>,
): SessionRecord | null {
  const current = readSession(dir);
  if (!current) return null;
  const next = { ...current, ...patch };
  writeSession(dir, next);
  return next;
}

export function listSessionDirs(): string[] {
  try {
    return fs
      .readdirSync(agentConfig.recordingsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(agentConfig.recordingsDir, d.name))
      .filter((dir) => fs.existsSync(path.join(dir, JOURNAL)));
  } catch {
    return [];
  }
}

/** The video pieces of a session, in order, skipping empty ones. */
export function listParts(
  dir: string,
): { file: string; size: number; mtimeMs: number }[] {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => /^part_\d+\.mp4$/.test(f))
      .sort()
      .map((f) => {
        const file = path.join(dir, f);
        const st = fs.statSync(file);
        return { file, size: st.size, mtimeMs: st.mtimeMs };
      })
      .filter((p) => p.size > 0);
  } catch {
    return [];
  }
}
