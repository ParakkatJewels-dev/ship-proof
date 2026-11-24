import { Request, Response } from "express";
import { sendError, sendSuccess } from "../../utils/response.js";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";
import { AuthError, authService } from "./auth.service.js";

/** Too many wrong passwords from one address slow down guessing. Kept in memory; resets on restart. */
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60_000;

function tooMany(key: string) {
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < Date.now()) return false;
  return entry.count >= MAX_ATTEMPTS;
}
function recordFailure(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count += 1;
}

const fail = (res: Response, err: unknown) =>
  err instanceof AuthError
    ? sendError(res, err.message, err.status)
    : sendError(res, "Something went wrong. Try again.", 500);

export const authController = {
  async login(req: Request, res: Response) {
    const email = String(req.body?.email ?? "");
    const key = `${req.ip}|${email.trim().toLowerCase()}`;
    if (tooMany(key)) return sendError(res, "Too many attempts. Wait a few minutes and try again.", 429);
    try {
      const session = await authService.login(email, String(req.body?.password ?? ""));
      attempts.delete(key);
      return sendSuccess(res, session);
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) recordFailure(key);
      return fail(res, err);
    }
  },

  async refresh(req: Request, res: Response) {
    try {
      return sendSuccess(res, await authService.refresh(String(req.body?.refreshToken ?? "")));
    } catch (err) {
      return fail(res, err);
    }
  },

  me(req: AuthenticatedRequest, res: Response) {
    return sendSuccess(res, req.user);
  },

  async logout(req: Request, res: Response) {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) await authService.logout(token);
    return sendSuccess(res, { signedOut: true });
  },
};
