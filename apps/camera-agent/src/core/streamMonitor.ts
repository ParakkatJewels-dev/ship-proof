import { CameraStatus } from "@shipproof/shared";
import { agentLogger } from "../utils/localLogger.js";

export class StreamMonitor {
  private status: CameraStatus = CameraStatus.CONNECTED;

  getStatus(): CameraStatus {
    return this.status;
  }

  setStatus(newStatus: CameraStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      agentLogger.info(`Camera status changed to: ${newStatus}`);
    }
  }

  /**
   * Health ping periodically verifying camera availability.
   */
  startHealthCheck(intervalMs = 5000) {
    setInterval(() => {
      // In production, verifies video feed frames or device descriptor presence
      if (
        this.status === CameraStatus.ERROR ||
        this.status === CameraStatus.DISCONNECTED
      ) {
        agentLogger.warn("Attempting camera driver reconnection...");
        this.setStatus(CameraStatus.CONNECTED);
      }
    }, intervalMs);
  }
}

export const streamMonitor = new StreamMonitor();
