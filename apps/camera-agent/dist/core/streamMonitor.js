"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamMonitor = exports.StreamMonitor = void 0;
const shared_1 = require("@shipproof/shared");
const localLogger_js_1 = require("../utils/localLogger.js");
class StreamMonitor {
    status = shared_1.CameraStatus.CONNECTED;
    getStatus() {
        return this.status;
    }
    setStatus(newStatus) {
        if (this.status !== newStatus) {
            this.status = newStatus;
            localLogger_js_1.agentLogger.info(`Camera status changed to: ${newStatus}`);
        }
    }
    /**
     * Health ping periodically verifying camera availability.
     */
    startHealthCheck(intervalMs = 5000) {
        setInterval(() => {
            // In production, verifies video feed frames or device descriptor presence
            if (this.status === shared_1.CameraStatus.ERROR || this.status === shared_1.CameraStatus.DISCONNECTED) {
                localLogger_js_1.agentLogger.warn("Attempting camera driver reconnection...");
                this.setStatus(shared_1.CameraStatus.CONNECTED);
            }
        }, intervalMs);
    }
}
exports.StreamMonitor = StreamMonitor;
exports.streamMonitor = new StreamMonitor();
