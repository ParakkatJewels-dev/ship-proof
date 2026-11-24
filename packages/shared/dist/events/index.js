"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WS_CLOSE_DEVICE_IN_USE = exports.WsEvents = void 0;
exports.WsEvents = {
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
};
/**
 * WebSocket close code the API uses when a camera agent tries to connect while
 * another device is already connected. Only one device may be connected at a time.
 */
exports.WS_CLOSE_DEVICE_IN_USE = 4009;
//# sourceMappingURL=index.js.map