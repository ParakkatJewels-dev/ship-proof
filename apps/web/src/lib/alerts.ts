import type SwalType from "sweetalert2";
import type { StartIssue } from "./startIssues";
import { pushToast } from "./toasts";

const BLUE = "#3654D6";

// The alert library is loaded on first use, not with every page. It is also fetched quietly a few seconds
// after the page opens, so the first alert still appears at once. Until it has loaded no alert can be on
// screen, which is what closeAlert and isAlertOpen report.
let swal: typeof SwalType | null = null;
let loading: Promise<typeof SwalType> | null = null;
/** Counts closeAlert calls, so an alert asked for and closed while the library was loading never pops up late. */
let closes = 0;
const loadSwal = async () => {
  if (swal) return swal;
  const asked = closes;
  const lib = await (loading ??= import("sweetalert2").then(
    (m) => (swal = m.default),
  ));
  return closes === asked ? lib : null;
};
if (typeof window !== "undefined") setTimeout(() => void loadSwal(), 3000);

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Shows why packing can't start, with what to do. "Check again" runs `onCheckAgain`; when it returns true
 * the problem is gone and the alert closes. Resolves to true in that case, false if the packer closed it.
 */
export async function showStartProblem(
  issue: StartIssue,
  onCheckAgain: () => Promise<boolean>,
): Promise<boolean> {
  const steps = issue.steps
    .map((s, i) => `<li><b>${i + 1}.</b> ${escapeHtml(s)}</li>`)
    .join("");
  const Swal = await loadSwal();
  if (!Swal) return false;
  const result = await Swal.fire({
    icon: "warning",
    title: issue.title,
    html: `<p style="margin:0 0 12px">${escapeHtml(issue.detail)}</p>
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6B7080">What to do</p>
      <ol style="list-style:none;margin:0;padding:0;text-align:left;font-size:14px;display:grid;gap:6px">${steps}</ol>`,
    showCancelButton: true,
    confirmButtonText: "Check again",
    cancelButtonText: "Close",
    confirmButtonColor: BLUE,
    reverseButtons: true,
    focusCancel: true,
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    preConfirm: async () => {
      const fixed = await onCheckAgain();
      if (!fixed) {
        Swal.showValidationMessage(
          "Still not working. Follow the steps above, then check again.",
        );
        return false;
      }
      return true;
    },
  });
  return result.isConfirmed;
}

/**
 * Tells the packer something. Good news ("ok") appears as a small notice in the corner and fades away, so it never
 * gets in the way. Problems ("error") stay as a centered alert box with an OK button, because they need attention.
 */
export function showToast(tone: "ok" | "error", text: string, title?: string) {
  if (tone === "ok") {
    pushToast("ok", text);
    return Promise.resolve();
  }
  return loadSwal().then((Swal) =>
    Swal?.fire({
      icon: "error",
      title: title ?? "Something went wrong",
      text,
      confirmButtonText: "OK",
      confirmButtonColor: BLUE,
    }),
  );
}

/** A "starting" dialog shown until the camera confirms recording (it is then closed or replaced). */
export async function showStartingCamera() {
  const Swal = await loadSwal();
  if (!Swal) return;
  return Swal.fire({
    title: "Starting the camera…",
    text: "Waiting for the camera to confirm it is recording.",
    didOpen: () => Swal.showLoading(),
    showConfirmButton: false,
    allowOutsideClick: false,
    allowEscapeKey: false,
  });
}

export const closeAlert = () => {
  closes++;
  swal?.close();
};

/** True while any alert box is on the screen. */
export const isAlertOpen = () => !!swal?.isVisible();

let cameraAlertOpen = false;

/**
 * The "camera is missing or not working" alert box, shown by itself when the problem appears. It is tracked
 * so that it can be closed when the camera comes back, without ever closing some other alert.
 * Resolves to true when the problem was fixed from the box ("Check again"), false when it was just closed.
 */
export async function showCameraProblem(
  issue: StartIssue,
  onCheckAgain: () => Promise<boolean>,
): Promise<boolean> {
  cameraAlertOpen = true;
  try {
    return await showStartProblem(issue, onCheckAgain);
  } finally {
    cameraAlertOpen = false;
  }
}

/** Closes the camera alert if it is the one on the screen. */
export function closeCameraProblem() {
  if (cameraAlertOpen && swal?.isVisible()) swal.close();
}

/** Asks before a saved video is replaced by a new recording. Resolves to true when the packer agrees. */
export async function confirmRetake(orderNumber: string): Promise<boolean> {
  const Swal = await loadSwal();
  if (!Swal) return false;
  const result = await Swal.fire({
    icon: "question",
    title: `Retake ${orderNumber}?`,
    text: "This records the order again. The new video replaces the saved one once it is saved.",
    showCancelButton: true,
    confirmButtonText: "Retake",
    cancelButtonText: "Cancel",
    confirmButtonColor: BLUE,
    reverseButtons: true,
  });
  return result.isConfirmed;
}

/** Asks before signing out. Resolves to true when the person agrees. */
export async function confirmSignOut(): Promise<boolean> {
  const Swal = await loadSwal();
  if (!Swal) return false;
  const result = await Swal.fire({
    icon: "question",
    title: "Sign out?",
    text: "You will need to sign in again to use ShipProof.",
    showCancelButton: true,
    confirmButtonText: "Sign out",
    cancelButtonText: "Cancel",
    confirmButtonColor: BLUE,
    reverseButtons: true,
    focusCancel: true,
  });
  return result.isConfirmed;
}
