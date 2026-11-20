"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const order_routes_js_1 = __importDefault(require("./modules/orders/order.routes.js"));
const station_routes_js_1 = __importDefault(require("./modules/stations/station.routes.js"));
const video_routes_js_1 = __importDefault(require("./modules/videos/video.routes.js"));
const shopify_webhook_routes_js_1 = __importDefault(require("./modules/shopify/shopify.webhook.routes.js"));
const errorHandler_js_1 = require("./middlewares/errorHandler.js");
function createApp() {
    const app = (0, express_1.default)();
    // Cross-Origin Resource Sharing
    app.use((0, cors_1.default)());
    // Capture raw body for Shopify HMAC validation
    app.use(express_1.default.json({
        verify: (req, _res, buf) => {
            req.rawBody = buf;
        },
    }));
    // Healthcheck
    app.get("/health", (_req, res) => {
        res.json({ status: "healthy", timestamp: new Date().toISOString() });
    });
    // REST API Routes
    app.use("/api/orders", order_routes_js_1.default);
    app.use("/api/stations", station_routes_js_1.default);
    app.use("/api/videos", video_routes_js_1.default);
    app.use("/api/webhooks/shopify", shopify_webhook_routes_js_1.default);
    // Global Error Handler
    app.use(errorHandler_js_1.errorHandler);
    return app;
}
