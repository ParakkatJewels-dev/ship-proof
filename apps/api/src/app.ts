import express from "express";
import cors from "cors";
import orderRoutes from "./modules/orders/order.routes.js";
import stationRoutes from "./modules/stations/station.routes.js";
import videoRoutes from "./modules/videos/video.routes.js";
import shopifyWebhookRoutes from "./modules/shopify/shopify.webhook.routes.js";
import shopifyRoutes from "./modules/shopify/shopify.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";

export function createApp() {
  const app = express();

  // Cross-Origin Resource Sharing
  app.use(cors());

  // Capture raw body for Shopify HMAC validation
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  // Healthcheck
  app.get("/health", (_req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // REST API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/stations", stationRoutes);
  app.use("/api/videos", videoRoutes);
  app.use("/api/webhooks/shopify", shopifyWebhookRoutes);
  app.use("/api/shopify", shopifyRoutes);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
