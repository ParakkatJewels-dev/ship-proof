"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderService = exports.OrderService = void 0;
const db_client_js_1 = require("../../integrations/supabase/db.client.js");
const shopify_client_js_1 = require("../../integrations/shopify/shopify.client.js");
const shared_1 = require("@shipproof/shared");
const logger_js_1 = require("../../utils/logger.js");
// In-memory fallback orders for development
const mockOrdersStore = new Map();
class OrderService {
    /**
     * Find order by number (e.g. #1042 or 1042) or UUID.
     */
    async getOrder(orderNumberOrId) {
        const cleanNumber = orderNumberOrId.trim().replace(/^#/, "");
        // 1. Check in-memory store if mock
        if (db_client_js_1.isMockSupabase) {
            if (mockOrdersStore.has(cleanNumber)) {
                return mockOrdersStore.get(cleanNumber);
            }
            // Fetch from Shopify mock client and cache
            const order = await shopify_client_js_1.shopifyClient.getOrder(cleanNumber);
            if (order) {
                mockOrdersStore.set(cleanNumber, order);
                return order;
            }
            return null;
        }
        // 2. Query Supabase
        const { data, error } = await db_client_js_1.supabase
            .from("orders")
            .select("*")
            .or(`order_number.ilike.%${cleanNumber}%,shopify_order_id.eq.${orderNumberOrId},id.eq.${orderNumberOrId}`)
            .limit(1)
            .maybeSingle();
        if (error) {
            logger_js_1.logger.error("Supabase order query error:", error);
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
                deliveryStatus: data.delivery_status,
                deliveredAt: data.delivered_at,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };
        }
        // 3. Fallback: Fetch directly from Shopify and persist
        const shopifyOrder = await shopify_client_js_1.shopifyClient.getOrder(cleanNumber);
        if (shopifyOrder) {
            await this.saveOrder(shopifyOrder);
            return shopifyOrder;
        }
        return null;
    }
    /**
     * Save or upsert order in database.
     */
    async saveOrder(order) {
        if (db_client_js_1.isMockSupabase) {
            mockOrdersStore.set(order.orderNumber.replace(/^#/, ""), order);
            return;
        }
        const { error } = await db_client_js_1.supabase.from("orders").upsert({
            shopify_order_id: order.shopifyOrderId,
            order_number: order.orderNumber,
            customer_name: order.customerName,
            customer_email: order.customerEmail,
            currency: order.currency,
            total_price: parseFloat(order.totalPrice),
            items: order.items,
            fulfillment_status: order.fulfillmentStatus,
            deliveryStatus: order.deliveryStatus,
            delivered_at: order.deliveredAt,
            updated_at: new Date().toISOString(),
        }, { onConflict: "shopify_order_id" });
        if (error) {
            logger_js_1.logger.error("Failed to save order to Supabase:", error);
        }
    }
    /**
     * Update order delivery status (triggered by delivery webhook/tracking event).
     */
    async updateDeliveryStatus(shopifyOrderId, status, deliveredAt) {
        logger_js_1.logger.info(`Updating delivery status for ${shopifyOrderId}: ${status}`);
        const actualDeliveredAt = status === shared_1.DeliveryStatus.DELIVERED ? deliveredAt || new Date().toISOString() : null;
        if (db_client_js_1.isMockSupabase) {
            for (const [key, ord] of mockOrdersStore.entries()) {
                if (ord.shopifyOrderId === shopifyOrderId) {
                    ord.deliveryStatus = status;
                    ord.deliveredAt = actualDeliveredAt;
                    mockOrdersStore.set(key, ord);
                }
            }
            return;
        }
        const { error } = await db_client_js_1.supabase
            .from("orders")
            .update({
            delivery_status: status,
            delivered_at: actualDeliveredAt,
            updated_at: new Date().toISOString(),
        })
            .eq("shopify_order_id", shopifyOrderId);
        if (error) {
            logger_js_1.logger.error("Failed to update delivery status:", error);
        }
    }
    /**
     * List recent orders for admin table.
     */
    async listOrders(limit = 20) {
        if (db_client_js_1.isMockSupabase) {
            return Array.from(mockOrdersStore.values());
        }
        const { data } = await db_client_js_1.supabase
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(limit);
        return (data || []).map((d) => ({
            id: d.id,
            shopifyOrderId: d.shopify_order_id,
            orderNumber: d.order_number,
            customerName: d.customer_name,
            customerEmail: d.customer_email,
            currency: d.currency,
            totalPrice: String(d.total_price),
            items: d.items,
            fulfillmentStatus: d.fulfillment_status,
            deliveryStatus: d.delivery_status,
            deliveredAt: d.delivered_at,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
        }));
    }
}
exports.OrderService = OrderService;
exports.orderService = new OrderService();
