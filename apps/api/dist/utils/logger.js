"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
function formatMessage(level, message, meta) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}
exports.logger = {
    info: (msg, meta) => console.log(formatMessage("info", msg, meta)),
    warn: (msg, meta) => console.warn(formatMessage("warn", msg, meta)),
    error: (msg, meta) => console.error(formatMessage("error", msg, meta)),
    debug: (msg, meta) => {
        if (process.env.NODE_ENV !== "production") {
            console.debug(formatMessage("debug", msg, meta));
        }
    },
};
