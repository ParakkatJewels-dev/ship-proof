import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env.config.js";
import { sendError } from "../utils/response.js";
import { UserRole } from "@shipproof/shared";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    stationId?: string;
  };
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // 1. Check for Station Key header (used by Camera Agent)
  const stationKey = req.headers["x-station-key"] as string;
  const stationId = req.headers["x-station-id"] as string;
  if (stationKey && stationId) {
    req.user = {
      id: stationId,
      role: UserRole.STATION,
      stationId,
    };
    return next();
  }

  // 2. Check for Bearer JWT token (used by Admin/Packer web)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // In dev mode, allow fallback guest packer for ease of testing
    if (config.nodeEnv !== "production") {
      req.user = {
        id: "packer-dev-1",
        role: UserRole.PACKER,
        stationId: "11111111-1111-1111-1111-111111111111",
      };
      return next();
    }
    return sendError(res, "Missing or invalid authorization token", 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = decoded;
    return next();
  } catch (err) {
    return sendError(res, "Invalid or expired token", 401);
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, "Forbidden: insufficient permissions", 403);
    }
    next();
  };
}
