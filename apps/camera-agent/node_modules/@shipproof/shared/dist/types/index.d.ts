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
    expiresAt?: string | null;
    deletedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface StationHeartbeat {
    stationId: string;
    status: StationStatus;
    cameraStatus: CameraStatus;
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