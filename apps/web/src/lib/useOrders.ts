"use client";

import { useEffect, useState } from "react";
import { DEMO_ORDERS, type OrderRecord } from "./orders";
import { fetchOrders, fetchShopifyStatus, searchOrder } from "./shipproofApi";

export interface ShopifyConnection {
  state: "loading" | "live" | "demo";
  label: string;
}

/**
 * Orders for the dashboard and the Orders page: live Shopify orders when the API and store are
 * connected, demo orders otherwise. `lookUp` finds an order that isn't in the loaded list.
 */
export function useOrders(limit = 50) {
  const [orders, setOrders] = useState<OrderRecord[]>(DEMO_ORDERS);
  const [shopify, setShopify] = useState<ShopifyConnection>({ state: "loading", label: "Connecting to Shopify…" });
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await fetchShopifyStatus();
        if (cancelled) return;
        if (!status.connected) {
          setShopify({ state: "demo", label: "Demo data · Shopify not connected" });
          return;
        }
        const live = await fetchOrders(limit);
        if (cancelled) return;
        const scopesNote = status.missingScopes?.length ? ` · missing ${status.missingScopes.join(", ")}` : "";
        setShopify({ state: "live", label: `Shopify · ${status.shopName}${scopesNote}` });
        setOrders(live);
      } catch {
        if (!cancelled) setShopify({ state: "demo", label: "Demo data · API not reachable" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  /** Asks Shopify for an order number that isn't in the list. Returns it (and adds it) when found. */
  const lookUp = async (query: string): Promise<OrderRecord | null> => {
    const q = query.trim();
    setSearchMessage(null);
    if (!q || shopify.state !== "live") return null;
    setSearching(true);
    try {
      const found = await searchOrder(q);
      if (!found) {
        setSearchMessage(`No Shopify order ${q.startsWith("#") ? q : `#${q}`}`);
        return null;
      }
      setOrders((prev) => [found, ...prev.filter((o) => o.id !== found.id)]);
      return found;
    } catch (err) {
      setSearchMessage(err instanceof Error ? err.message : "Search failed");
      return null;
    } finally {
      setSearching(false);
    }
  };

  /** Updates one order's status locally, for example when packing starts or finishes. */
  const updateStatus = (orderId: string, status: OrderRecord["status"]) =>
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));

  return { orders, shopify, searching, searchMessage, setSearchMessage, lookUp, updateStatus };
}

/** Case-insensitive match on order number or customer name. */
export function matchesQuery(order: OrderRecord, query: string) {
  const q = query.trim().toLowerCase().replace(/^#/, "");
  if (!q) return true;
  return order.orderNumber.toLowerCase().replace(/^#/, "").includes(q) || order.customerName.toLowerCase().includes(q);
}
