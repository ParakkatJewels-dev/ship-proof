"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function sendSuccess(res, data, message, statusCode = 200) {
    const response = {
        success: true,
        message,
        data,
    };
    return res.status(statusCode).json(response);
}
function sendError(res, error, statusCode = 500) {
    const response = {
        success: false,
        error,
    };
    return res.status(statusCode).json(response);
}
