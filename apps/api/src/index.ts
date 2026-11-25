import http from "http";
import { createApp } from "./app.js";
import { config } from "./config/env.config.js";
import { logger } from "./utils/logger.js";
import { stationHub } from "./sockets/stationHub.js";
import { startVideoRetentionJob } from "./jobs/videoRetention.job.js";
import { productionProblems } from "./config/productionChecks.js";

// Refuse to start in production with an unsafe or incomplete setup.
const problems = productionProblems();
if (problems.length) {
  logger.error("The API cannot start in production:\n - " + problems.join("\n - "));
  process.exit(1);
}

const app = createApp();
const server = http.createServer(app);

// Initialize WebSocket Hub for Camera Stations & Dashboard
stationHub.init(server);

// Start Automated 7-Day Video Retention Job
startVideoRetentionJob();

server.listen(config.port, () => {
  logger.info(`=======================================================`);
  logger.info(`  ShipProof Cloud API is running on port ${config.port}`);
  logger.info(`  Environment: ${config.nodeEnv}`);
  logger.info(`  WebSocket Hub: ws://localhost:${config.port}/ws/stations`);
  logger.info(`=======================================================`);
});
