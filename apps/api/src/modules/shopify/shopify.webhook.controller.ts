import { Request, Response } from "express";
import { orderService } from "../orders/order.service.js";
import { shopifyClient } from "../../integrations/shopify/shopify.client.js";
import { DeliveryStatus } from "@shipproof/shared";
import { logger } from "../../utils/logger.js";
import { sendSuccess } from "../../utils/response.js";

/**
 * Shopify expects a 2xx within a few seconds, so each handler acknowledges first
 * and then does its work. Failures are logged; Shopify does not need to retry them.
 */
export class ShopifyWebhookController {
  /** orders/create and orders/updated */
  async handleOrderCreated(req: Request, res: Response) {
    const payload = req.body;
    sendSuccess(res, { received: true });

    const orderName: string | undefined = payload?.name;
    if (!orderName) return;
    logger.info(`Shopify webhook ${req.headers["x-shopify-topic"] || "orders"}: ${orderName}`);

    try {
      // Re-read through GraphQL so delivery status comes from the order's fulfillments,
      // instead of resetting it from the webhook payload.
      const order = await shopifyClient.getOrder(orderName);
      if (order) await orderService.saveOrder(order);
    } catch (err: any) {
      logger.error(`Failed to sync order ${orderName} from webhook:`, err.message);
    }
  }

  /** fulfillments/update: starts the retention countdown (30 days) once a shipment is delivered. */
  async handleFulfillmentUpdate(req: Request, res: Response) {
    const payload = req.body;
    sendSuccess(res, { acknowledged: true });

    if (!payload?.order_id) return;
    const shopifyOrderId = `gid://shopify/Order/${payload.order_id}`;
    const shipmentStatus = String(payload.shipment_status || "").toLowerCase();
    logger.info(`Shopify fulfillment update for ${shopifyOrderId}: status=${shipmentStatus || "none"}`);

    try {
      if (shipmentStatus === "delivered") {
        await orderService.updateDeliveryStatus(
          shopifyOrderId,
          DeliveryStatus.DELIVERED,
          payload.updated_at || new Date().toISOString()
        );
      } else if (shipmentStatus === "out_for_delivery") {
        await orderService.updateDeliveryStatus(shopifyOrderId, DeliveryStatus.OUT_FOR_DELIVERY);
      } else if (shipmentStatus === "in_transit" || shipmentStatus === "attempted_delivery") {
        await orderService.updateDeliveryStatus(shopifyOrderId, DeliveryStatus.IN_TRANSIT);
      }
    } catch (err: any) {
      logger.error(`Failed to update delivery status for ${shopifyOrderId}:`, err.message);
    }
  }
}

export const shopifyWebhookController = new ShopifyWebhookController();
