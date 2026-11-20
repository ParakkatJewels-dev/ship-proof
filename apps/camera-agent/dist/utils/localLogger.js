"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentLogger = void 0;
exports.agentLogger = {
    info: (msg, meta) => console.log(`[AGENT ${new Date().toLocaleTimeString()}] [INFO] ${msg}`, meta ? meta : ""),
    warn: (msg, meta) => console.warn(`[AGENT ${new Date().toLocaleTimeString()}] [WARN] ${msg}`, meta ? meta : ""),
    error: (msg, meta) => console.error(`[AGENT ${new Date().toLocaleTimeString()}] [ERROR] ${msg}`, meta ? meta : ""),
};
