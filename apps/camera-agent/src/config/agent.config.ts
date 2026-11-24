import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const agentConfig = {
  stationId: process.env.STATION_ID || "11111111-1111-1111-1111-111111111111",
  stationApiKey: process.env.STATION_API_KEY || "station_key_hash_01",
  stationName: process.env.STATION_NAME || "Packing Bay 1",
  cloudApiUrl: process.env.CLOUD_API_URL || "http://localhost:4000",
  cloudWsUrl: process.env.CLOUD_WS_URL || "ws://localhost:4000/ws/stations",
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
