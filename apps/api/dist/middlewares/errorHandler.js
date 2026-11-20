"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const logger_js_1 = require("../utils/logger.js");
const response_js_1 = require("../utils/response.js");
function errorHandler(err, req, res, next) {
    logger_js_1.logger.error("Unhandled API Error:", {
        path: req.path,
        method: req.method,
        error: err?.message || err,
        stack: err?.stack,
    });
    const statusCode = err.status || err.statusCode || 500;
    const message = err.message || "Internal server error occurred";
    return (0, response_js_1.sendError)(res, message, statusCode);
}
