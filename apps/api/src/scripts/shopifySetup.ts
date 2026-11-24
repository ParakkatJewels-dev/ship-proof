/**
 * Checks the Shopify connection and, with --webhooks, registers the webhooks ShipProof needs.
 *
 *   npm run shopify:check
 *   npm run shopify:webhooks      (needs API_PUBLIC_URL set to a public HTTPS address)
 */
import { config } from "../config/env.config.js";
import { shopifyClient } from "../integrations/shopify/shopify.client.js";

const WEBHOOKS = [
  { topic: "ORDERS_CREATE", path: "/api/webhooks/shopify/orders-create" },
  { topic: "ORDERS_UPDATED", path: "/api/webhooks/shopify/orders-updated" },
  { topic: "FULFILLMENTS_UPDATE", path: "/api/webhooks/shopify/fulfillments-update" },
];

const LIST_WEBHOOKS = `
  query ShipProofWebhooks {
    webhookSubscriptions(first: 50) { nodes { id topic uri } }
  }
`;

const CREATE_WEBHOOK = `
  mutation ShipProofCreateWebhook($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
      webhookSubscription { id topic uri }
      userErrors { field message }
    }
  }
`;

async function checkConnection() {
  if (shopifyClient.isMock) {
    console.error("✗ Shopify is not configured. Set SHOPIFY_SHOP_DOMAIN plus SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET in apps/api/.env.");
    process.exit(1);
  }

  console.log(`Connecting to ${config.shopify.shopDomain} (${shopifyClient.mode}, API ${config.shopify.apiVersion})...`);
  const shop = await shopifyClient.getShopInfo();
  console.log(`✓ Connected to "${shop.name}" (${shop.myshopifyDomain}, ${shop.currencyCode})`);
  console.log(`  Granted scopes: ${shop.grantedScopes.join(", ") || "none"}`);
  if (shop.missingScopes.length) {
    console.warn(`✗ Missing scopes: ${shop.missingScopes.join(", ")}. Add them to the app's version in the Dev Dashboard, release it, and approve the update on the store.`);
  }

  const orders = await shopifyClient.listRecentOrders(3);
  if (orders.length) {
    console.log(`✓ Read ${orders.length} recent orders, newest ${orders[0].orderNumber} with ${orders[0].items.length} line item(s).`);
  } else {
    console.log("• No orders returned. That is normal for a store with no orders in the last 60 days.");
  }
}

async function registerWebhooks() {
  if (!config.publicUrl.startsWith("https://")) {
    console.error("✗ Set API_PUBLIC_URL to the public HTTPS address of this API (for local testing, a tunnel such as cloudflared or ngrok).");
    process.exit(1);
  }

  const existing = await shopifyClient.graphql<{ webhookSubscriptions: { nodes: { id: string; topic: string; uri: string }[] } }>(LIST_WEBHOOKS);
  const current = existing.data?.webhookSubscriptions.nodes || [];

  for (const hook of WEBHOOKS) {
    const uri = `${config.publicUrl}${hook.path}`;
    if (current.some((w) => w.topic === hook.topic && w.uri === uri)) {
      console.log(`• ${hook.topic} already points at ${uri}`);
      continue;
    }
    const result = await shopifyClient.graphql<{
      webhookSubscriptionCreate: { userErrors: { message: string }[] };
    }>(CREATE_WEBHOOK, { topic: hook.topic, webhookSubscription: { uri, format: "JSON" } });
    const errors = [...(result.errors || []), ...(result.data?.webhookSubscriptionCreate.userErrors || [])];
    if (errors.length) {
      console.error(`✗ ${hook.topic}: ${errors.map((e) => e.message).join("; ")}`);
    } else {
      console.log(`✓ ${hook.topic} → ${uri}`);
    }
  }

  const stale = current.filter((w) => WEBHOOKS.some((h) => h.topic === w.topic) && !w.uri.startsWith(config.publicUrl));
  if (stale.length) {
    console.log(`• ${stale.length} older subscription(s) point at a different address. Remove them in the Dev Dashboard if that address is gone.`);
  }
}

checkConnection()
  .then(() => (process.argv.includes("--webhooks") ? registerWebhooks() : undefined))
  .catch((err) => {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  });
