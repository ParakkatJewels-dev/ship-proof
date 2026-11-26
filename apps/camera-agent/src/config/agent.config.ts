import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const agentConfig = {
  stationId: process.env.STATION_ID || "11111111-1111-1111-1111-111111111111",
  stationApiKey: process.env.STATION_API_KEY || "station_key_hash_01",
  stationName: process.env.STATION_NAME || "Packing Bay 1",
  cloudApiUrl: process.env.CLOUD_API_URL || "http://localhost:4000",
  localHttpPort: parseInt(process.env.LOCAL_HTTP_PORT || "7890", 10),
  cameraDeviceIndex: parseInt(process.env.CAMERA_DEVICE_INDEX || "0", 10),
  cameraDeviceName: process.env.CAMERA_DEVICE_NAME || "Integrated Camera",
  rtspStreamUrl: process.env.RTSP_STREAM_URL,
  recordingsDir: path.resolve(
    process.cwd(),
    process.env.LOCAL_RECORDINGS_DIR || "./recordings",
  ),
  ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
  /** Testing aid: keep a copy of each video in recordings/kept after it uploads. Off by default. */
  keepLocalCopies: process.env.KEEP_LOCAL_COPIES === "true",
  /** Make each finished video smaller before it is uploaded (about 5 times smaller). Set to false to upload as recorded. */
  compressUpload: process.env.COMPRESS_UPLOAD !== "false",
  /** Quality of the compressed video: lower is sharper and larger. 28 looks close to the original. */
  compressCrf: parseInt(process.env.COMPRESS_CRF || "28", 10),
  /** Frames per second of the compressed video. 15 is enough to see what was packed. */
  compressFps: parseInt(process.env.COMPRESS_FPS || "15", 10),
  /**
   * Ceiling on the video's data rate, in kilobits per second. 1000 means a 3-minute video is never more than
   * about 22 MB, however busy the scene. Quiet scenes stay smaller. 0 turns the ceiling off.
   */
  compressMaxKbps: parseInt(process.env.COMPRESS_MAX_KBPS || "1000", 10),
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
