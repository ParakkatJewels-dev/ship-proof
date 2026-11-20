"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const agent_config_js_1 = require("./config/agent.config.js");
const localLogger_js_1 = require("./utils/localLogger.js");
const fileManager_js_1 = require("./core/fileManager.js");
const streamMonitor_js_1 = require("./core/streamMonitor.js");
const deviceDiscovery_js_1 = require("./utils/deviceDiscovery.js");
const localHttpServer_js_1 = require("./network/localHttpServer.js");
const wsClient_js_1 = require("./network/wsClient.js");
async function main() {
    localLogger_js_1.agentLogger.info("==========================================================");
    localLogger_js_1.agentLogger.info(`  ShipProof Camera Agent starting for: ${agent_config_js_1.agentConfig.stationName}`);
    localLogger_js_1.agentLogger.info(`  Station ID: ${agent_config_js_1.agentConfig.stationId}`);
    localLogger_js_1.agentLogger.info("==========================================================");
    // 1. Initialize local file buffering storage
    fileManager_js_1.fileManager.init();
    // 2. Discover local video cameras
    const cameras = (0, deviceDiscovery_js_1.discoverConnectedCameras)();
    localLogger_js_1.agentLogger.info(`Connected Cameras detected: ${cameras.map((c) => c.name).join(", ")}`);
    // 3. Start stream health monitor
    streamMonitor_js_1.streamMonitor.startHealthCheck();
    // 4. Start local zero-latency HTTP server
    const localApp = (0, localHttpServer_js_1.createLocalHttpServer)();
    localApp.listen(agent_config_js_1.agentConfig.localHttpPort, () => {
        localLogger_js_1.agentLogger.info(`Local Station API listening on http://localhost:${agent_config_js_1.agentConfig.localHttpPort}`);
    });
    // 5. Connect to Cloud WebSocket Gateway
    wsClient_js_1.wsClient.connect();
}
main().catch((err) => {
    localLogger_js_1.agentLogger.error("Fatal agent error during startup:", err);
    process.exit(1);
});
