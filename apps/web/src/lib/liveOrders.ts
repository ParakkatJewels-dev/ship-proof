"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * "Orders changed" signals from the ShipProof server, sent when Shopify's order-created webhook
 * arrives. The dashboard reloads its order list only then, instead of checking on a timer.
 *
 * The signal travels over a public Supabase Realtime channel and carries no data at all; the orders
 * themselves are always loaded through the API with the signed-in person's access. Without the two
 * NEXT_PUBLIC_SUPABASE_* settings (local demo mode) there are no signals and nothing happens.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const TOPIC = "shipproof-orders";
const EVENT = "orders-changed";

let client: SupabaseClient | null = null;
const getClient = () => {
  if (!URL || !KEY) return null;
  client ??= createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
};

/**
 * Calls `onChange` whenever a new order arrives, and once after the connection comes back from a drop
 * (a signal may have been missed meanwhile). Returns a function that stops listening.
 */
export function onOrdersChanged(onChange: () => void): () => void {
  const supabase = getClient();
  if (!supabase) return () => {};
  let wasConnected = false;
  const channel = supabase
    .channel(TOPIC)
    .on("broadcast", { event: EVENT }, () => onChange())
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        if (wasConnected) onChange();
        wasConnected = true;
      }
    });
  return () => {
    void supabase.removeChannel(channel);
  };
}
