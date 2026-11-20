import { CameraStatus, StationStatus } from "../enums/index.js";
import { StationHeartbeat } from "../types/index.js";

export const WsEvents = {
  // Cloud -> Camera Agent
  START_RECORDING: "START_RECORDING",
  STOP_RECORDING: "STOP_RECORDING",
  PING: "PING",

  // Camera Agent -> Cloud
  RECORDING_STARTED: "RECORDING_STARTED",
  RECORDING_STOPPED: "RECORDING_STOPPED",
  CAMERA_STATUS_CHANGED: "CAMERA_STATUS_CHANGED",
  UPLOAD_PROGRESS: "UPLOAD_PROGRESS",
  UPLOAD_COMPLETED: "UPLOAD_COMPLETED",
  UPLOAD_FAILED: "UPLOAD_FAILED",
  HEARTBEAT: "HEARTBEAT",
  ERROR: "ERROR",

  // Cloud -> Packer / Admin Frontend
  STATION_UPDATE: "STATION_UPDATE",
  SESSION_UPDATE: "SESSION_UPDATE",
} as const;

export type WsEventType = (typeof WsEvents)[keyof typeof WsEvents];

export interface StartRecordingPayload {
  stationId: string;
  orderId: string;
  orderNumber: string;
  sessionId: string;
  packerId: string;
}

export interface StopRecordingPayload {
  stationId: string;
  sessionId: string;
  orderId: string;
}

export interface RecordingStartedPayload {
  stationId: string;
  sessionId: string;
  orderId: string;
  startedAt: string;
}

export interface RecordingStoppedPayload {
  stationId: string;
  sessionId: string;
  orderId: string;
  durationSeconds: number;
  filePath: string;
  fileSizeBytes: number;
}

export interface UploadCompletedPayload {
  stationId: string;
  sessionId: string;
  orderId: string;
  storagePath: string;
  durationSeconds: number;
  fileSizeBytes: number;
}

export interface WsMessage<T = any> {
  event: WsEventType;
  payload: T;
  timestamp: string;
}
