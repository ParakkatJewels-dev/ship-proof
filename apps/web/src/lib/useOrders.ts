"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_ORDERS, type OrderRecord } from "./orders";
import { fetchOrders, fetchShopifyStatus, searchOrder } from "./shipproofApi";
import { onOrdersChanged } from "./liveOrders";
import { showToast } from "./alerts";

export interface ShopifyConnection {
  state: "loading" | "live" | "demo";
  label: string;
}

/**
 * Orders for the dashboard and the Orders page: live Shopify orders when the API and store are
 * connected, demo orders otherwise. `lookUp` finds an order that isn't in the loaded list.
 */
export function useOrders(limit = 50) {
  // Empty until the API says what to show: the store's orders, or (local demo mode only) the demo orders.
  // Starting with the demo list made it flash on every page load of the live site.
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [shopify, setShopify] = useState<ShopifyConnection>({
    state: "loading",
    label: "Connecting to Shopify…",
  });
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await fetchShopifyStatus();
        if (cancelled) return;
        if (!status.connected) {
          setShopify({
            state: "demo",
            label: "Demo data · Shopify not connected",
          });
          // The demo orders live in the browser, but an order packed during a test is saved by the API.
          // Show those as Packed, so the status survives a reload just as it will with a real store.
          let packed = new Set<string>();
          try {
            const saved = await fetchOrders(limit);
            packed = new Set(
              saved
                .filter((o) => o.status === "Packed")
                .map((o) => o.orderNumber),
            );
          } catch {
            // Could not read the saved state; show the plain demo list.
          }
          if (!cancelled)
            setOrders(
              DEMO_ORDERS.map((o) =>
                packed.has(o.orderNumber) ? { ...o, status: "Packed" } : o,
              ),
            );
          return;
        }
        const live = await fetchOrders(limit);
        if (cancelled) return;
        const scopesNote = status.missingScopes?.length
          ? ` · missing ${status.missingScopes.join(", ")}`
          : "";
        setShopify({
          state: "live",
          label: `Shopify · ${status.shopName}${scopesNote}`,
        });
        setOrders(live);
      } catch {
        // No made-up orders here: on the live site that would look like real data.
        if (!cancelled)
          setShopify({
            state: "demo",
            label: "Orders unavailable · ShipProof server not reachable",
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  // When Shopify sends a new order, the server signals every open dashboard and the list reloads once.
  // No timer: nothing is fetched until an order actually arrives.
  const live = shopify.state === "live";
  const ordersRef = useRef(orders);
  useEffect(() => {
    ordersRef.current = orders;
  });
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    const reload = async () => {
      try {
        const fresh = await fetchOrders(limit);
        if (cancelled) return;
        const known = new Set(ordersRef.current.map((o) => o.id));
        const added = fresh.filter((o) => !known.has(o.id));
        setOrders(fresh);
        if (added.length)
          void showToast(
            "ok",
            added.length === 1
              ? `${added[0].orderNumber} from ${added[0].customerName}`
              : `${added.length} new orders`,
            "New order",
          );
      } catch {
        // Missed this one; the next signal or page load brings it in.
      }
    };
    const stop = onOrdersChanged(() => void reload());
    return () => {
      cancelled = true;
      stop();
    };
  }, [live, limit]);

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
      // A cancelled order is never added to the list; the caller refuses to pack it.
      if (found.cancelled) {
        setSearchMessage(
          `Order ${found.orderNumber} was cancelled in Shopify.`,
        );
        return found;
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
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
    );

  return {
    orders,
    shopify,
    searching,
    searchMessage,
    setSearchMessage,
    lookUp,
    updateStatus,
  };
}

/** Case-insensitive match on order number or customer name. */
/** True for an order number such as "3012" or "#3012": what a barcode holds, or what a packer types to start packing. */
export function isOrderNumber(query: string) {
  return /^#?\d{3,}$/.test(query.trim());
}

export function matchesQuery(order: OrderRecord, query: string) {
  const q = query.trim().toLowerCase().replace(/^#/, "");
  if (!q) return true;
  return (
    order.orderNumber.toLowerCase().replace(/^#/, "").includes(q) ||
    order.customerName.toLowerCase().includes(q)
  );
}
