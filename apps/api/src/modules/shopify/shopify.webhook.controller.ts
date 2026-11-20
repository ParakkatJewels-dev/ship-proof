import { Request, Response } from "express";
import { orderService } from "../orders/order.service.js";
import { DeliveryStatus } from "@shipproof/shared";
import { logger } from "../../utils/logger.js";
import { sendSuccess } from "../../utils/response.js";

export class ShopifyWebhookController {
  /**
   * Webhook: orders/create or orders/updated
   */
  async handleOrderCreated(req: Request, res: Response) {
    const payload = req.body;
    logger.info(`Shopify webhook: Order Created/Updated #${payload.name || payload.id}`);

    try {
      if (payload.id) {
        await orderService.saveOrder({
          id: String(payload.id),
          shopifyOrderId: `gid://shopify/Order/${payload.id}`,
          orderNumber: payload.name || `#${payload.order_number}`,
          customerName: `${payload.customer?.first_name || ""} ${payload.customer?.last_name || ""}`.trim() || "Customer",
          customerEmail: payload.email || "",
          currency: payload.currency || "INR",
          totalPrice: payload.total_price || "0.00",
          fulfillmentStatus: payload.fulfillment_status || "unfulfilled",
          deliveryStatus: DeliveryStatus.PENDING,
          deliveredAt: null,
          createdAt: payload.created_at || new Date().toISOString(),
          updatedAt: payload.updated_at || new Date().toISOString(),
          items: (payload.line_items || []).map((item: any) => ({
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
      return sendSuccess(res, { received: true });
    } catch (err: any) {
      logger.error("Failed to handle order webhook:", err);
      return sendSuccess(res, { error: err.message }); // Acknowledge to Shopify
    }
  }

  /**
   * Webhook: fulfillments/update or orders/fulfilled
   * Triggers the 7-day retention countdown upon DELIVERED status!
   */
  async handleFulfillmentUpdate(req: Request, res: Response) {
    const payload = req.body;
    const shopifyOrderId = `gid://shopify/Order/${payload.order_id}`;
    const shipmentStatus = payload.shipment_status?.toLowerCase();

    logger.info(`Shopify Fulfillment Update for ${shopifyOrderId}: status=${shipmentStatus}`);

    if (shipmentStatus === "delivered") {
      const deliveredAt = payload.updated_at || new Date().toISOString();
      await orderService.updateDeliveryStatus(shopifyOrderId, DeliveryStatus.DELIVERED, deliveredAt);
    } else if (shipmentStatus === "out_for_delivery") {
      await orderService.updateDeliveryStatus(shopifyOrderId, DeliveryStatus.OUT_FOR_DELIVERY);
    } else if (shipmentStatus === "in_transit") {
      await orderService.updateDeliveryStatus(shopifyOrderId, DeliveryStatus.IN_TRANSIT);
    }

    return sendSuccess(res, { acknowledged: true });
  }
}

export const shopifyWebhookController = new ShopifyWebhookController();
