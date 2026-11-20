"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentConfig = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
exports.agentConfig = {
    stationId: process.env.STATION_ID || "11111111-1111-1111-1111-111111111111",
    stationApiKey: process.env.STATION_API_KEY || "station_key_hash_01",
    stationName: process.env.STATION_NAME || "Packing Bay 1",
    cloudApiUrl: process.env.CLOUD_API_URL || "http://localhost:4000",
    cloudWsUrl: process.env.CLOUD_WS_URL || "ws://localhost:4000/ws/stations",
    localHttpPort: parseInt(process.env.LOCAL_HTTP_PORT || "7890", 10),
    cameraDeviceIndex: parseInt(process.env.CAMERA_DEVICE_INDEX || "0", 10),
    cameraDeviceName: process.env.CAMERA_DEVICE_NAME || "Integrated Camera",
    rtspStreamUrl: process.env.RTSP_STREAM_URL,
    recordingsDir: path_1.default.resolve(process.cwd(), process.env.LOCAL_RECORDINGS_DIR || "./recordings"),
    ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
};
