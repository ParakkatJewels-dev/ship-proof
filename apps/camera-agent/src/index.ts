import { agentConfig } from "./config/agent.config.js";
import { agentLogger } from "./utils/localLogger.js";
import { fileManager } from "./core/fileManager.js";
import { streamMonitor } from "./core/streamMonitor.js";
import { discoverConnectedCameras } from "./utils/deviceDiscovery.js";
import { createLocalHttpServer } from "./network/localHttpServer.js";
import { wsClient } from "./network/wsClient.js";

async function main() {
  agentLogger.info("==========================================================");
  agentLogger.info(`  ShipProof Camera Agent starting for: ${agentConfig.stationName}`);
  agentLogger.info(`  Station ID: ${agentConfig.stationId}`);
  agentLogger.info("==========================================================");

  // 1. Initialize local file buffering storage
  fileManager.init();

  // 2. Discover local video cameras
  const cameras = discoverConnectedCameras();
  agentLogger.info(`Connected Cameras detected: ${cameras.map((c) => c.name).join(", ")}`);

  // 3. Start stream health monitor
  streamMonitor.startHealthCheck();

  // 4. Start local zero-latency HTTP server
  const localApp = createLocalHttpServer();
  localApp.listen(agentConfig.localHttpPort, () => {
    agentLogger.info(`Local Station API listening on http://localhost:${agentConfig.localHttpPort}`);
  });

  // 5. Connect to Cloud WebSocket Gateway
  wsClient.connect();
}

main().catch((err) => {
  agentLogger.error("Fatal agent error during startup:", err);
  process.exit(1);
});
