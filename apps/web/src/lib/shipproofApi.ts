import type { OrderRecord } from "./orders";

/** Base URL of the ShipProof API (apps/api). Set NEXT_PUBLIC_API_URL in apps/web/.env.local to override. */
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/$/, "");

/** The camera agent running on this computer. Used to stop a recording when the server can't be reached. */
export const AGENT_URL = (
  process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:7890"
).replace(/\/$/, "");

/** Where the recorded video can be played while it waits for review. Served by the camera agent on this computer. */
export const reviewVideoUrl = (sessionId: string, token: string) =>
  `${AGENT_URL}/review/${encodeURIComponent(sessionId)}.mp4?token=${encodeURIComponent(token)}`;

/** Order as returned by the API (matches Order in @shipproof/shared). */
interface ApiOrder {
  id: string;
  shopifyOrderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  fulfillmentStatus: string;
  deliveryStatus: string;
  /** When the order was packed and its video saved. Kept by the server, so it survives a reload. */
  packedAt?: string | null;
  createdAt: string;
  items: {
    id: string;
    title: string;
    variantTitle?: string;
    quantity: number;
    imageUrl?: string;
  }[];
}

export interface ShopifyStatus {
  connected: boolean;
  mode: "client_credentials" | "admin_token" | "mock";
  shopName?: string;
  shopDomain?: string;
  missingScopes?: string[];
  reason?: string;
}

import { authFetch } from "./auth";

async function getJson<T>(path: string, timeoutMs = 15000): Promise<T> {
  const res = await authFetch(`${API_URL}${path}`, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body.data as T;
}

const dateLabel = (d: Date) =>
  d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function toOrderRecord(o: ApiOrder): OrderRecord {
  const created = new Date(o.createdAt);
  const shipped =
    o.fulfillmentStatus === "fulfilled" || o.deliveryStatus === "DELIVERED";
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    customerPhone: "",
    customerEmail: o.customerEmail,
    itemCount: o.items.reduce((sum, it) => sum + it.quantity, 0),
    placedTime: created.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    placedDate: dateLabel(created),
    // Packed is decided by the server (a saved video), so it is still true after a reload or a shipment.
    status: o.packedAt ? "Packed" : shipped ? "Dispatched" : "Pending",
    cancelled: o.fulfillmentStatus === "cancelled",
    thumbnailUrl: o.items.find((it) => it.imageUrl)?.imageUrl || "",
    items: o.items.map((it) => ({
      id: it.id,
      name: it.variantTitle ? `${it.title} (${it.variantTitle})` : it.title,
      quantity: it.quantity,
      imageUrl: it.imageUrl || "",
    })),
  };
}

export const fetchShopifyStatus = () =>
  getJson<ShopifyStatus>("/api/shopify/status");

/** One video's place in the camera computer's upload queue. */
export interface UploadItem {
  sessionId: string;
  orderNumber: string;
  state:
    | "waiting"
    | "compressing"
    | "uploading"
    | "confirming"
    | "retrying"
    | "done";
  totalBytes?: number;
  /** Length of the video in seconds. */
  durationSeconds?: number;
  bytesSent?: number;
  error?: string;
  retryAt?: string;
  finishedAt?: string;
}

/** The single camera device connected to ShipProof. Only one device can be connected at a time. */
export type ActiveDevice =
  | { connected: false }
  | {
      connected: true;
      stationId: string;
      stationName: string;
      location: string;
      cameraName: string;
      resolution?: string;
      fps?: number;
      cameraStatus: "CONNECTED" | "RECORDING" | "DISCONNECTED" | "ERROR";
      /** Recordings finished on the station and still waiting to upload. */
      pendingUploads?: number;
      /** Every video waiting to upload, being uploaded, or uploaded in the last few minutes. */
      uploads?: UploadItem[];
      /** The recording the device is running right now. */
      /** A finished recording waiting to be reviewed, trimmed and saved. */
      review?: {
        sessionId: string;
        orderId: string;
        orderNumber: string;
        reviewToken: string;
        videoSeconds: number;
      } | null;
      recording?: {
        sessionId: string;
        orderId: string;
        orderNumber: string;
        startedAt: string;
        previewToken?: string;
      } | null;
      connectedAt: string;
      lastHeartbeat: string;
    };

export const fetchActiveDevice = () =>
  getJson<ActiveDevice>("/api/stations/active-device");

export async function fetchOrders(limit = 25): Promise<OrderRecord[]> {
  const orders = await getJson<ApiOrder[]>(`/api/orders?limit=${limit}`);
  return orders.map(toOrderRecord);
}

/** Looks up one order by number in Shopify. Returns null when it doesn't exist. */
export async function searchOrder(query: string): Promise<OrderRecord | null> {
  try {
    const order = await getJson<ApiOrder>(
      `/api/orders/search/${encodeURIComponent(query.trim().replace(/^#/, ""))}`,
    );
    return toOrderRecord(order);
  } catch (err) {
    if (err instanceof Error && /not found/i.test(err.message)) return null;
    throw err;
  }
}

/** One saved video in the recent list: just what the dashboard totals need. */
export interface VideoListItem {
  status: string;
  durationSeconds: number;
  recordedAt: string;
}

/** The most recent saved videos, newest first. */
export const fetchVideoList = () => getJson<VideoListItem[]>("/api/videos");

/** What the dashboard may know about an order's stored video. Never includes a storage address. */
export interface VideoProperties {
  status: string;
  durationSeconds: number;
  fileSizeBytes: number;
  /** When the packer started recording (or, for older videos, when the upload began). */
  recordedAt: string;
  /** Picture size and frame rate of the stored video. Null for videos saved before these were kept. */
  width: number | null;
  height: number | null;
  fps: number | null;
  expiresAt: string | null;
  interrupted: boolean;
}

/** The stored video of an order, or null when there is none. */
export async function fetchVideoProperties(
  orderId: string,
): Promise<VideoProperties | null> {
  try {
    return await getJson<VideoProperties>(
      `/api/videos/order/${encodeURIComponent(orderId)}`,
    );
  } catch {
    return null;
  }
}

/** A temporary address to play an order's stored video, made fresh by the server. */
export interface CloudPlayback {
  url: string;
  durationSeconds: number;
}

/** The order's stored video, or null when it has none (or none that can be played). */
export async function fetchCloudPlayback(
  orderId: string,
): Promise<CloudPlayback | null> {
  try {
    return await getJson<CloudPlayback>(
      `/api/videos/order/${encodeURIComponent(orderId)}/playback`,
    );
  } catch {
    return null;
  }
}

/** A temporary address that saves the order's stored video as a file. Throws with a readable reason. */
export async function fetchVideoDownload(
  orderId: string,
): Promise<{ url: string; fileName: string }> {
  return getJson<{ url: string; fileName: string }>(
    `/api/videos/order/${encodeURIComponent(orderId)}/download`,
  );
}

/** A new link that opens the order's video in any browser without signing in. */
export interface ShareLink {
  url: string;
  /** When the video (and so the link) will be deleted; null until the order is delivered. */
  expiresAt: string | null;
}

/** Makes a new share link for the order's video. Throws with a readable reason. */
export async function createShareLink(orderId: string): Promise<ShareLink> {
  const res = await authFetch(
    `${API_URL}/api/videos/order/${encodeURIComponent(orderId)}/share`,
    { method: "POST", signal: AbortSignal.timeout(15_000) },
  );
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success)
    throw new Error(body?.error || `The server answered ${res.status}`);
  return body.data as ShareLink;
}

/** Cuts the stored video to [start, end] seconds on the server. The customer's link keeps working. */
export async function trimCloudVideo(
  orderId: string,
  range: { start: number; end: number },
) {
  const res = await authFetch(
    `${API_URL}/api/videos/order/${encodeURIComponent(orderId)}/trim`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(range),
      signal: AbortSignal.timeout(20 * 60_000),
    },
  );
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success)
    throw new Error(body?.error || `The server answered ${res.status}`);
}
