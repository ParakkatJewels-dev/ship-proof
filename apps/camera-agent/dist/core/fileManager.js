"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileManager = exports.FileManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const agent_config_js_1 = require("../config/agent.config.js");
const localLogger_js_1 = require("../utils/localLogger.js");
class FileManager {
    init() {
        if (!fs_1.default.existsSync(agent_config_js_1.agentConfig.recordingsDir)) {
            fs_1.default.mkdirSync(agent_config_js_1.agentConfig.recordingsDir, { recursive: true });
            localLogger_js_1.agentLogger.info(`Created local recordings directory: ${agent_config_js_1.agentConfig.recordingsDir}`);
        }
    }
    getTempFilePath(orderId, sessionId) {
        const filename = `${orderId}_${sessionId}.mp4`;
        return path_1.default.join(agent_config_js_1.agentConfig.recordingsDir, filename);
    }
    getFileSize(filePath) {
        try {
            const stats = fs_1.default.statSync(filePath);
            return stats.size;
        }
        catch {
            return 0;
        }
    }
    deleteLocalFile(filePath) {
        try {
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
                localLogger_js_1.agentLogger.info(`Cleaned up local video file: ${filePath}`);
            }
        }
        catch (err) {
            localLogger_js_1.agentLogger.error(`Failed to delete local file: ${filePath}`, err);
        }
    }
}
exports.FileManager = FileManager;
exports.fileManager = new FileManager();
