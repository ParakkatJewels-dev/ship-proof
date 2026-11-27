import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const agentConfig = {
  stationId: process.env.STATION_ID || "11111111-1111-1111-1111-111111111111",
  stationApiKey: process.env.STATION_API_KEY || "station_key_hash_01",
  stationName: process.env.STATION_NAME || "Packing Bay 1",
  /**
   * ShipProof servers this device reports to, comma separated, for example
   * "http://localhost:4000,https://ship-proof-api-chi.vercel.app" to use one camera with both the local
   * test site and the live site. Each recording is uploaded to the server whose dashboard started it.
   */
  cloudApiUrls: (process.env.CLOUD_API_URL || "http://localhost:4000")
    .split(",")
    .map((u) => u.trim().replace(/\/+$/, ""))
    .filter(Boolean),
  /** The first server in CLOUD_API_URL: used when a recording does not say which server it belongs to. */
  get cloudApiUrl(): string {
    return this.cloudApiUrls[0] ?? "http://localhost:4000";
  },
  localHttpPort: parseInt(process.env.LOCAL_HTTP_PORT || "7890", 10),
  cameraDeviceIndex: parseInt(process.env.CAMERA_DEVICE_INDEX || "0", 10),
  cameraDeviceName: process.env.CAMERA_DEVICE_NAME || "Integrated Camera",
  rtspStreamUrl: process.env.RTSP_STREAM_URL,
  /** RTSP (DVR / IP camera): seconds without video before the connection is given up and retried. */
  rtspTimeoutSeconds: parseInt(process.env.RTSP_TIMEOUT_SECONDS || "10", 10),
  /** RTSP: how often, in seconds, the stream is checked while nothing is recording. */
  rtspCheckSeconds: parseInt(process.env.RTSP_CHECK_SECONDS || "30", 10),
  recordingsDir: path.resolve(
    process.cwd(),
    process.env.LOCAL_RECORDINGS_DIR || "./recordings",
  ),
  ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
  /** Testing aid: keep a copy of each video in recordings/kept after it uploads. Off by default. */
  keepLocalCopies: process.env.KEEP_LOCAL_COPIES === "true",
  /** Make each finished video smaller before it is uploaded (about 5 times smaller). Set to false to upload as recorded. */
  compressUpload: process.env.COMPRESS_UPLOAD !== "false",
  /**
   * Quality of the compressed video: lower is sharper and larger. 28 looks close to the original for a
   * webcam; a DVR / IP camera (RTSP) defaults to 23, to keep labels and barcodes readable at 1080p.
   */
  compressCrf: parseInt(process.env.COMPRESS_CRF || (process.env.RTSP_STREAM_URL ? "23" : "28"), 10),
  /**
   * Highest frame rate of the compressed video. A camera that delivers fewer (a DVR usually sends 25) keeps
   * its own rate: frames are never duplicated. 15 halved the size but looked jerky.
   */
  compressFps: parseInt(process.env.COMPRESS_FPS || "30", 10),
  /**
   * Ceiling on the video's data rate, in kilobits per second. 1000 means a 3-minute video is never more than
   * about 22 MB, however busy the scene. Quiet scenes stay smaller. 0 turns the ceiling off.
   */
  compressMaxKbps: parseInt(process.env.COMPRESS_MAX_KBPS || (process.env.RTSP_STREAM_URL ? "3000" : "1000"), 10),
  /**
   * Optional: upload an H.264 recording as it is (no re-encoding, no quality loss) when its average data
   * rate is at most this many kilobits per second. 0 (the default) always compresses.
   */
  compressSkipBelowKbps: parseInt(process.env.COMPRESS_SKIP_BELOW_KBPS || "0", 10),
  /** Tallest picture kept, in pixels. A 720p or 1080p camera is left as it is; anything bigger (for example 4K) is reduced to this. */
  compressMaxHeight: parseInt(process.env.COMPRESS_MAX_HEIGHT || "1080", 10),
  /** ffmpeg speed setting: slower is smaller but takes longer. */
  compressPreset: process.env.COMPRESS_PRESET || "medium",
  /** CPU threads used for compressing, kept low so a recording in progress is not disturbed. */
  compressThreads: parseInt(process.env.COMPRESS_THREADS || "2", 10),
  /** Live preview on the dashboard: pictures per second and width in pixels. More pictures per second looks smoother. */
  previewFps: parseInt(process.env.PREVIEW_FPS || "25", 10),
  previewWidth: parseInt(process.env.PREVIEW_WIDTH || "640", 10),
  /** A recording nobody reviews is saved untrimmed after this many minutes, so no video is lost waiting. */
  reviewTimeoutMinutes: parseFloat(process.env.REVIEW_TIMEOUT_MINUTES || "15"),
  /** Video is saved in pieces this long, so a power cut loses at most the last piece. */
  segmentSeconds: parseInt(process.env.SEGMENT_SECONDS || "60", 10),
  /** A recording stops by itself after this long, in case nobody presses Stop. */
  maxRecordingMinutes: parseFloat(process.env.MAX_RECORDING_MINUTES || "30"),
  /** Refuse to start a recording when the disk has less free space than this. */
  minFreeDiskMb: parseInt(process.env.MIN_FREE_DISK_MB || "1024", 10),
};
