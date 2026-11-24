import type { ActiveDevice } from "./shipproofApi";

/** A reason packing could not start, with what the packer can do about it. */
export interface StartIssue {
  kind: "server" | "no-camera" | "camera-error" | "no-response" | "start-failed";
  title: string;
  detail: string;
  steps: string[];
}

export const issues = {
  /** The dashboard cannot talk to the ShipProof server. */
  server: (): StartIssue => ({
    kind: "server",
    title: "Can't reach the ShipProof server",
    detail: "The dashboard has no connection to the ShipProof server, so it can't send the start command to the camera.",
    steps: [
      "Check that the ShipProof API is running (run npm run dev:api, or npm run dev:all).",
      "Check this computer's internet or network connection.",
      "Refresh the page, then try again.",
    ],
  }),

  /** No camera device is connected to ShipProof. */
  noCamera: (): StartIssue => ({
    kind: "no-camera",
    title: "No camera is connected",
    detail: "ShipProof can't find a camera at the packing station, so there is nothing to record with.",
    steps: [
      "Open your camera app (for example Iriun Webcam) and make sure it shows a live picture.",
      "Start the camera agent on the packing station (run npm run dev:agent).",
      "Wait a few seconds until the Orders page says \"Camera ready\", then try again.",
    ],
  }),

  /** The camera is connected but reports a fault. */
  cameraError: (): StartIssue => ({
    kind: "camera-error",
    title: "The camera reports a problem",
    detail: "The camera is connected, but it says it isn't working properly.",
    steps: [
      "Check the camera's cable or Wi-Fi connection.",
      "Close and reopen the camera app, then restart the camera agent.",
      "Try again once the camera shows a live picture.",
    ],
  }),

  /** The command was sent but the camera agent never answered. */
  noResponse: (): StartIssue => ({
    kind: "no-response",
    title: "The camera didn't respond",
    detail: "The start command was sent, but the camera agent did not answer in time.",
    steps: [
      "Look at the camera agent window for an error message.",
      "Restart the camera agent (run npm run dev:agent), then try again.",
    ],
  }),

  /** The camera agent answered with an error, for example not enough disk space. */
  startFailed: (reason?: string): StartIssue => ({
    kind: "start-failed",
    title: "The camera couldn't start recording",
    detail: reason || "The camera agent could not start the recording.",
    steps: ["Fix the problem described above (for example, free up disk space).", "Then try again."],
  }),
};

/**
 * Checks, before a start is attempted, whether the setup can record. Returns the first problem found, or
 * null when it looks fine. `reachable` is whether the ShipProof server answered (null when it has not yet).
 */
export function diagnose(reachable: boolean | null, info: ActiveDevice | null): StartIssue | null {
  if (reachable === false) return issues.server();
  // No answer yet, or no device at all: there is no camera to record with.
  if (reachable === null) return issues.server();
  if (!info || !info.connected) return issues.noCamera();
  if (info.cameraStatus === "DISCONNECTED") return issues.noCamera();
  if (info.cameraStatus === "ERROR") return issues.cameraError();
  return null;
}
