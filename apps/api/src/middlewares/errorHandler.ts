import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";
import { sendError } from "../utils/response.js";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  logger.error("Unhandled API Error:", {
    path: req.path,
    method: req.method,
    error: err?.message || err,
    stack: err?.stack,
  });

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error occurred";

  return sendError(res, message, statusCode);
}
