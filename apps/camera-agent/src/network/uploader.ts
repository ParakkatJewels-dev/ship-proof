import fs from "fs";
import path from "path";
import { agentConfig } from "../config/agent.config.js";
import { agentLogger } from "../utils/localLogger.js";
import { fileManager } from "../core/fileManager.js";

export class VideoUploader {
  /**
   * Uploads recorded video directly to Supabase Storage using presigned URL obtained from Cloud API.
   */
  async uploadRecording(
    orderId: string,
    sessionId: string,
    filePath: string,
    durationSeconds: number
  ): Promise<boolean> {
    agentLogger.info(`Starting cloud upload pipeline for Order ${orderId}...`);

    try {
      const fileName = path.basename(filePath);
      const fileSizeBytes = fileManager.getFileSize(filePath);

      // 1. Request presigned upload URL from Cloud API
      const requestRes = await fetch(`${agentConfig.cloudApiUrl}/api/videos/upload-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Station-Id": agentConfig.stationId,
          "X-Station-Key": agentConfig.stationApiKey,
        },
        body: JSON.stringify({
          orderId,
          sessionId,
          stationId: agentConfig.stationId,
          fileName,
        }),
      });

      if (!requestRes.ok) {
        throw new Error(`Failed to obtain upload URL from Cloud API: ${requestRes.statusText}`);
      }

      const { data: uploadInfo } = (await requestRes.json()) as any;
      agentLogger.info(`Acquired presigned upload URL for path: ${uploadInfo.storagePath}`);

      // 2. Direct HTTP PUT upload to Supabase Storage
      const fileBuffer = fs.readFileSync(filePath);
      if (!uploadInfo.signedUrl.includes("mock-storage")) {
        const uploadRes = await fetch(uploadInfo.signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "video/mp4",
          },
          body: fileBuffer,
        });

        if (!uploadRes.ok) {
          throw new Error(`Storage direct upload failed with status ${uploadRes.status}`);
        }
      }

      // 3. Notify Cloud API of upload completion
      const completeRes = await fetch(`${agentConfig.cloudApiUrl}/api/videos/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Station-Id": agentConfig.stationId,
          "X-Station-Key": agentConfig.stationApiKey,
        },
        body: JSON.stringify({
          orderId,
          sessionId,
          fileSizeBytes,
          durationSeconds,
        }),
      });

      if (!completeRes.ok) {
        throw new Error("Failed to finalize video record with backend");
      }

      agentLogger.info(`Video successfully uploaded and registered for Order ${orderId}!`);

      // 4. Clean up local temp file after confirmed cloud persistence
      fileManager.deleteLocalFile(filePath);
      return true;
    } catch (err: any) {
      agentLogger.error("Upload pipeline error:", err.message);
      return false;
    }
  }
}

export const uploader = new VideoUploader();
