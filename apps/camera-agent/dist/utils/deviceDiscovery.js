"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverConnectedCameras = discoverConnectedCameras;
const child_process_1 = require("child_process");
const localLogger_js_1 = require("./localLogger.js");
function discoverConnectedCameras() {
    const isWindows = process.platform === "win32";
    if (isWindows) {
        try {
            // DirectShow query on Windows via ffmpeg
            const output = (0, child_process_1.execSync)('ffmpeg -list_devices true -f dshow -i dummy 2>&1', {
                encoding: "utf8",
                stdio: ["pipe", "pipe", "pipe"],
            });
            const lines = output.split("\n");
            const cameras = [];
            for (const line of lines) {
                if (line.includes('(video)') && line.includes('"')) {
                    const match = line.match(/"([^"]+)"/);
                    if (match) {
                        cameras.push({ name: match[1], type: "dshow" });
                    }
                }
            }
            if (cameras.length > 0)
                return cameras;
        }
        catch (e) {
            // FFmpeg list_devices exits with code 1 by design while outputting to stderr
            const stderr = e.stdout || e.stderr || "";
            const matches = stderr.match(/"([^"]+)"\s+\(video\)/g);
            if (matches) {
                return matches.map((m) => ({
                    name: m.replace(/\(video\)/, "").replace(/"/g, "").trim(),
                    type: "dshow",
                }));
            }
        }
    }
    // Fallback virtual camera
    localLogger_js_1.agentLogger.info("No physical DirectShow camera found; using primary USB/virtual capture interface.");
    return [{ name: "Default Webcam / USB Camera 0", type: "dshow" }];
}
