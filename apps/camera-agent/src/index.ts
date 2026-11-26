import { agentConfig } from "./config/agent.config.js";
import { agentLogger } from "./utils/localLogger.js";
import { fileManager } from "./core/fileManager.js";
import { streamMonitor } from "./core/streamMonitor.js";
import { discoverConnectedCameras } from "./utils/deviceDiscovery.js";
import { createLocalHttpServer } from "./network/localHttpServer.js";
import { cloudReporter } from "./network/cloudClient.js";
import { recorder } from "./core/ffmpeg.recorder.js";
import { probeCamera } from "./core/cameraInfo.js";
import { recoverInterruptedSessions, uploadQueue } from "./network/uploadQueue.js";

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

  // 3a. Recover recordings that were cut off by a power cut or crash, then start the upload queue.
  recoverInterruptedSessions();
  uploadQueue.start();
  // A recording that ended by itself (maximum length) shows up on the dashboard with the next report.
  recorder.onAutoStop = () => cloudReporter.reportSoon();

  // 3. Start stream health monitor
  streamMonitor.startHealthCheck();

  // 4. Start local zero-latency HTTP server
  const localApp = createLocalHttpServer();
  // Listen on this computer only; the dashboard on the same PC is the only intended client.
  localApp.listen(agentConfig.localHttpPort, "127.0.0.1", () => {
    agentLogger.info(`Local Station API listening on http://localhost:${agentConfig.localHttpPort}`);
  });

  // 5. Report this device's status to ShipProof every few seconds, and soon after anything changes.
  cloudReporter.start();

  // Upload progress reaches the dashboard as it happens.
  uploadQueue.onChange = () => cloudReporter.reportSoon();

  // 6. Read what size and speed the camera really delivers, for the dashboard.
  probeCamera(() => recorder.isRecording());
}

main().catch((err) => {
  agentLogger.error("Fatal agent error during startup:", err);
  process.exit(1);
});
