import { Router } from "express";
import { videoService } from "../videos/video.service.js";
import { rateLimit } from "../../middlewares/rateLimit.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { logger } from "../../utils/logger.js";

const router = Router();

// The customer watch link. No sign-in: the secret in the link is the credential. Limited per address so it
// cannot be used to guess links.
router.get("/:token", rateLimit({ windowMs: 60_000, max: 60 }), async (req, res) => {
  // A link is private to the person who got it: never cached, never indexed, never passed on as a referrer.
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");

  try {
    const result = await videoService.resolveWatch(String(req.params.token || ""));
    const status = result.state === "ready" ? 200 : result.state === "expired" ? 410 : 404;
    return sendSuccess(res, result, undefined, status);
  } catch (err) {
    logger.error("Watch link lookup failed:", err);
    return sendError(res, "Something went wrong. Try again.", 500);
  }
});

export default router;
