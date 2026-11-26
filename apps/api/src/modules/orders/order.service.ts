import { supabase, isMockSupabase } from "../../integrations/supabase/db.client.js";
import { shopifyClient } from "../../integrations/shopify/shopify.client.js";
import { Order, DeliveryStatus } from "@shipproof/shared";
import { logger } from "../../utils/logger.js";
import { devMap } from "../../utils/devData.js";

// In-memory fallback orders for development
const mockOrdersStore = new Map<string, Order>();
/** Orders packed while no database is connected, by order id. Shopify also keeps this on the order itself. */
const mockPacked = devMap<string>("packed-orders", isMockSupabase);

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID = UUID_PATTERN;

/** Who an order is in each system: the database id, the Shopify id and the number the customer sees. */
export interface OrderIdentity {
  /** Database id. Null when no database is connected. */
  id: string | null;
  shopifyOrderId: string;
  orderNumber: string;
}

function rowToOrder(d: any): Order {
  return {
    id: d.id,
    shopifyOrderId: d.shopify_order_id,
    orderNumber: d.order_number,
    customerName: d.customer_name,
    customerEmail: d.customer_email,
    currency: d.currency,
    totalPrice: String(d.total_price),
    items: d.items,
    fulfillmentStatus: d.fulfillment_status,
    deliveryStatus: d.delivery_status as DeliveryStatus,
    deliveredAt: d.delivered_at,
    packedAt: d.packed_at ?? null,
    returnedAt: d.returned_at ?? null,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

export class OrderService {
  /**
   * Find order by number (e.g. #1042 or 1042) or UUID.
   * With a database, the returned id is always the database id, because that is what videos refer to.
   */
  async getOrder(orderNumberOrId: string): Promise<Order | null> {
    const cleanNumber = orderNumberOrId.trim().replace(/^#/, "");

    // 1. Check in-memory store if mock
    if (isMockSupabase) {
      // A connected store is always asked fresh; the cache only serves demo mode.
      if (shopifyClient.isMock && mockOrdersStore.has(cleanNumber)) {
        return this.withMockPacked(mockOrdersStore.get(cleanNumber)!);
      }
      // Fetch from Shopify mock client and cache
      const order = await shopifyClient.getOrder(cleanNumber);
      if (order) {
        mockOrdersStore.set(cleanNumber, order);
        return this.withMockPacked(order);
      }
      return null;
    }

    // 2. Query Supabase. Match the order number exactly, and only compare the UUID column when the input is a UUID,
    // because Postgres rejects a non-UUID string compared against a uuid column.
    const filters = [`order_number.eq.#${cleanNumber}`, `shopify_order_id.eq.gid://shopify/Order/${cleanNumber}`];
    if (UUID.test(orderNumberOrId.trim())) {
      filters.push(`id.eq.${orderNumberOrId.trim()}`);
    }
    const { data, error } = await supabase.from("orders").select("*").or(filters.join(",")).limit(1).maybeSingle();

    if (error) {
      logger.error("Supabase order query error:", error);
    }

    if (data) return rowToOrder(data);

    // 3. Fallback: fetch directly from Shopify, save it, and return the saved row so the id is the database id.
    const shopifyOrder = await shopifyClient.getOrder(cleanNumber);
    if (shopifyOrder) {
      await this.saveOrder(shopifyOrder);
      const { data: saved } = await supabase
        .from("orders")
        .select("*")
        .eq("shopify_order_id", shopifyOrder.shopifyOrderId)
        .maybeSingle();
      return saved ? rowToOrder(saved) : shopifyOrder;
    }

    return null;
  }

  /**
   * Maps an order id (database id, Shopify numeric id or Shopify gid) to the order in each system.
   * Returns null when the order is not known.
   */
  async resolveIdentity(orderId: string): Promise<OrderIdentity | null> {
    const raw = orderId.trim();

    if (!isMockSupabase) {
      const filter = UUID.test(raw)
        ? `id.eq.${raw}`
        : `shopify_order_id.eq.${raw.startsWith("gid://") ? raw : `gid://shopify/Order/${raw.replace(/\D/g, "")}`}`;
      const { data } = await supabase.from("orders").select("id, shopify_order_id, order_number").or(filter).limit(1).maybeSingle();
      return data ? { id: data.id, shopifyOrderId: data.shopify_order_id, orderNumber: data.order_number } : null;
    }

    // No database: the id is the Shopify numeric id (live store) or a demo id.
    const cached = [...mockOrdersStore.values()].find((o) => o.id === raw || o.shopifyOrderId === raw);
    return {
      id: null,
      shopifyOrderId: cached?.shopifyOrderId ?? (raw.startsWith("gid://") ? raw : `gid://shopify/Order/${raw.replace(/\D/g, "")}`),
      orderNumber: cached?.orderNumber ?? "",
    };
  }

  /** Records that the order was packed. Shopify gets the same fact from the video service. */
  async markPacked(orderId: string, packedAt: string): Promise<void> {
    if (isMockSupabase) {
      mockPacked.set(orderId, packedAt);
      return;
    }
    const { error } = await supabase.from("orders").update({ packed_at: packedAt }).eq("id", orderId);
    if (error) logger.error(`Could not mark order ${orderId} as packed:`, error);
  }

  private withMockPacked(order: Order): Order {
    const packedAt = mockPacked.get(order.id) ?? order.packedAt ?? null;
    return packedAt ? { ...order, packedAt } : order;
  }

  /**
   * Save or upsert order in database. The packed time is never overwritten here, because a webhook
   * refresh must not make a packed order look unpacked.
   */
  async saveOrder(order: Order): Promise<void> {
    if (isMockSupabase) {
      mockOrdersStore.set(order.orderNumber.replace(/^#/, ""), order);
      return;
    }

    // The return date is written once, the first time the order is seen as returned. Later refreshes must not
    // move it, because every update of the order changes its updatedAt and would push the deletion date out.
    let returnedColumn = {};
    if (order.returnedAt) {
      const { data: existing } = await supabase
        .from("orders")
        .select("returned_at")
        .eq("shopify_order_id", order.shopifyOrderId)
        .maybeSingle();
      if (!existing?.returned_at) returnedColumn = { returned_at: order.returnedAt };
    }
    const { error } = await supabase.from("orders").upsert(
      {
        ...returnedColumn,
        shopify_order_id: order.shopifyOrderId,
        order_number: order.orderNumber,
        customer_name: order.customerName,
        customer_email: order.customerEmail,
        currency: order.currency,
        total_price: parseFloat(order.totalPrice),
        items: order.items,
        fulfillment_status: order.fulfillmentStatus,
        delivery_status: order.deliveryStatus,
        delivered_at: order.deliveredAt,
        // When the order was placed in Shopify, so the newest orders list first (not when ShipProof saved them).
        ...(order.createdAt ? { created_at: order.createdAt } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "shopify_order_id" }
    );

    if (error) {
      logger.error("Failed to save order to Supabase:", error);
    }

    // The order may already have been packed according to Shopify (for example after a database restore).
    if (order.packedAt) {
      await supabase
        .from("orders")
        .update({ packed_at: order.packedAt })
        .eq("shopify_order_id", order.shopifyOrderId)
        .is("packed_at", null);
    }
  }

  /**
   * Update order delivery status (triggered by delivery webhook/tracking event).
   * The video countdown (30 days after delivery, 60 after a return to origin) starts from the time given
   * here. A database trigger sets the expiry date from the retention_policy table.
   */
  async updateDeliveryStatus(shopifyOrderId: string, status: DeliveryStatus, deliveredAt?: string): Promise<void> {
    logger.info(`Updating delivery status for ${shopifyOrderId}: ${status}`);
    const actualDeliveredAt = status === DeliveryStatus.DELIVERED ? deliveredAt || new Date().toISOString() : null;
    const returnedAt = status === DeliveryStatus.RETURNED ? deliveredAt || new Date().toISOString() : null;

    if (isMockSupabase) {
      for (const [key, ord] of mockOrdersStore.entries()) {
        if (ord.shopifyOrderId === shopifyOrderId) {
          ord.deliveryStatus = status;
          ord.deliveredAt = actualDeliveredAt;
          mockOrdersStore.set(key, ord);
        }
      }
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({
        delivery_status: status,
        // A return keeps the delivery date it may already have; only the matching date is written.
        ...(status === DeliveryStatus.RETURNED ? { returned_at: returnedAt } : { delivered_at: actualDeliveredAt }),
        updated_at: new Date().toISOString(),
      })
      .eq("shopify_order_id", shopifyOrderId);

    if (error) {
      logger.error("Failed to update delivery status:", error);
    }
  }

  /**
   * List recent orders for admin table.
   */
  async listOrders(limit = 20): Promise<Order[]> {
    // Without a database, read recent orders straight from Shopify when a store is connected.
    if (isMockSupabase) {
      if (!shopifyClient.isMock) {
        const orders = await shopifyClient.listRecentOrders(limit);
        for (const o of orders) mockOrdersStore.set(o.orderNumber.replace(/^#/, ""), o);
        return orders.map((o) => this.withMockPacked(o));
      }
      return Array.from(mockOrdersStore.values()).map((o) => this.withMockPacked(o));
    }

    // With a database, seed it from Shopify on first use; webhooks keep it current afterwards.
    const { count } = await supabase.from("orders").select("id", { count: "exact", head: true });
    if (!count && !shopifyClient.isMock) {
      const orders = await shopifyClient.listRecentOrders(limit);
      for (const o of orders) await this.saveOrder(o);
    }

    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    return (data || []).map(rowToOrder);
  }
}

export const orderService = new OrderService();
