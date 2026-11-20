import { config } from "../../config/env.config.js";
import { logger } from "../../utils/logger.js";
import { Order, DeliveryStatus } from "@shipproof/shared";

export class ShopifyClient {
  private shopDomain = config.shopify.shopDomain;
  private accessToken = config.shopify.accessToken;
  private apiVersion = config.shopify.apiVersion;

  private isMock = this.accessToken === "mock-token" || this.accessToken.startsWith("shpat_xxxx");

  /**
   * Fetches order details from Shopify Admin REST / GraphQL API.
   */
  async getOrder(orderIdOrNumber: string): Promise<Order | null> {
    const cleanNumber = orderIdOrNumber.trim().replace(/^#/, "");

    if (this.isMock) {
      logger.info(`[Mock Shopify] Fetching order for query: ${cleanNumber}`);
      return {
        id: "mock-order-uuid-1",
        shopifyOrderId: `gid://shopify/Order/${cleanNumber}`,
        orderNumber: `#${cleanNumber}`,
        customerName: "Priya Menon",
        customerEmail: "priya.menon@example.com",
        currency: "INR",
        totalPrice: "12499.00",
        fulfillmentStatus: "unfulfilled",
        deliveryStatus: DeliveryStatus.PENDING,
        deliveredAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: [
          {
            id: "line-item-1",
            sku: "PJ-22K-BGL-02",
            title: "22K Traditional Gold Bangle",
            variantTitle: "2.6 Size (Pair)",
            quantity: 2,
            price: "5999.00",
            imageUrl: "https://images.unsplash.com/photo-1611591475870-7607a718b532?w=300",
            barcode: "8901234567890",
            verified: false,
          },
          {
            id: "line-item-2",
            sku: "PJ-GIFT-BOX-LUX",
            title: "Velvet Presentation Jewellery Box",
            variantTitle: "Red Velvet",
            quantity: 1,
            price: "501.00",
            imageUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300",
            barcode: "8909876543210",
            verified: false,
          },
        ],
      };
    }

    try {
      const url = `https://${this.shopDomain}/admin/api/${this.apiVersion}/orders.json?name=${encodeURIComponent(cleanNumber)}`;
      const res = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": this.accessToken,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Shopify API error: ${res.statusText}`);
      }

      const data = (await res.json()) as any;
      const orderData = data.orders?.[0];
      if (!orderData) return null;

      return {
        id: String(orderData.id),
        shopifyOrderId: `gid://shopify/Order/${orderData.id}`,
        orderNumber: orderData.name,
        customerName: `${orderData.customer?.first_name || ""} ${orderData.customer?.last_name || ""}`.trim() || "Customer",
        customerEmail: orderData.email || "",
        currency: orderData.currency || "INR",
        totalPrice: orderData.total_price || "0.00",
        fulfillmentStatus: orderData.fulfillment_status || "unfulfilled",
        deliveryStatus: DeliveryStatus.PENDING,
        deliveredAt: null,
        createdAt: orderData.created_at,
        updatedAt: orderData.updated_at,
        items: (orderData.line_items || []).map((item: any) => ({
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
      };
    } catch (err: any) {
      logger.error("Shopify client error:", err);
      return null;
    }
  }

  /**
   * Attaches video verification proof URL to the Shopify order metafield.
   */
  async attachVideoProofMetafield(shopifyOrderId: string, videoUrl: string): Promise<boolean> {
    if (this.isMock) {
      logger.info(`[Mock Shopify] Attached video proof link to order ${shopifyOrderId}: ${videoUrl}`);
      return true;
    }

    try {
      const numericId = shopifyOrderId.replace(/\D/g, "");
      const url = `https://${this.shopDomain}/admin/api/${this.apiVersion}/orders/${numericId}/metafields.json`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": this.accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metafield: {
            namespace: "shipproof",
            key: "packing_video_url",
            value: videoUrl,
            type: "url",
          },
        }),
      });

      return res.ok;
    } catch (err) {
      logger.error("Failed to attach video metafield:", err);
      return false;
    }
  }
}

export const shopifyClient = new ShopifyClient();
