"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || "4000", 10),
    nodeEnv: process.env.NODE_ENV || "development",
    jwtSecret: process.env.JWT_SECRET || "shipproof-secret-key-default",
    supabase: {
        url: process.env.SUPABASE_URL || "https://mock.supabase.co",
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "mock-key",
        bucket: process.env.SUPABASE_STORAGE_BUCKET || "packing-videos",
    },
    shopify: {
        shopDomain: process.env.SHOPIFY_SHOP_DOMAIN || "mock.myshopify.com",
        accessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "mock-token",
        apiVersion: process.env.SHOPIFY_API_VERSION || "2026-01",
        webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET || "mock-webhook-secret",
    },
    retention: {
        daysAfterDelivery: parseInt(process.env.VIDEO_RETENTION_DAYS || "7", 10),
    },
};
