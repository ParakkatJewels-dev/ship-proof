import { execSync } from "child_process";
import { agentLogger } from "./localLogger.js";

export interface DiscoveredCamera {
  name: string;
  type: "dshow" | "v4l2" | "rtsp" | "mock";
}

export function discoverConnectedCameras(): DiscoveredCamera[] {
  const isWindows = process.platform === "win32";

  if (isWindows) {
    try {
      // DirectShow query on Windows via ffmpeg
      const output = execSync('ffmpeg -list_devices true -f dshow -i dummy 2>&1', {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      const lines = output.split("\n");
      const cameras: DiscoveredCamera[] = [];

      for (const line of lines) {
        if (line.includes('(video)') && line.includes('"')) {
          const match = line.match(/"([^"]+)"/);
          if (match) {
            cameras.push({ name: match[1], type: "dshow" });
          }
        }
      }

      if (cameras.length > 0) return cameras;
    } catch (e: any) {
      // FFmpeg list_devices exits with code 1 by design while outputting to stderr
      const stderr = e.stdout || e.stderr || "";
      const matches = stderr.match(/"([^"]+)"\s+\(video\)/g);
      if (matches) {
        return matches.map((m: string) => ({
          name: m.replace(/\(video\)/, "").replace(/"/g, "").trim(),
          type: "dshow",
        }));
      }
    }
  }

  // Fallback virtual camera
  agentLogger.info("No physical DirectShow camera found; using primary USB/virtual capture interface.");
  return [{ name: "Default Webcam / USB Camera 0", type: "dshow" }];
}
