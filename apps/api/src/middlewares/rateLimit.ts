import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response.js";

/**
 * A simple per-address limit, kept in memory. It slows down guessing and scraping of public endpoints.
 * Behind a proxy, the API must trust it (app.set("trust proxy")) so each visitor is counted separately.
 */
export function rateLimit(opts: { windowMs: number; max: number; message?: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Forget finished windows now and then so the table cannot grow forever.
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, opts.windowMs).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip || "unknown";
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > opts.max) {
      res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return sendError(res, opts.message || "Too many requests. Try again in a moment.", 429);
    }
    return next();
  };
}
