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

/** WebSocket hub on the API that relays start/stop commands to the connected camera device. */
export const STATIONS_WS_URL = `${API_URL.replace(/^http/, "ws")}/ws/stations?type=client`;

/** Order as returned by the API (matches Order in @shipproof/shared). */
interface ApiOrder {
  id: string;
  shopifyOrderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  fulfillmentStatus: string;
  deliveryStatus: string;
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
    status: shipped ? "Dispatched" : "Pending",
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
