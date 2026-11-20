"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_js_1 = require("./app.js");
const env_config_js_1 = require("./config/env.config.js");
const logger_js_1 = require("./utils/logger.js");
const stationHub_js_1 = require("./sockets/stationHub.js");
const videoRetention_job_js_1 = require("./jobs/videoRetention.job.js");
const app = (0, app_js_1.createApp)();
const server = http_1.default.createServer(app);
// Initialize WebSocket Hub for Camera Stations & Dashboard
stationHub_js_1.stationHub.init(server);
// Start Automated 7-Day Video Retention Job
(0, videoRetention_job_js_1.startVideoRetentionJob)();
server.listen(env_config_js_1.config.port, () => {
    logger_js_1.logger.info(`=======================================================`);
    logger_js_1.logger.info(`  ShipProof Cloud API is running on port ${env_config_js_1.config.port}`);
    logger_js_1.logger.info(`  Environment: ${env_config_js_1.config.nodeEnv}`);
    logger_js_1.logger.info(`  WebSocket Hub: ws://localhost:${env_config_js_1.config.port}/ws/stations`);
    logger_js_1.logger.info(`=======================================================`);
});
