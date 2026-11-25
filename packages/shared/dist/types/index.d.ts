import { StationStatus, CameraStatus, PackingStatus, VideoStatus, DeliveryStatus } from "../enums/index.js";
export interface OrderItem {
    id: string;
    sku: string;
    title: string;
    variantTitle?: string;
    quantity: number;
    price: string;
    imageUrl?: string;
    barcode?: string;
    verified?: boolean;
}
export interface Order {
    id: string;
    shopifyOrderId: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    currency: string;
    totalPrice: string;
    items: OrderItem[];
    fulfillmentStatus: string;
    deliveryStatus: DeliveryStatus;
    deliveredAt?: string | null;
    /** When the order was packed and its video saved. Null until then. */
    packedAt?: string | null;
    /** When the order was marked returned to origin (RTO). Null unless it was. */
    returnedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface PackingStation {
    id: string;
    name: string;
    location: string;
    status: StationStatus;
    cameraStatus: CameraStatus;
    cameraInfo?: {
        deviceIndex?: number;
        name?: string;
        resolution?: string;
        fps?: number;
        rtspUrl?: string;
    };
    currentPackerId?: string;
    currentOrderId?: string;
    lastHeartbeat: string;
    createdAt: string;
}
export interface PackingSession {
    id: string;
    stationId: string;
    orderId: string;
    packerId: string;
    status: PackingStatus;
    startedAt: string;
    completedAt?: string | null;
    verifiedItems: {
        sku: string;
        verified: boolean;
        quantityVerified: number;
        verifiedAt: string;
    }[];
    notes?: string;
}
export interface VideoRecord {
    id: string;
    sessionId: string;
    orderId: string;
    stationId: string;
    storagePath: string;
    fileName: string;
    fileSizeBytes: number;
    durationSeconds: number;
    status: VideoStatus;
    downloadUrl?: string;
    retentionDays: number;
    /** True when the recording was cut off (power or network failure) and only part of it was saved. */
    interrupted?: boolean;
    expiresAt?: string | null;
    deletedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}
/** One video's place in the camera computer's upload queue, for the dashboard's Uploads list. */
export interface UploadItem {
    sessionId: string;
    orderNumber: string;
    /**
     * waiting: queued behind another upload. compressing: being made smaller. uploading: being sent to the cloud.
     * confirming: sent, waiting for the cloud to confirm. retrying: it failed and will be tried again.
     * done: confirmed by the cloud a moment ago.
     */
    state: "waiting" | "compressing" | "uploading" | "confirming" | "retrying" | "done";
    /** Size of the file being sent, in bytes. */
    totalBytes?: number;
    /** Length of the video in seconds. */
    durationSeconds?: number;
    /** Bytes sent so far. Only while uploading. */
    bytesSent?: number;
    /** Why the last attempt failed. Only while retrying. */
    error?: string;
    /** When the next attempt is due. Only while retrying. */
    retryAt?: string;
    /** When the cloud confirmed it. Only for done. */
    finishedAt?: string;
}
export interface StationHeartbeat {
    stationId: string;
    /** Sent by the camera agent so the dashboard can name the connected device. */
    stationName?: string;
    cameraName?: string;
    /** Recordings finished on the station and still waiting for the cloud to confirm them. */
    pendingUploads?: number;
    /** Videos waiting to upload, being uploaded, or uploaded in the last few minutes. */
    uploads?: UploadItem[];
    /** The recording in progress on the device, if any. */
    recording?: {
        sessionId: string;
        orderId: string;
        orderNumber: string;
        startedAt: string;
        previewToken?: string;
    } | null;
    /** A finished recording waiting for the packer to review, trim and save it. */
    review?: {
        sessionId: string;
        orderId: string;
        orderNumber: string;
        reviewToken: string;
        videoSeconds: number;
    } | null;
    status: StationStatus;
    cameraStatus: CameraStatus;
    /** The camera's picture size as measured by the device, for example "1920×1080". */
    resolution?: string;
    fps?: number;
    diskSpaceFreeMb?: number;
    activeSessionId?: string;
    timestamp: string;
}
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}
//# sourceMappingURL=index.d.ts.map