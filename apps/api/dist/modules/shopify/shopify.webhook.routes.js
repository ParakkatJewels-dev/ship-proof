"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shopify_webhook_controller_js_1 = require("./shopify.webhook.controller.js");
const validateShopifyHmac_js_1 = require("../../middlewares/validateShopifyHmac.js");
const router = (0, express_1.Router)();
router.post("/orders-create", validateShopifyHmac_js_1.validateShopifyHmac, (req, res) => shopify_webhook_controller_js_1.shopifyWebhookController.handleOrderCreated(req, res));
router.post("/fulfillments-update", validateShopifyHmac_js_1.validateShopifyHmac, (req, res) => shopify_webhook_controller_js_1.shopifyWebhookController.handleFulfillmentUpdate(req, res));
exports.default = router;
