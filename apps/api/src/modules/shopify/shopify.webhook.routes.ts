import { Router } from "express";
import { shopifyWebhookController } from "./shopify.webhook.controller.js";
import { validateShopifyHmac } from "../../middlewares/validateShopifyHmac.js";

const router = Router();

router.post("/orders-create", validateShopifyHmac, (req, res) =>
  shopifyWebhookController.handleOrderCreated(req, res)
);
router.post("/fulfillments-update", validateShopifyHmac, (req, res) =>
  shopifyWebhookController.handleFulfillmentUpdate(req, res)
);

export default router;
