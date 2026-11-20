"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsClient = exports.AgentWsClient = void 0;
const ws_1 = require("ws");
const agent_config_js_1 = require("../config/agent.config.js");
const localLogger_js_1 = require("../utils/localLogger.js");
const ffmpeg_recorder_js_1 = require("../core/ffmpeg.recorder.js");
const uploader_js_1 = require("./uploader.js");
const streamMonitor_js_1 = require("../core/streamMonitor.js");
const shared_1 = require("@shipproof/shared");
class AgentWsClient {
    ws = null;
    heartbeatTimer = null;
    reconnectTimer = null;
    connect() {
        const wsUrl = `${agent_config_js_1.agentConfig.cloudWsUrl}?stationId=${agent_config_js_1.agentConfig.stationId}&type=agent`;
        localLogger_js_1.agentLogger.info(`Connecting to Cloud WebSocket Gateway: ${wsUrl}`);
        try {
            this.ws = new ws_1.WebSocket(wsUrl);
            this.ws.on("open", () => {
                localLogger_js_1.agentLogger.info("Successfully connected to ShipProof Cloud Hub.");
                this.startHeartbeat();
            });
            this.ws.on("message", (data) => this.handleMessage(data.toString()));
            this.ws.on("close", () => {
                localLogger_js_1.agentLogger.warn("Cloud WebSocket connection closed. Scheduling auto-reconnect...");
                this.cleanup();
                this.scheduleReconnect();
            });
            this.ws.on("error", (err) => {
                localLogger_js_1.agentLogger.error("WebSocket connection error:", err.message);
            });
        }
        catch (err) {
            localLogger_js_1.agentLogger.error("Failed to initialize WebSocket client:", err.message);
            this.scheduleReconnect();
        }
    }
    handleMessage(raw) {
        try {
            const msg = JSON.parse(raw);
            localLogger_js_1.agentLogger.info(`Received Cloud Command: ${msg.event}`);
            if (msg.event === shared_1.WsEvents.START_RECORDING) {
                const { orderId, orderNumber, sessionId, packerId } = msg.payload;
                ffmpeg_recorder_js_1.recorder.startRecording(orderId, orderNumber, sessionId, packerId);
                this.sendMessage(shared_1.WsEvents.RECORDING_STARTED, {
                    stationId: agent_config_js_1.agentConfig.stationId,
                    orderId,
                    sessionId,
                    startedAt: new Date().toISOString(),
                });
            }
            else if (msg.event === shared_1.WsEvents.STOP_RECORDING) {
                const active = ffmpeg_recorder_js_1.recorder.getCurrentSession();
                if (active) {
                    ffmpeg_recorder_js_1.recorder.stopRecording().then((result) => {
                        this.sendMessage(shared_1.WsEvents.RECORDING_STOPPED, {
                            stationId: agent_config_js_1.agentConfig.stationId,
                            orderId: active.orderId,
                            sessionId: active.sessionId,
                            durationSeconds: result.durationSeconds,
                        });
                        // Asynchronously upload to Supabase Storage
                        uploader_js_1.uploader.uploadRecording(active.orderId, active.sessionId, result.filePath, result.durationSeconds);
                    });
                }
            }
        }
        catch (err) {
            localLogger_js_1.agentLogger.error("Error processing cloud message:", err);
        }
    }
    sendMessage(event, payload) {
        if (this.ws && this.ws.readyState === ws_1.WebSocket.OPEN) {
            const message = {
                event,
                payload,
                timestamp: new Date().toISOString(),
            };
            this.ws.send(JSON.stringify(message));
        }
    }
    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            this.sendMessage(shared_1.WsEvents.HEARTBEAT, {
                stationId: agent_config_js_1.agentConfig.stationId,
                status: ffmpeg_recorder_js_1.recorder.isRecording() ? shared_1.StationStatus.BUSY : shared_1.StationStatus.ONLINE,
                cameraStatus: ffmpeg_recorder_js_1.recorder.isRecording() ? shared_1.CameraStatus.RECORDING : streamMonitor_js_1.streamMonitor.getStatus(),
                timestamp: new Date().toISOString(),
            });
        }, 10000);
    }
    scheduleReconnect() {
        if (!this.reconnectTimer) {
            this.reconnectTimer = setTimeout(() => {
                this.reconnectTimer = null;
                this.connect();
            }, 5000);
        }
    }
    cleanup() {
        if (this.heartbeatTimer)
            clearInterval(this.heartbeatTimer);
    }
}
exports.AgentWsClient = AgentWsClient;
exports.wsClient = new AgentWsClient();
