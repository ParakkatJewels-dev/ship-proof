import type { ActiveDevice } from "./shipproofApi";

/** A reason packing could not start, with what the packer can do about it. */
export interface StartIssue {
  kind:
    | "server"
    | "no-camera"
    | "camera-error"
    | "no-response"
    | "start-failed"
    | "agent-unreachable";
  title: string;
  detail: string;
  steps: string[];
}

export const issues = {
  /** The dashboard cannot talk to the ShipProof server. */
  server: (): StartIssue => ({
    kind: "server",
    title: "Can't reach the ShipProof server",
    detail:
      "The dashboard has no connection to the ShipProof server, so it can't send the start command to the camera.",
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
    detail:
      "ShipProof can't find a camera at the packing station, so there is nothing to record with.",
    steps: [
      "Open your camera app (for example Iriun Webcam) and make sure it shows a live picture.",
      "Start the camera agent on the packing station (run npm run dev:agent).",
      'Wait a few seconds until the Orders page says "Camera ready", then try again.',
    ],
  }),

  /** DVR / IP camera (RTSP): the camera agent cannot reach the stream. */
  dvrUnreachable: (): StartIssue => ({
    kind: "no-camera",
    title: "Can't reach the CCTV camera",
    detail:
      "The camera agent can't get video from the DVR / IP camera, so there is nothing to record with.",
    steps: [
      "Check that the DVR is switched on and its network cable is connected.",
      "Check that this computer is on the same network as the DVR (wired is best).",
      "If the DVR's address or channel changed, update RTSP_STREAM_URL in the camera agent settings and restart the agent.",
    ],
  }),

  /** DVR / IP camera (RTSP): the user name or password was refused. */
  dvrLoginRefused: (): StartIssue => ({
    kind: "camera-error",
    title: "The DVR refused the camera login",
    detail:
      "The DVR / IP camera did not accept the user name or password the camera agent uses.",
    steps: [
      "Ask the CCTV technician to check the ShipProof user on the DVR (it may be locked after wrong passwords).",
      "Fix the user name or password in RTSP_STREAM_URL in the camera agent settings.",
      'Restart the camera agent, wait for "Camera ready", then try again.',
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

  /** The camera program on this computer did not answer: it isn't running, or this isn't the packing computer. */
  agentUnreachable: (): StartIssue => ({
    kind: "agent-unreachable",
    title: "Can't reach the camera on this computer",
    detail:
      "Recording starts from the packing computer, where the ShipProof camera program runs. It did not answer.",
    steps: [
      "Use ShipProof on the packing computer (the one with the camera and barcode scanner).",
      "Check that the camera agent is running there (run npm run dev:agent).",
      "If the browser asks to allow access to devices on your local network, choose Allow.",
    ],
  }),

  /** The command was sent but the camera agent never answered. */
  noResponse: (): StartIssue => ({
    kind: "no-response",
    title: "The camera didn't respond",
    detail:
      "The start command was sent, but the camera agent on this computer did not answer in time.",
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
    steps: [
      "Fix the problem described above (for example, free up disk space).",
      "Then try again.",
    ],
  }),
};

/**
 * Checks, before a start is attempted, whether the setup can record. Returns the first problem found, or
 * null when it looks fine. `reachable` is whether the ShipProof server answered (null when it has not yet).
 */
export function diagnose(
  reachable: boolean | null,
  info: ActiveDevice | null,
): StartIssue | null {
  if (reachable === false) return issues.server();
  // No answer yet, or no device at all: there is no camera to record with.
  if (reachable === null) return issues.server();
  if (!info || !info.connected) return issues.noCamera();
  // A DVR / IP camera (RTSP) gets advice about the DVR and network, not about a webcam app.
  const dvr = /RTSP/i.test(info.cameraName);
  if (info.cameraStatus === "DISCONNECTED")
    return dvr ? issues.dvrUnreachable() : issues.noCamera();
  if (info.cameraStatus === "ERROR")
    return dvr ? issues.dvrLoginRefused() : issues.cameraError();
  return null;
}
