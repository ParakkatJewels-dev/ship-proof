import Swal from "sweetalert2";
import type { StartIssue } from "./startIssues";

const BLUE = "#3654D6";

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

/** A centered alert with an OK button. Success alerts close themselves after a few seconds. */
export function showToast(tone: "ok" | "error", text: string, title?: string) {
  return Swal.fire({
    icon: tone === "ok" ? "success" : "error",
    title: title ?? (tone === "ok" ? "Done" : "Something went wrong"),
    text,
    confirmButtonText: "OK",
    confirmButtonColor: BLUE,
    timer: tone === "ok" ? 6000 : undefined,
    timerProgressBar: tone === "ok",
  });
}

/** A "saving" dialog with a moving progress bar. It stays until another alert replaces it or it is closed. */
export function showSavingProgress(orderNumber: string) {
  return Swal.fire({
    title: "Saving video…",
    html: `<p style="margin:0 0 16px">Saving the recording for ${escapeHtml(orderNumber)}. Please wait.</p>
      <div style="height:8px;border-radius:999px;background:#EAEEFC;overflow:hidden">
        <div style="height:100%;width:40%;border-radius:999px;background:${BLUE};animation:sp-slide 1.1s ease-in-out infinite"></div>
      </div>
      <style>@keyframes sp-slide{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}</style>`,
    showConfirmButton: false,
    allowOutsideClick: false,
    allowEscapeKey: false,
  });
}

/** A "starting" dialog shown until the camera confirms recording (it is then closed or replaced). */
export function showStartingCamera() {
  return Swal.fire({
    title: "Starting the camera…",
    text: "Waiting for the camera to confirm it is recording.",
    didOpen: () => Swal.showLoading(),
    showConfirmButton: false,
    allowOutsideClick: false,
    allowEscapeKey: false,
  });
}

export const closeAlert = () => Swal.close();

/** Asks before a saved video is replaced by a new recording. Resolves to true when the packer agrees. */
export async function confirmRetake(orderNumber: string): Promise<boolean> {
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
