"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shopifyWebhookController = exports.ShopifyWebhookController = void 0;
const order_service_js_1 = require("../orders/order.service.js");
const shared_1 = require("@shipproof/shared");
const logger_js_1 = require("../../utils/logger.js");
const response_js_1 = require("../../utils/response.js");
class ShopifyWebhookController {
    /**
     * Webhook: orders/create or orders/updated
     */
    async handleOrderCreated(req, res) {
        const payload = req.body;
        logger_js_1.logger.info(`Shopify webhook: Order Created/Updated #${payload.name || payload.id}`);
        try {
            if (payload.id) {
                await order_service_js_1.orderService.saveOrder({
                    id: String(payload.id),
                    shopifyOrderId: `gid://shopify/Order/${payload.id}`,
                    orderNumber: payload.name || `#${payload.order_number}`,
                    customerName: `${payload.customer?.first_name || ""} ${payload.customer?.last_name || ""}`.trim() || "Customer",
                    customerEmail: payload.email || "",
                    currency: payload.currency || "INR",
                    totalPrice: payload.total_price || "0.00",
                    fulfillmentStatus: payload.fulfillment_status || "unfulfilled",
                    deliveryStatus: shared_1.DeliveryStatus.PENDING,
                    deliveredAt: null,
                    createdAt: payload.created_at || new Date().toISOString(),
                    updatedAt: payload.updated_at || new Date().toISOString(),
                    items: (payload.line_items || []).map((item) => ({
                        id: String(item.id),
                        sku: item.sku || "NO-SKU",
                        title: item.title,
                        variantTitle: item.variant_title,
                        quantity: item.quantity,
                        price: item.price,
                        imageUrl: item.image?.src,
                        barcode: item.barcode,
                        verified: false,
                    })),
                });
            }
            return (0, response_js_1.sendSuccess)(res, { received: true });
        }
        catch (err) {
            logger_js_1.logger.error("Failed to handle order webhook:", err);
            return (0, response_js_1.sendSuccess)(res, { error: err.message }); // Acknowledge to Shopify
        }
    }
    /**
     * Webhook: fulfillments/update or orders/fulfilled
     * Triggers the 7-day retention countdown upon DELIVERED status!
     */
    async handleFulfillmentUpdate(req, res) {
        const payload = req.body;
        const shopifyOrderId = `gid://shopify/Order/${payload.order_id}`;
        const shipmentStatus = payload.shipment_status?.toLowerCase();
        logger_js_1.logger.info(`Shopify Fulfillment Update for ${shopifyOrderId}: status=${shipmentStatus}`);
        if (shipmentStatus === "delivered") {
            const deliveredAt = payload.updated_at || new Date().toISOString();
            await order_service_js_1.orderService.updateDeliveryStatus(shopifyOrderId, shared_1.DeliveryStatus.DELIVERED, deliveredAt);
        }
        else if (shipmentStatus === "out_for_delivery") {
            await order_service_js_1.orderService.updateDeliveryStatus(shopifyOrderId, shared_1.DeliveryStatus.OUT_FOR_DELIVERY);
        }
        else if (shipmentStatus === "in_transit") {
            await order_service_js_1.orderService.updateDeliveryStatus(shopifyOrderId, shared_1.DeliveryStatus.IN_TRANSIT);
        }
        return (0, response_js_1.sendSuccess)(res, { acknowledged: true });
    }
}
exports.ShopifyWebhookController = ShopifyWebhookController;
exports.shopifyWebhookController = new ShopifyWebhookController();
