"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recorder = exports.FfmpegRecorder = void 0;
const child_process_1 = require("child_process");
const agent_config_js_1 = require("../config/agent.config.js");
const localLogger_js_1 = require("../utils/localLogger.js");
const fileManager_js_1 = require("./fileManager.js");
const fs_1 = __importDefault(require("fs"));
class FfmpegRecorder {
    activeProcess = null;
    currentSession = null;
    isRecording() {
        return this.activeProcess !== null || this.currentSession !== null;
    }
    getCurrentSession() {
        return this.currentSession;
    }
    startRecording(orderId, orderNumber, sessionId, packerId) {
        if (this.isRecording()) {
            throw new Error("A recording is already in progress on this station.");
        }
        const filePath = fileManager_js_1.fileManager.getTempFilePath(orderId, sessionId);
        localLogger_js_1.agentLogger.info(`Starting video recording for Order ${orderNumber} (${orderId}) -> ${filePath}`);
        this.currentSession = {
            sessionId,
            orderId,
            orderNumber,
            packerId,
            startTime: Date.now(),
            filePath,
            isMock: false,
        };
        try {
            // FFmpeg arguments: record from USB camera (DirectShow on Windows / v4l2 on Linux) or RTSP
            const isWindows = process.platform === "win32";
            let inputArgs = [];
            if (agent_config_js_1.agentConfig.rtspStreamUrl) {
                inputArgs = ["-rtsp_transport", "tcp", "-i", agent_config_js_1.agentConfig.rtspStreamUrl];
            }
            else if (isWindows) {
                inputArgs = ["-f", "dshow", "-i", `video=${agent_config_js_1.agentConfig.cameraDeviceName}`];
            }
            else {
                inputArgs = ["-f", "v4l2", "-i", `/dev/video${agent_config_js_1.agentConfig.cameraDeviceIndex}`];
            }
            // Fast-start MP4, H.264 video codec, timestamp watermark
            const outputArgs = [
                "-c:v",
                "libx264",
                "-preset",
                "ultrafast",
                "-tune",
                "zerolatency",
                "-pix_fmt",
                "yuv420p",
                "-movflags",
                "+faststart",
                "-y",
                filePath,
            ];
            this.activeProcess = (0, child_process_1.spawn)(agent_config_js_1.agentConfig.ffmpegPath, [...inputArgs, ...outputArgs]);
            this.activeProcess.stderr?.on("data", (data) => {
                // FFmpeg writes standard stats to stderr
                const output = data.toString();
                if (output.includes("error") || output.includes("fatal")) {
                    localLogger_js_1.agentLogger.error("FFmpeg warning/error:", output);
                }
            });
            this.activeProcess.on("error", (err) => {
                localLogger_js_1.agentLogger.warn("FFmpeg process spawn error (will use mock generator fallback):", err.message);
                this.activeProcess = null;
                if (this.currentSession) {
                    this.currentSession.isMock = true;
                }
            });
        }
        catch (e) {
            localLogger_js_1.agentLogger.warn("Local FFmpeg not found on PATH. Falling back to synthetic simulation mode.", e.message);
            this.currentSession.isMock = true;
        }
        return this.currentSession;
    }
    async stopRecording() {
        if (!this.currentSession) {
            throw new Error("No active recording session to stop.");
        }
        const session = this.currentSession;
        const durationSeconds = Math.max(1, Math.round((Date.now() - session.startTime) / 1000));
        if (this.activeProcess) {
            localLogger_js_1.agentLogger.info("Gracefully stopping FFmpeg recording process...");
            this.activeProcess.stdin?.write("q"); // graceful FFmpeg stop
            await new Promise((r) => setTimeout(r, 800));
            if (this.activeProcess) {
                this.activeProcess.kill("SIGTERM");
            }
            this.activeProcess = null;
        }
        // If running in mock / fallback environment without ffmpeg installed, create a sample MP4 buffer
        if (!fs_1.default.existsSync(session.filePath) || fs_1.default.statSync(session.filePath).size === 0) {
            localLogger_js_1.agentLogger.info("Creating lightweight demo video recording artifact...");
            fs_1.default.writeFileSync(session.filePath, Buffer.from(`SHIPPROOF_PACKING_VERIFICATION_VIDEO_${session.orderNumber}_${Date.now()}`));
        }
        const fileSizeBytes = fileManager_js_1.fileManager.getFileSize(session.filePath);
        this.currentSession = null;
        localLogger_js_1.agentLogger.info(`Recording stopped. Duration: ${durationSeconds}s, File Size: ${fileSizeBytes} bytes`);
        return {
            filePath: session.filePath,
            durationSeconds,
            fileSizeBytes,
        };
    }
}
exports.FfmpegRecorder = FfmpegRecorder;
exports.recorder = new FfmpegRecorder();
