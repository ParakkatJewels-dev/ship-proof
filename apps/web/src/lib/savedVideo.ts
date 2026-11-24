import { AGENT_URL } from "./shipproofApi";

/** The part of an order number the camera agent uses to find its saved video ("#10581" becomes "10581"). */
const savedKey = (orderNumber: string) =>
  encodeURIComponent(orderNumber.replace(/^#/, ""));

export interface SavedVideo {
  /** Address to play the video from. */
  url: string;
  token: string;
  durationSeconds: number;
}

/** Finds the saved video of an order on this computer. Null when no copy is kept here any more. */
export async function fetchSavedVideo(
  orderNumber: string,
): Promise<SavedVideo | null> {
  try {
    const res = await fetch(
      `${AGENT_URL}/saved/${savedKey(orderNumber)}/info`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const info = (await res.json()) as {
      token: string;
      durationSeconds: number | null;
    };
    return {
      url: `${AGENT_URL}/saved/${savedKey(orderNumber)}/video.mp4?token=${encodeURIComponent(info.token)}&t=${Date.now()}`,
      token: info.token,
      durationSeconds: info.durationSeconds ?? 0,
    };
  } catch {
    return null;
  }
}

/** Cuts the saved video to [start, end] seconds and uploads the result as the new version. */
export async function trimSavedVideo(
  order: { id: string; orderNumber: string },
  token: string,
  range: { start: number; end: number },
) {
  const res = await fetch(
    `${AGENT_URL}/saved/${savedKey(order.orderNumber)}/trim`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, orderId: order.id, ...range }),
      signal: AbortSignal.timeout(15 * 60_000),
    },
  );
  const body = await res.json().catch(() => null);
  if (!res.ok)
    throw new Error(body?.error || `The camera agent answered ${res.status}`);
}
