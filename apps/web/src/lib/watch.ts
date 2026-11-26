/** One product in the order, as shown on the watch page. */
export interface WatchItem {
  title: string;
  variantTitle?: string;
  quantity: number;
  imageUrl?: string;
}

/** What the API says about a customer watch link. */
export type WatchData =
  | {
      state: "ready";
      orderNumber: string;
      durationSeconds: number;
      playbackUrl: string;
      expiresAt: string | null;
      /** The products in the order. Missing from older API versions. */
      items?: WatchItem[];
      /** Local demo mode: take the products from the dashboard's demo orders. */
      demo?: boolean;
    }
  | { state: "expired"; orderNumber?: string }
  | { state: "unavailable" }
  | { state: "error" };

/** Where the server of this web app reaches the API. It can differ from the browser's address inside a private network. */
const API = (
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000"
).replace(/\/$/, "");

/** The public address the visitor's browser uses, for fetching a fresh playback link. */
export const PUBLIC_API = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/$/, "");

/** Looks up a watch link. Never throws: a failure is reported as the "error" state. */
export async function loadWatch(token: string, base = API): Promise<WatchData> {
  try {
    const res = await fetch(`${base}/api/watch/${encodeURIComponent(token)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const body = await res.json().catch(() => null);
    if (body?.data?.state) return body.data as WatchData;
    return res.status >= 500 ? { state: "error" } : { state: "unavailable" };
  } catch {
    return { state: "error" };
  }
}
