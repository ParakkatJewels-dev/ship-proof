import { config, shopifyAuthMode } from "../../config/env.config.js";
import { logger } from "../../utils/logger.js";
import { Order, OrderItem, DeliveryStatus } from "@shipproof/shared";

/* -------------------------------------------------------------------------- */
/* GraphQL documents                                                          */
/* -------------------------------------------------------------------------- */

// Customer name and email are protected customer data. On store plans that don't grant
// them to merchant apps, Shopify returns these fields as errors and the rest of the order
// still comes back, so callers tolerate partial data.
const ORDER_FIELDS = `
  id
  legacyResourceId
  name
  email
  createdAt
  updatedAt
  currencyCode
  displayFulfillmentStatus
  totalPriceSet { shopMoney { amount } }
  customer { displayName }
  lineItems(first: 50) {
    nodes {
      id
      title
      variantTitle
      sku
      quantity
      image { url }
      variant { barcodes(first: 1) { nodes { value } } }
      originalUnitPriceSet { shopMoney { amount } }
    }
  }
  fulfillments(first: 10) { displayStatus deliveredAt }
`;

const ORDERS_QUERY = `
  query ShipProofOrders($first: Int!, $query: String) {
    orders(first: $first, query: $query, sortKey: CREATED_AT, reverse: true) {
      nodes { ${ORDER_FIELDS} }
    }
  }
`;

const SHOP_QUERY = `
  query ShipProofShop {
    shop { name myshopifyDomain currencyCode }
    currentAppInstallation { accessScopes { handle } }
  }
`;

const METAFIELDS_SET = `
  mutation ShipProofVideoLink($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id }
      userErrors { field message }
    }
  }
`;

/** Scopes ShipProof needs on the Shopify app. */
export const REQUIRED_SCOPES = ["read_orders", "write_orders", "read_customers", "read_fulfillments"];

/* -------------------------------------------------------------------------- */
/* Types and mapping                                                          */
/* -------------------------------------------------------------------------- */

interface GraphQLError {
  message: string;
  path?: (string | number)[];
  extensions?: { code?: string };
}

interface GraphQLResult<T> {
  data?: T;
  errors?: GraphQLError[];
}

interface ShopifyOrderNode {
  id: string;
  legacyResourceId: string;
  name: string;
  email?: string | null;
  createdAt: string;
  updatedAt: string;
  currencyCode: string;
  displayFulfillmentStatus: string;
  totalPriceSet: { shopMoney: { amount: string } };
  customer?: { displayName?: string | null } | null;
  lineItems: {
    nodes: {
      id: string;
      title: string;
      variantTitle?: string | null;
      sku?: string | null;
      quantity: number;
      image?: { url: string } | null;
      variant?: { barcodes: { nodes: { value: string }[] } } | null;
      originalUnitPriceSet: { shopMoney: { amount: string } };
    }[];
  };
  fulfillments: { displayStatus?: string | null; deliveredAt?: string | null }[];
}

export interface ShopInfo {
  name: string;
  myshopifyDomain: string;
  currencyCode: string;
  grantedScopes: string[];
  missingScopes: string[];
}

function deliveryFromFulfillments(fulfillments: ShopifyOrderNode["fulfillments"]) {
  const statuses = fulfillments.map((f) => f.displayStatus);
  const delivered = fulfillments.find((f) => f.displayStatus === "DELIVERED");
  if (delivered) {
    return { status: DeliveryStatus.DELIVERED, deliveredAt: delivered.deliveredAt || null };
  }
  if (statuses.includes("OUT_FOR_DELIVERY")) return { status: DeliveryStatus.OUT_FOR_DELIVERY, deliveredAt: null };
  if (statuses.includes("IN_TRANSIT") || statuses.includes("ATTEMPTED_DELIVERY")) {
    return { status: DeliveryStatus.IN_TRANSIT, deliveredAt: null };
  }
  return { status: DeliveryStatus.PENDING, deliveredAt: null };
}

export function mapShopifyOrder(node: ShopifyOrderNode): Order {
  const delivery = deliveryFromFulfillments(node.fulfillments || []);
  const items: OrderItem[] = node.lineItems.nodes.map((li) => ({
    id: li.id,
    sku: li.sku || "NO-SKU",
    title: li.title,
    variantTitle: li.variantTitle || undefined,
    quantity: li.quantity,
    price: li.originalUnitPriceSet.shopMoney.amount,
    imageUrl: li.image?.url,
    barcode: li.variant?.barcodes.nodes[0]?.value,
    verified: false,
  }));

  return {
    id: node.legacyResourceId,
    shopifyOrderId: node.id,
    orderNumber: node.name,
    customerName: node.customer?.displayName || "Customer",
    customerEmail: node.email || "",
    currency: node.currencyCode,
    totalPrice: node.totalPriceSet.shopMoney.amount,
    fulfillmentStatus: node.displayFulfillmentStatus.toLowerCase(),
    deliveryStatus: delivery.status,
    deliveredAt: delivery.deliveredAt,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    items,
  };
}

function toOrderGid(orderId: string): string {
  return orderId.startsWith("gid://") ? orderId : `gid://shopify/Order/${orderId.replace(/\D/g, "")}`;
}

/* -------------------------------------------------------------------------- */
/* Client                                                                     */
/* -------------------------------------------------------------------------- */

export class ShopifyClient {
  readonly mode = shopifyAuthMode;
  readonly isMock = shopifyAuthMode === "mock";

  private token: string | null = null;
  private tokenExpiresAt = 0;
  private pendingToken: Promise<string> | null = null;
  private warnedAboutProtectedData = false;

  constructor() {
    if (this.isMock) {
      logger.warn("Shopify credentials not set. Using demo orders. See apps/api/.env.example to connect a store.");
    } else {
      logger.info(`Shopify connected to ${config.shopify.shopDomain} (${this.mode}, API ${config.shopify.apiVersion})`);
    }
  }

  /** Returns a valid Admin API token, requesting a new one through the client credentials grant when needed. */
  private async getAccessToken(): Promise<string> {
    if (this.mode === "admin_token") return config.shopify.adminAccessToken;

    // Refresh five minutes before Shopify's 24-hour expiry.
    if (this.token && Date.now() < this.tokenExpiresAt - 5 * 60_000) return this.token;
    if (this.pendingToken) return this.pendingToken;

    this.pendingToken = (async () => {
      const res = await fetch(`https://${config.shopify.shopDomain}/admin/oauth/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: config.shopify.clientId,
          client_secret: config.shopify.clientSecret,
        }),
      }).catch((err: Error) => {
        throw new Error(`Could not reach ${config.shopify.shopDomain}: ${err.message}. Check SHOPIFY_SHOP_DOMAIN.`);
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(
          `Shopify token request failed (${res.status}). Check SHOPIFY_SHOP_DOMAIN, the client ID and secret, ` +
            `and that the app is installed on the store. ${detail.slice(0, 200)}`
        );
      }
      const body = (await res.json()) as { access_token: string; expires_in?: number };
      this.token = body.access_token;
      this.tokenExpiresAt = Date.now() + (body.expires_in ?? 86_400) * 1000;
      return this.token;
    })();

    try {
      return await this.pendingToken;
    } finally {
      this.pendingToken = null;
    }
  }

  /** Runs a GraphQL Admin API request, retrying on throttling and once on an expired token. */
  async graphql<T>(query: string, variables: Record<string, unknown> = {}, attempt = 0): Promise<GraphQLResult<T>> {
    const url = `https://${config.shopify.shopDomain}/admin/api/${config.shopify.apiVersion}/graphql.json`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": await this.getAccessToken(),
      },
      body: JSON.stringify({ query, variables }),
    });

    if (res.status === 401 && this.mode === "client_credentials" && attempt === 0) {
      this.token = null;
      return this.graphql<T>(query, variables, attempt + 1);
    }
    if (res.status === 429 && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      return this.graphql<T>(query, variables, attempt + 1);
    }
    if (!res.ok) {
      throw new Error(`Shopify GraphQL request failed: ${res.status} ${res.statusText}`);
    }

    const result = (await res.json()) as GraphQLResult<T>;
    const throttled = result.errors?.some((e) => e.extensions?.code === "THROTTLED");
    if (throttled && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      return this.graphql<T>(query, variables, attempt + 1);
    }
    return result;
  }

  /** Accepts partial data when only protected customer fields were denied. */
  private unwrapOrders(result: GraphQLResult<{ orders: { nodes: ShopifyOrderNode[] } }>): ShopifyOrderNode[] {
    if (result.errors?.length) {
      const onlyProtectedFields = result.errors.every((e) =>
        (e.path || []).some((p) => p === "customer" || p === "email")
      );
      if (!result.data?.orders || !onlyProtectedFields) {
        throw new Error(`Shopify GraphQL errors: ${result.errors.map((e) => e.message).join("; ")}`);
      }
      if (!this.warnedAboutProtectedData) {
        this.warnedAboutProtectedData = true;
        logger.warn(
          "Shopify withheld customer name/email (protected customer data). Orders still load; customer shows as 'Customer'."
        );
      }
    }
    return result.data?.orders.nodes || [];
  }

  /** Looks up one order by its order number, e.g. "#19394" or "19394". */
  async getOrder(orderIdOrNumber: string): Promise<Order | null> {
    const cleanNumber = orderIdOrNumber.trim().replace(/^#/, "");
    if (this.isMock) return mockOrder(cleanNumber);

    try {
      const result = await this.graphql<{ orders: { nodes: ShopifyOrderNode[] } }>(ORDERS_QUERY, {
        first: 1,
        query: `name:${cleanNumber}`,
      });
      const node = this.unwrapOrders(result)[0];
      return node ? mapShopifyOrder(node) : null;
    } catch (err: any) {
      logger.error("Shopify getOrder failed:", err.message);
      throw err;
    }
  }

  /** Most recent orders, newest first. Shopify returns the last 60 days unless the app has read_all_orders. */
  async listRecentOrders(limit = 25): Promise<Order[]> {
    if (this.isMock) return [];
    const result = await this.graphql<{ orders: { nodes: ShopifyOrderNode[] } }>(ORDERS_QUERY, {
      first: Math.min(Math.max(limit, 1), 100),
      query: "-status:cancelled",
    });
    return this.unwrapOrders(result).map(mapShopifyOrder);
  }

  /** Store name and granted scopes, used by the connection check. */
  async getShopInfo(): Promise<ShopInfo> {
    const result = await this.graphql<{
      shop: { name: string; myshopifyDomain: string; currencyCode: string };
      currentAppInstallation: { accessScopes: { handle: string }[] };
    }>(SHOP_QUERY);
    if (!result.data || result.errors?.length) {
      throw new Error(`Shopify GraphQL errors: ${(result.errors || []).map((e) => e.message).join("; ")}`);
    }
    const granted = result.data.currentAppInstallation.accessScopes.map((s) => s.handle);
    // write_orders implies read_orders.
    const missing = REQUIRED_SCOPES.filter(
      (s) => !granted.includes(s) && !(s.startsWith("read_") && granted.includes(s.replace("read_", "write_")))
    );
    return { ...result.data.shop, grantedScopes: granted, missingScopes: missing };
  }

  /** Stores the packing video link on the order as metafield shipproof.packing_video_url. */
  async attachVideoProofMetafield(orderId: string, videoUrl: string): Promise<boolean> {
    if (this.isMock) {
      logger.info(`[Mock Shopify] Attached video proof link to order ${orderId}: ${videoUrl}`);
      return true;
    }

    try {
      const result = await this.graphql<{
        metafieldsSet: { userErrors: { field: string[]; message: string }[] };
      }>(METAFIELDS_SET, {
        metafields: [
          {
            ownerId: toOrderGid(orderId),
            namespace: "shipproof",
            key: "packing_video_url",
            type: "url",
            value: videoUrl,
          },
        ],
      });
      const userErrors = result.data?.metafieldsSet.userErrors || [];
      if (result.errors?.length || userErrors.length) {
        logger.error("Failed to set packing video metafield:", { errors: result.errors, userErrors });
        return false;
      }
      return true;
    } catch (err: any) {
      logger.error("Failed to attach video metafield:", err.message);
      return false;
    }
  }
}

/* Demo order used when no store is connected. */
function mockOrder(cleanNumber: string): Order {
  const now = new Date().toISOString();
  return {
    id: `mock-${cleanNumber}`,
    shopifyOrderId: `gid://shopify/Order/${cleanNumber}`,
    orderNumber: `#${cleanNumber}`,
    customerName: "Priya Menon",
    customerEmail: "priya.menon@example.com",
    currency: "INR",
    totalPrice: "12499.00",
    fulfillmentStatus: "unfulfilled",
    deliveryStatus: DeliveryStatus.PENDING,
    deliveredAt: null,
    createdAt: now,
    updatedAt: now,
    items: [
      {
        id: "line-item-1",
        sku: "PJ-22K-BGL-02",
        title: "22K Traditional Gold Bangle",
        variantTitle: "2.6 Size (Pair)",
        quantity: 2,
        price: "5999.00",
        verified: false,
      },
      {
        id: "line-item-2",
        sku: "PJ-GIFT-BOX-LUX",
        title: "Velvet Presentation Jewellery Box",
        variantTitle: "Red Velvet",
        quantity: 1,
        price: "501.00",
        verified: false,
      },
    ],
  };
}

export const shopifyClient = new ShopifyClient();
