"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateShopifyHmac = validateShopifyHmac;
const crypto_1 = __importDefault(require("crypto"));
const env_config_js_1 = require("../config/env.config.js");
const response_js_1 = require("../utils/response.js");
const logger_js_1 = require("../utils/logger.js");
function validateShopifyHmac(req, res, next) {
    const hmacHeader = req.headers["x-shopify-hmac-sha256"];
    // In development with mock config, bypass strict HMAC
    if (env_config_js_1.config.shopify.webhookSecret === "mock-webhook-secret" || !hmacHeader) {
        logger_js_1.logger.warn("Shopify webhook received without verification (development bypass).");
        return next();
    }
    try {
        const rawBody = req.rawBody || JSON.stringify(req.body);
        const hash = crypto_1.default
            .createHmac("sha256", env_config_js_1.config.shopify.webhookSecret)
            .update(rawBody, "utf8")
            .digest("base64");
        if (crypto_1.default.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader))) {
            return next();
        }
        return (0, response_js_1.sendError)(res, "Unauthorized Shopify webhook signature", 401);
    }
    catch (err) {
        logger_js_1.logger.error("HMAC verification failed:", err);
        return (0, response_js_1.sendError)(res, "Invalid webhook signature calculation", 401);
    }
}
