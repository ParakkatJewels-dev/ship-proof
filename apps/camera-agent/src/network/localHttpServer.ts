import express from "express";
import cors from "cors";
import { agentConfig } from "../config/agent.config.js";
import { recorder } from "../core/ffmpeg.recorder.js";
import path from "path";
import {
  discardSession,
  findReviewSession,
  approveSession,
} from "../core/review.js";
import { uploadQueue } from "./uploadQueue.js";
import { streamMonitor } from "../core/streamMonitor.js";
import { agentLogger } from "../utils/localLogger.js";
import { findSavedCopy, savedToken, trimSavedCopy } from "../core/saved.js";
import { probeDurationSeconds } from "../core/review.js";

export function createLocalHttpServer() {
  const app = express();
  // Only the ShipProof dashboard may use this port. CORS alone does not stop a request from being sent,
  // so requests from any other website are refused outright.
  const allowed = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim());
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && !allowed.includes(origin))
      return res.status(403).json({ error: "Origin not allowed" });
    next();
  });
  app.use(cors({ origin: allowed }));
  app.use(express.json());

  // Live preview of the recording in progress. Needs the one-time key of the current recording, so a
  // website that guesses this address still cannot see the camera.
  const previewAllowed = (req: express.Request) => {
    const session = recorder.getCurrentSession();
    return !!session && req.query.token === session.previewToken;
  };

  app.get("/preview.jpg", (req, res) => {
    if (!previewAllowed(req)) return res.status(403).end();
    const frame = recorder.getPreviewFrame();
    if (!frame) return res.status(204).end();
    res.set({ "Content-Type": "image/jpeg", "Cache-Control": "no-store" });
    return res.end(frame);
  });

  app.get("/preview.mjpg", (req, res) => {
    if (!previewAllowed(req)) return res.status(403).end();
    res.writeHead(200, {
      "Content-Type": "multipart/x-mixed-replace; boundary=frame",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    });
    const send = (frame: Buffer) => {
      res.write(
        `--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`,
      );
      res.write(frame);
      res.write("\r\n");
    };
    const first = recorder.getPreviewFrame();
    if (first) send(first);
    const unsubscribe = recorder.onPreviewFrame((frame) =>
      frame ? send(frame) : res.end(),
    );
    req.on("close", unsubscribe);
  });

  // Review of a finished recording: play it, then save it (optionally trimmed) or throw it away. Every
  // route needs the one-time key issued when the recording stopped.
  const busyReviews = new Set<string>();

  app.get("/review/:file", (req, res) => {
    const name = /^(.+)\.mp4$/.exec(req.params.file);
    const found = name ? findReviewSession(name[1], req.query.token) : null;
    if (!found) return res.status(403).end();
    const file = path.join(found.dir, found.session.finalFile || "final.mp4");
    // sendFile answers byte-range requests too, which is what lets the player skip around the video.
    return res.sendFile(
      file,
      { headers: { "Cache-Control": "no-store" } },
      (err) => {
        if (err && !res.headersSent) res.status(404).end();
      },
    );
  });

  app.post("/review/:sessionId/save", async (req, res) => {
    const found = findReviewSession(req.params.sessionId, req.body?.token);
    if (!found)
      return res
        .status(403)
        .json({ error: "This recording is not waiting for review." });
    if (busyReviews.has(req.params.sessionId))
      return res
        .status(409)
        .json({ error: "This recording is already being saved." });
    busyReviews.add(req.params.sessionId);
    try {
      const start = Number(req.body?.start);
      const end = Number(req.body?.end);
      const approved = await approveSession(found.dir, {
        start: Number.isFinite(start) ? start : undefined,
        end: Number.isFinite(end) ? end : undefined,
      });
      uploadQueue.kick();
      return res.json({
        success: true,
        trimmed: !!approved.trimmed,
        durationSeconds: approved.durationSeconds,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    } finally {
      busyReviews.delete(req.params.sessionId);
    }
  });

  app.post("/review/:sessionId/discard", (req, res) => {
    const found = findReviewSession(req.params.sessionId, req.body?.token);
    if (!found)
      return res
        .status(403)
        .json({ error: "This recording is not waiting for review." });
    if (busyReviews.has(req.params.sessionId))
      return res.status(409).json({ error: "This recording is being saved." });
    discardSession(found.dir);
    return res.json({ success: true });
  });

  // Videos already saved: play them again or trim them while a copy is still on this computer.
  app.get("/saved/:order/info", (req, res) => {
    const copy = findSavedCopy(req.params.order);
    if (!copy)
      return res.status(404).json({ error: "No saved copy on this computer." });
    return res.json({
      token: savedToken,
      durationSeconds: probeDurationSeconds(copy.file),
    });
  });

  app.get("/saved/:order/video.mp4", (req, res) => {
    if (req.query.token !== savedToken) return res.status(403).end();
    const copy = findSavedCopy(req.params.order);
    if (!copy) return res.status(404).end();
    return res.sendFile(
      copy.file,
      { headers: { "Cache-Control": "no-store" } },
      (err) => {
        if (err && !res.headersSent) res.status(404).end();
      },
    );
  });

  app.post("/saved/:order/trim", async (req, res) => {
    if (req.body?.token !== savedToken)
      return res.status(403).json({ error: "Not allowed." });
    const { orderId, start, end } = req.body ?? {};
    if (!orderId) return res.status(400).json({ error: "orderId is required" });
    try {
      const out = await trimSavedCopy(String(orderId), req.params.order, {
        start: Number(start),
        end: Number(end),
      });
      uploadQueue.kick();
      return res.json({ success: true, ...out });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Health & Station status
  app.get("/status", (_req, res) => {
    res.json({
      stationId: agentConfig.stationId,
      stationName: agentConfig.stationName,
      isRecording: recorder.isRecording(),
      cameraStatus: streamMonitor.getStatus(),
      activeSession: recorder.getCurrentSession(),
      pendingUploads: uploadQueue.pending().length,
      lastUploadError: uploadQueue.lastError,
    });
  });

  // Local instant recording start trigger (Zero latency)
  app.post("/record/start", (req, res) => {
    try {
      const { orderId, orderNumber, sessionId, packerId } = req.body;
      if (!orderId || !sessionId) {
        return res
          .status(400)
          .json({ error: "orderId and sessionId are required" });
      }

      const session = recorder.startRecording(
        orderId,
        orderNumber || `#${orderId}`,
        sessionId,
        packerId || "packer-station",
      );
      return res.json({ success: true, session });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Local instant recording stop trigger
  app.post("/record/stop", async (req, res) => {
    try {
      const active = recorder.getCurrentSession();
      if (!active) {
        return res.status(400).json({ error: "No active recording session" });
      }

      const discard = req.body?.discard === true;
      const result = await recorder.stopRecording({ discard });

      // Upload in the background; the queue retries until the cloud confirms.
      if (!result.discarded) uploadQueue.kick();

      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  return app;
}
