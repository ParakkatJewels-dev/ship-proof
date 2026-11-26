"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

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

// The Supabase library is large and only needed for this signal, so it is loaded on first use
// (after the page is up), not as part of every page's code.
let client: Promise<SupabaseClient> | null = null;
const getClient = () => {
  if (!URL || !KEY) return null;
  client ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(URL, KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  );
  return client;
};

/**
 * Calls `onChange` whenever a new order arrives, and once after the connection comes back from a drop
 * (a signal may have been missed meanwhile). Returns a function that stops listening.
 */
export function onOrdersChanged(onChange: () => void): () => void {
  const loading = getClient();
  if (!loading) return () => {};
  let stopped = false;
  let stop = () => {};
  void loading.then((supabase) => {
    if (stopped) return;
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
    stop = () => void supabase.removeChannel(channel);
  });
  return () => {
    stopped = true;
    stop();
  };
}
