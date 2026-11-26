import { config } from "../../config/env.config.js";
import { isMockSupabase } from "./db.client.js";
import { logger } from "../../utils/logger.js";

/** The Supabase Realtime channel open dashboards listen on for "orders changed" signals. */
export const ORDERS_TOPIC = "shipproof-orders";
export const ORDERS_CHANGED_EVENT = "orders-changed";

/**
 * Tells every open dashboard that a new Shopify order has arrived, so it reloads its order list once,
 * right away, instead of checking on a timer. Triggered by Shopify's order-created webhook.
 *
 * Sent through Supabase Realtime's broadcast endpoint, because a serverless API cannot hold
 * connections to browsers itself. The channel is public (no database rule needed), so the message
 * carries nothing at all: no order number, no customer, no data. The dashboard then loads the orders
 * through the API with the person's own sign-in, as usual.
 *
 * Never throws: a missed signal only means the order shows up on the next page load.
 */
export async function announceOrdersChanged(): Promise<void> {
  if (isMockSupabase) return;
  try {
    const res = await fetch(`${config.supabase.url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.supabase.serviceKey,
        Authorization: `Bearer ${config.supabase.serviceKey}`,
      },
      body: JSON.stringify({
        messages: [{ topic: ORDERS_TOPIC, event: ORDERS_CHANGED_EVENT, payload: {}, private: false }],
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) logger.warn(`Could not signal open dashboards about a new order (${res.status}).`);
  } catch (err: any) {
    logger.warn(`Could not signal open dashboards about a new order: ${err.message}`);
  }
}
