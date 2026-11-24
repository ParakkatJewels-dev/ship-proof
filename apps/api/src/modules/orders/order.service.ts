import { supabase, isMockSupabase } from "../../integrations/supabase/db.client.js";
import { shopifyClient } from "../../integrations/shopify/shopify.client.js";
import { Order, DeliveryStatus, PackingStatus } from "@shipproof/shared";
import { logger } from "../../utils/logger.js";

// In-memory fallback orders for development
const mockOrdersStore = new Map<string, Order>();

export class OrderService {
  /**
   * Find order by number (e.g. #1042 or 1042) or UUID.
   */
  async getOrder(orderNumberOrId: string): Promise<Order | null> {
    const cleanNumber = orderNumberOrId.trim().replace(/^#/, "");

    // 1. Check in-memory store if mock
    if (isMockSupabase) {
      // A connected store is always asked fresh; the cache only serves demo mode.
      if (shopifyClient.isMock && mockOrdersStore.has(cleanNumber)) {
        return mockOrdersStore.get(cleanNumber)!;
      }
      // Fetch from Shopify mock client and cache
      const order = await shopifyClient.getOrder(cleanNumber);
      if (order) {
        mockOrdersStore.set(cleanNumber, order);
        return order;
      }
      return null;
    }

    // 2. Query Supabase. Match the order number exactly, and only compare the UUID column when the input is a UUID,
    // because Postgres rejects a non-UUID string compared against a uuid column.
    const filters = [`order_number.eq.#${cleanNumber}`, `shopify_order_id.eq.gid://shopify/Order/${cleanNumber}`];
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderNumberOrId.trim())) {
      filters.push(`id.eq.${orderNumberOrId.trim()}`);
    }
    const { data, error } = await supabase.from("orders").select("*").or(filters.join(",")).limit(1).maybeSingle();

    if (error) {
      logger.error("Supabase order query error:", error);
    }

    if (data) {
      return {
        id: data.id,
        shopifyOrderId: data.shopify_order_id,
        orderNumber: data.order_number,
        customerName: data.customer_name,
        customerEmail: data.customer_email,
        currency: data.currency,
        totalPrice: String(data.total_price),
        items: data.items,
        fulfillmentStatus: data.fulfillment_status,
        deliveryStatus: data.delivery_status as DeliveryStatus,
        deliveredAt: data.delivered_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    // 3. Fallback: Fetch directly from Shopify and persist
    const shopifyOrder = await shopifyClient.getOrder(cleanNumber);
    if (shopifyOrder) {
      await this.saveOrder(shopifyOrder);
      return shopifyOrder;
    }

    return null;
  }

  /**
   * Save or upsert order in database.
   */
  async saveOrder(order: Order): Promise<void> {
    if (isMockSupabase) {
      mockOrdersStore.set(order.orderNumber.replace(/^#/, ""), order);
      return;
    }

    const { error } = await supabase.from("orders").upsert(
      {
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
        updated_at: new Date().toISOString(),
      },
      { onConflict: "shopify_order_id" }
    );

    if (error) {
      logger.error("Failed to save order to Supabase:", error);
    }
  }

  /**
   * Update order delivery status (triggered by delivery webhook/tracking event).
   */
  async updateDeliveryStatus(shopifyOrderId: string, status: DeliveryStatus, deliveredAt?: string): Promise<void> {
    logger.info(`Updating delivery status for ${shopifyOrderId}: ${status}`);
    const actualDeliveredAt = status === DeliveryStatus.DELIVERED ? deliveredAt || new Date().toISOString() : null;

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
        delivered_at: actualDeliveredAt,
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
        return orders;
      }
      return Array.from(mockOrdersStore.values());
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

    return (data || []).map((d: any) => ({
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
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));
  }
}

export const orderService = new OrderService();
