import { createApp } from "./createApp.js";
import { config } from "./config/env.config.js";
import { logger } from "./utils/logger.js";
import { startVideoRetentionJob } from "./jobs/videoRetention.job.js";
import { productionProblems } from "./config/productionChecks.js";

/**
 * Runs the API as an ordinary server on this computer (npm run dev / npm start). On Vercel, index.ts is
 * used instead and the background jobs run as Vercel Cron.
 */
const problems = productionProblems();
if (problems.length) {
  logger.error("The API cannot start in production:\n - " + problems.join("\n - "));
  process.exit(1);
}

const app = createApp();

// Retention and Shopify retry, on a timer (Vercel Cron does this when hosted on Vercel).
startVideoRetentionJob();

app.listen(config.port, () => {
  logger.info(`=======================================================`);
  logger.info(`  ShipProof Cloud API is running on port ${config.port}`);
  logger.info(`  Environment: ${config.nodeEnv}`);
  logger.info(`=======================================================`);
});
