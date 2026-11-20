"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_config_js_1 = require("../config/env.config.js");
const response_js_1 = require("../utils/response.js");
const shared_1 = require("@shipproof/shared");
function authenticate(req, res, next) {
    // 1. Check for Station Key header (used by Camera Agent)
    const stationKey = req.headers["x-station-key"];
    const stationId = req.headers["x-station-id"];
    if (stationKey && stationId) {
        req.user = {
            id: stationId,
            role: shared_1.UserRole.STATION,
            stationId,
        };
        return next();
    }
    // 2. Check for Bearer JWT token (used by Admin/Packer web)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        // In dev mode, allow fallback guest packer for ease of testing
        if (env_config_js_1.config.nodeEnv !== "production") {
            req.user = {
                id: "packer-dev-1",
                role: shared_1.UserRole.PACKER,
                stationId: "11111111-1111-1111-1111-111111111111",
            };
            return next();
        }
        return (0, response_js_1.sendError)(res, "Missing or invalid authorization token", 401);
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_config_js_1.config.jwtSecret);
        req.user = decoded;
        return next();
    }
    catch (err) {
        return (0, response_js_1.sendError)(res, "Invalid or expired token", 401);
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return (0, response_js_1.sendError)(res, "Forbidden: insufficient permissions", 403);
        }
        next();
    };
}
