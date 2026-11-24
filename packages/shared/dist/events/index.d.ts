export declare const WsEvents: {
    readonly START_RECORDING: "START_RECORDING";
    readonly STOP_RECORDING: "STOP_RECORDING";
    readonly PING: "PING";
    readonly RECORDING_STARTED: "RECORDING_STARTED";
    readonly RECORDING_STOPPED: "RECORDING_STOPPED";
    readonly CAMERA_STATUS_CHANGED: "CAMERA_STATUS_CHANGED";
    readonly UPLOAD_PROGRESS: "UPLOAD_PROGRESS";
    readonly UPLOAD_COMPLETED: "UPLOAD_COMPLETED";
    readonly UPLOAD_FAILED: "UPLOAD_FAILED";
    readonly HEARTBEAT: "HEARTBEAT";
    readonly ERROR: "ERROR";
    readonly STATION_UPDATE: "STATION_UPDATE";
    readonly SESSION_UPDATE: "SESSION_UPDATE";
};
export type WsEventType = (typeof WsEvents)[keyof typeof WsEvents];
/**
 * WebSocket close code the API uses when a camera agent tries to connect while
 * another device is already connected. Only one device may be connected at a time.
 */
export declare const WS_CLOSE_DEVICE_IN_USE = 4009;
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
//# sourceMappingURL=index.d.ts.map