import fs from "fs";
import path from "path";
import { agentConfig } from "../config/agent.config.js";
import { agentLogger } from "../utils/localLogger.js";

export class FileManager {
  init() {
    if (!fs.existsSync(agentConfig.recordingsDir)) {
      fs.mkdirSync(agentConfig.recordingsDir, { recursive: true });
      agentLogger.info(
        `Created local recordings directory: ${agentConfig.recordingsDir}`,
      );
    }
  }

  getTempFilePath(orderId: string, sessionId: string): string {
    const filename = `${orderId}_${sessionId}.mp4`;
    return path.join(agentConfig.recordingsDir, filename);
  }

  getFileSize(filePath: string): number {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  deleteLocalFile(filePath: string) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        agentLogger.info(`Cleaned up local video file: ${filePath}`);
      }
    } catch (err) {
      agentLogger.error(`Failed to delete local file: ${filePath}`, err);
    }
  }
}

export const fileManager = new FileManager();
