import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Router, Request, Response } from "express";
import { config } from "../../config/env.config.js";
import { DEV_DATA_DIR } from "../../utils/devData.js";

/**
 * Local demo mode only (no Supabase configured): stores video files in .dev-data/videos on this computer
 * and serves them, standing in for Supabase Storage. Addresses carry a short-lived signed token like real
 * signed URLs. Mounted only outside production and only without Supabase (see createApp).
 */
const ROOT = path.join(DEV_DATA_DIR, "videos");
const apiBase = () => config.publicUrl || `http://localhost:${config.port}`;

/** The file for a storage path, refusing anything that would leave the folder. */
function devFile(storagePath: string): string {
  const file = path.resolve(ROOT, storagePath);
  if (!file.startsWith(ROOT + path.sep)) throw new Error("Invalid storage path");
  return file;
}

const sign = (action: string, storagePath: string, expires: number) =>
  crypto.createHmac("sha256", config.jwtSecret).update(`${action}:${storagePath}:${expires}`).digest("hex");

function signedUrl(action: "upload" | "files", storagePath: string, seconds: number, extra = "") {
  const expires = Date.now() + seconds * 1000;
  const token = sign(action, storagePath, expires);
  const encoded = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${apiBase()}/dev-storage/${action}/${encoded}?expires=${expires}&token=${token}${extra}`;
}

export const devStorage = {
  uploadUrl: (storagePath: string) => signedUrl("upload", storagePath, 2 * 60 * 60),
  downloadUrl: (storagePath: string, seconds: number, downloadAs?: string) =>
    signedUrl("files", storagePath, seconds, downloadAs ? `&download=${encodeURIComponent(downloadAs)}` : ""),
  size(storagePath: string): number | null {
    try {
      return fs.statSync(devFile(storagePath)).size;
    } catch {
      return null;
    }
  },
  remove(storagePath: string) {
    fs.rmSync(devFile(storagePath), { force: true });
  },
};

/** The storage path in a /upload/... or /files/... address, if its token is valid and not expired. */
function verified(req: Request, action: "upload" | "files"): string | null {
  const rest = req.path.slice(`/${action}/`.length);
  const storagePath = rest.split("/").map(decodeURIComponent).join("/");
  const expires = Number(req.query.expires);
  const token = String(req.query.token || "");
  if (!storagePath || !Number.isFinite(expires) || expires < Date.now()) return null;
  const expected = sign(action, storagePath, expires);
  if (token.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) return null;
  return storagePath;
}

export function devStorageRoutes() {
  const router = Router();

  router.put(/^\/upload\/.+/, (req: Request, res: Response) => {
    const storagePath = verified(req, "upload");
    if (!storagePath) return res.status(403).json({ error: "Upload address not valid" });
    const file = devFile(storagePath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const out = fs.createWriteStream(file);
    req.pipe(out);
    out.on("finish", () => res.status(200).json({ Key: storagePath }));
    out.on("error", (err) => res.status(500).json({ error: err.message }));
  });

  router.get(/^\/files\/.+/, (req: Request, res: Response) => {
    const storagePath = verified(req, "files");
    if (!storagePath) return res.status(403).end();
    const download = typeof req.query.download === "string" ? req.query.download : null;
    res.setHeader("Cache-Control", "no-store");
    // The video player on the dashboard or watch page loads this from another address.
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    if (download) res.attachment(download);
    res.sendFile(devFile(storagePath), (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  });

  return router;
}
