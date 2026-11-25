import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response.js";
import { UserRole } from "@shipproof/shared";
import { AuthError, authService } from "../modules/auth/auth.service.js";
import { verifyStationKey } from "../modules/stations/stationAuth.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    stationId?: string;
    email?: string;
    name?: string;
  };
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // 1. Station Key headers (used by the camera agent)
  const stationKey = req.headers["x-station-key"] as string;
  const stationId = req.headers["x-station-id"] as string;
  if (stationKey && stationId) {
    if (!(await verifyStationKey(stationId, stationKey))) {
      return sendError(res, "Camera station key not accepted.", 401);
    }
    req.user = { id: stationId, role: UserRole.STATION, stationId };
    return next();
  }

  // 2. A signed-in person: the access token from the login page
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, "Sign in to continue.", 401);
  }

  try {
    const user = await authService.verify(authHeader.split(" ")[1]);
    req.user = { id: user.id, role: user.role, email: user.email, name: user.name };
    return next();
  } catch (err) {
    return sendError(res, err instanceof AuthError ? err.message : "Invalid or expired token", 401);
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
