import express from "express";
import cors from "cors";
import { agentConfig } from "../config/agent.config.js";
import { recorder } from "../core/ffmpeg.recorder.js";
import { uploader } from "./uploader.js";
import { streamMonitor } from "../core/streamMonitor.js";
import { agentLogger } from "../utils/localLogger.js";

export function createLocalHttpServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health & Station status
  app.get("/status", (_req, res) => {
    res.json({
      stationId: agentConfig.stationId,
      stationName: agentConfig.stationName,
      isRecording: recorder.isRecording(),
      cameraStatus: streamMonitor.getStatus(),
      activeSession: recorder.getCurrentSession(),
    });
  });

  // Local instant recording start trigger (Zero latency)
  app.post("/record/start", (req, res) => {
    try {
      const { orderId, orderNumber, sessionId, packerId } = req.body;
      if (!orderId || !sessionId) {
        return res.status(400).json({ error: "orderId and sessionId are required" });
      }

      const session = recorder.startRecording(
        orderId,
        orderNumber || `#${orderId}`,
        sessionId,
        packerId || "packer-station"
      );
      return res.json({ success: true, session });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Local instant recording stop trigger
  app.post("/record/stop", async (_req, res) => {
    try {
      const active = recorder.getCurrentSession();
      if (!active) {
        return res.status(400).json({ error: "No active recording session" });
      }

      const result = await recorder.stopRecording();

      // Trigger asynchronous background upload to Supabase
      uploader.uploadRecording(active.orderId, active.sessionId, result.filePath, result.durationSeconds);

      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  return app;
}
