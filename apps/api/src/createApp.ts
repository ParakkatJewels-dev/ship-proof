import express from "express";
import cors from "cors";
import orderRoutes from "./modules/orders/order.routes.js";
import stationRoutes from "./modules/stations/station.routes.js";
import videoRoutes from "./modules/videos/video.routes.js";
import shopifyWebhookRoutes from "./modules/shopify/shopify.webhook.routes.js";
import shopifyRoutes from "./modules/shopify/shopify.routes.js";
import cronRoutes from "./modules/cron/cron.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import watchRoutes from "./modules/watch/watch.routes.js";
import { config } from "./config/env.config.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { productionProblems } from "./config/productionChecks.js";
import { logger } from "./utils/logger.js";
import { isMockSupabase } from "./integrations/supabase/db.client.js";
import { devStorageRoutes } from "./integrations/supabase/devStorage.js";

export function createApp() {
  const app = express();

  // Behind a hosting proxy the real visitor address is in a forwarded header; trust one hop so rate limits
  // count each visitor separately.
  if (config.nodeEnv === "production") app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // Plain security headers. This API only returns JSON, so it can forbid everything else.
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    if (config.nodeEnv === "production") res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
  });

  // Browsers may call this API only from the web app. Requests without an Origin (the camera agents,
  // curl, server-to-server calls) are not browser requests and are unaffected.
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.webOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
    }),
  );

  // Capture raw body for Shopify HMAC validation
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  // Refuse to serve in production with an unsafe or incomplete setup. The health check still answers,
  // with the list of what is missing, so a fresh deployment says what to fix.
  const problems = productionProblems();
  if (problems.length) logger.error(`The API is not ready for production: ${problems.join(" | ")}`);

  // Healthcheck
  app.get("/health", (_req, res) => {
    if (problems.length) return res.status(503).json({ status: "not-configured", problems });
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  if (problems.length) {
    app.use((_req, res) => {
      res.status(503).json({ success: false, error: "The ShipProof server is not fully set up yet. Open /health to see what is missing." });
    });
  }

  // REST API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/watch", watchRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/stations", stationRoutes);
  app.use("/api/videos", videoRoutes);
  app.use("/api/webhooks/shopify", shopifyWebhookRoutes);
  app.use("/api/shopify", shopifyRoutes);
  app.use("/api/cron", cronRoutes);

  // Local demo mode only: video files on this computer instead of Supabase Storage.
  if (isMockSupabase && config.nodeEnv !== "production") {
    app.use("/dev-storage", devStorageRoutes());
    logger.warn("Demo mode: no Supabase configured. Test data and videos are kept in apps/api/.dev-data.");
  }

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
