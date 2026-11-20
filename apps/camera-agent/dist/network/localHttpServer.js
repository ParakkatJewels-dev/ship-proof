"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLocalHttpServer = createLocalHttpServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const agent_config_js_1 = require("../config/agent.config.js");
const ffmpeg_recorder_js_1 = require("../core/ffmpeg.recorder.js");
const uploader_js_1 = require("./uploader.js");
const streamMonitor_js_1 = require("../core/streamMonitor.js");
function createLocalHttpServer() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    // Health & Station status
    app.get("/status", (_req, res) => {
        res.json({
            stationId: agent_config_js_1.agentConfig.stationId,
            stationName: agent_config_js_1.agentConfig.stationName,
            isRecording: ffmpeg_recorder_js_1.recorder.isRecording(),
            cameraStatus: streamMonitor_js_1.streamMonitor.getStatus(),
            activeSession: ffmpeg_recorder_js_1.recorder.getCurrentSession(),
        });
    });
    // Local instant recording start trigger (Zero latency)
    app.post("/record/start", (req, res) => {
        try {
            const { orderId, orderNumber, sessionId, packerId } = req.body;
            if (!orderId || !sessionId) {
                return res.status(400).json({ error: "orderId and sessionId are required" });
            }
            const session = ffmpeg_recorder_js_1.recorder.startRecording(orderId, orderNumber || `#${orderId}`, sessionId, packerId || "packer-station");
            return res.json({ success: true, session });
        }
        catch (err) {
            return res.status(500).json({ error: err.message });
        }
    });
    // Local instant recording stop trigger
    app.post("/record/stop", async (_req, res) => {
        try {
            const active = ffmpeg_recorder_js_1.recorder.getCurrentSession();
            if (!active) {
                return res.status(400).json({ error: "No active recording session" });
            }
            const result = await ffmpeg_recorder_js_1.recorder.stopRecording();
            // Trigger asynchronous background upload to Supabase
            uploader_js_1.uploader.uploadRecording(active.orderId, active.sessionId, result.filePath, result.durationSeconds);
            return res.json({ success: true, ...result });
        }
        catch (err) {
            return res.status(500).json({ error: err.message });
        }
    });
    return app;
}
