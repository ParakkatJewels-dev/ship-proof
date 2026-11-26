"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useActiveDevice } from "../lib/useActiveDevice";
import { useOrders } from "../lib/useOrders";
import type { OrderRecord } from "../lib/orders";
import { usePacking } from "../lib/usePacking";
import { StartPackingModal } from "./StartPackingModal";
import {
  closeAlert,
  closeCameraProblem,
  isAlertOpen,
  showCameraProblem,
  showStartProblem,
  showStartingCamera,
  showToast,
} from "../lib/alerts";
import { diagnose, type StartIssue } from "../lib/startIssues";
import { useBarcodeScanner } from "../lib/useBarcodeScanner";
import { pushToast } from "../lib/toasts";
import { Toasts } from "./Toasts";

interface AppDataValue {
  orders: ReturnType<typeof useOrders>;
  device: ReturnType<typeof useActiveDevice>;
  packing: ReturnType<typeof usePacking>;
  /** Opens the "Start packing" dialog. */
  openStartPacking: () => void;
  /** True while a recording is starting or running: the packer must stay on the packing page. */
  navLocked: boolean;
  /** Starts recording the order and opens the packing page. Does nothing if recording could not start. */
  beginPacking: (order: OrderRecord) => void;
}

const AppDataContext = createContext<AppDataValue | null>(null);

/** Reading the same barcode twice within this many seconds is one scan read twice, not "start" then "finish". */
const MIN_SECONDS_BEFORE_FINISH_SCAN = 5;

/**
 * Orders, the connected camera and the current packing session, shared by every page so a recording
 * carries on while you move between pages. Also renders the Start packing dialog and message toast.
 */
export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const orders = useOrders(100);
  const device = useActiveDevice();
  const packing = usePacking({
    stationId: device.connected?.stationId ?? null,
    packerId: "dashboard",
    deviceConnected: !!device.connected,
    deviceRecording: device.connected?.recording ?? null,
    deviceReview: device.connected?.review ?? null,
    onStatusChange: orders.updateStatus,
    onUploadExpected: device.expectUpload,
    onUploadCancelled: device.forgetUpload,
  });
  const [modalOpen, setModalOpen] = useState(false);
  // A scan is handled one at a time: further scans are ignored until it finishes.
  const scanning = useRef(false);
  // A barcode scanned while the last recording is still being closed. It starts as soon as the camera is free.
  const queuedScan = useRef<string | null>(null);
  /** The exact code that started the current recording by scan. Scanning it again always finishes it. */
  const startedByScan = useRef<{ code: string; orderId: string } | null>(null);
  // A problem found before starting, with what to do once it is fixed.
  const [preflight, setPreflight] = useState<{
    issue: StartIssue;
    retry: () => void;
  } | null>(null);
  const { startFailure, setStartFailure } = packing;
  const problem = preflight?.issue ?? startFailure;
  const closeProblem = () => {
    setPreflight(null);
    setStartFailure(null);
  };
  /** Looks at the connection now. Returns the problem, or null when recording can start. */
  const checkSetup = async () => {
    const { reachable, info } = await device.refresh();
    return diagnose(reachable, info);
  };
  /**
   * Checks the camera and server right now, then runs the action only if the camera is connected and ready.
   * Otherwise shows what is wrong.
   */
  const whenReady = async (action: () => void) => {
    const issue = await checkSetup();
    if (issue) setPreflight({ issue, retry: action });
    else action();
  };
  /** For the alert's "Check again" button: true when the problem is gone. */
  const checkAgain = async () => (await checkSetup()) === null;
  // When a recording finishes (Stop pressed anywhere), go to the packing page to review and trim it.
  const previousStatus = useRef(packing.session.status);
  // Set when a start was requested: the packing page opens only once the camera confirms it is recording.
  const openWhenRecording = useRef(false);
  const status = packing.session.status;
  useEffect(() => {
    // Only when Stop was pressed (recording or stopping becomes review). A recording that was already waiting
    // for review when the page loaded must not pull you away from the page you opened.
    if (
      status === "review" &&
      (previousStatus.current === "recording" ||
        previousStatus.current === "stopping")
    ) {
      router.push("/packing");
    }
    if (openWhenRecording.current) {
      if (status === "recording") {
        openWhenRecording.current = false;
        closeAlert();
        router.push("/packing");
      } else if (status === "idle") {
        // The start failed; the problem alert has already replaced the "starting" dialog.
        openWhenRecording.current = false;
      }
    }
    previousStatus.current = status;
  }, [status, router]);

  // While recording, the packer stays on the packing page until they press Stop.
  const navLocked =
    status === "starting" || status === "recording" || status === "stopping";
  const mustStay = status === "recording" || status === "stopping";
  useEffect(() => {
    // Any other page (a typed address, a reload elsewhere) goes straight back to the packing page.
    if (mustStay && pathname !== "/packing") router.replace("/packing");
  }, [mustStay, pathname, router]);
  useEffect(() => {
    if (!navLocked) return;
    // Closing or reloading the tab asks first, and the browser Back button does nothing.
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const stay = () => history.pushState(null, "", location.href);
    history.pushState(null, "", location.href);
    window.addEventListener("beforeunload", warn);
    window.addEventListener("popstate", stay);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("popstate", stay);
    };
  }, [navLocked]);

  // Messages from packing: good news is a small corner notice, problems are an alert box. Then cleared.
  const { message, setMessage } = packing;
  useEffect(() => {
    if (!message) return;
    showToast(message.tone, message.text);
    setMessage(null);
  }, [message, setMessage]);

  // Show the "can't start" alert whenever there is a problem. It sets itself aside once closed or fixed.
  useEffect(() => {
    if (!problem) return;
    const retry = preflight?.retry;
    showStartProblem(problem, checkAgain).then((fixed) => {
      closeProblem();
      if (fixed) retry?.();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem?.kind, problem?.detail]);

  /** Checks the camera, then starts recording the order. The packing page opens once recording is confirmed. */
  const beginPacking = (order: OrderRecord) => {
    // Never record an order that was cancelled in Shopify, whichever way it was opened.
    if (order.cancelled) {
      void showToast(
        "error",
        `Order ${order.orderNumber} was cancelled in Shopify, so it can't be packed.`,
        "Order cancelled",
      );
      return;
    }
    return whenReady(() => {
      if (packing.start(order)) {
        openWhenRecording.current = true;
        void showStartingCamera();
      }
    });
  };

  /**
   * A barcode scan works like a switch:
   *  - the first scan of an order finds it and starts recording straight away;
   *  - scanning the same order's barcode again finishes the recording and saves the video.
   * Anything that stops a scan (no order, already packed, another order is being recorded, scanned too soon)
   * is explained instead.
   */
  const handleScan = async (raw: string) => {
    const code = raw.trim().replace(/^#/, "");
    if (!code) return;
    // A new scan dismisses any alert box that is still open, so the packer never has to click it away first.
    if (isAlertOpen()) closeAlert();
    if (scanning.current) return;

    const current = packing.session;
    if (current.status === "recording") {
      // A label may hold more than the bare number (a "#", a prefix, a link), so the order counts as the
      // same when the code is the one that started this recording, or contains its number on its own.
      const number = current.orderNumber?.replace(/^#/, "") ?? "";
      const started = startedByScan.current;
      const sameOrder =
        (!!started &&
          started.orderId === current.orderId &&
          started.code.toLowerCase() === code.toLowerCase()) ||
        number === code ||
        current.orderId === code ||
        !!current.orderId?.endsWith(`/${code}`) ||
        (!!number && (code.match(/\d+/g) ?? ([] as string[])).includes(number));
      if (sameOrder) {
        // A scanner can read a label twice in a row. Ignore a second read right after the first.
        if (packing.elapsedSeconds < MIN_SECONDS_BEFORE_FINISH_SCAN) return;
        packing.finish();
        return;
      }
      void showToast(
        "error",
        `You scanned "${raw.trim()}". Scan ${current.orderNumber} again to finish it before starting another order.`,
        "Recording in progress",
      );
      return;
    }
    if (
      current.status === "stopping" ||
      current.status === "saving" ||
      current.status === "review"
    ) {
      // The last video is being closed (a second or two). The compressing and uploading carry on in the
      // background, so there is no need to wait: remember this scan and start it as soon as the camera is free.
      queuedScan.current = code;
      pushToast(
        "info",
        `Scanned ${raw.trim()}. It starts as soon as ${current.orderNumber} is closed.`,
      );
      return;
    }
    if (current.status !== "idle") {
      void showToast(
        "error",
        `Finish packing ${current.orderNumber} before scanning another order.`,
        "Recording in progress",
      );
      return;
    }
    scanning.current = true;
    try {
      let order =
        orders.orders.find(
          (o) =>
            o.orderNumber.replace(/^#/, "") === code ||
            o.id === code ||
            o.id.endsWith(`/${code}`),
        ) ?? null;
      if (!order && orders.shopify.state === "live") {
        order = await orders.lookUp(code);
        orders.setSearchMessage(null);
      }
      if (!order) {
        void showToast(
          "error",
          `No order #${code} was found${orders.shopify.state === "live" ? " in Shopify" : ""}. Scan again or enter the number by hand.`,
          "Order not found",
        );
        return;
      }
      if (order.cancelled) {
        void showToast(
          "error",
          `Order ${order.orderNumber} was cancelled in Shopify, so it can't be packed.`,
          "Order cancelled",
        );
        return;
      }
      if (order.status !== "Pending") {
        void showToast(
          "error",
          `Order ${order.orderNumber} is already ${order.status.toLowerCase()}. To record it again, use Retake on the Orders page.`,
          "Already packed",
        );
        return;
      }
      startedByScan.current = { code, orderId: order.id };
      beginPacking(order);
    } finally {
      scanning.current = false;
    }
  };
  useBarcodeScanner(handleScan);

  // Run the scan that was waiting for the camera.
  const handleScanRef = useRef(handleScan);
  useEffect(() => {
    handleScanRef.current = handleScan;
  });
  const sessionIdle = packing.session.status === "idle";
  useEffect(() => {
    if (!sessionIdle || !queuedScan.current) return;
    const code = queuedScan.current;
    queuedScan.current = null;
    void handleScanRef.current(code);
  }, [sessionIdle]);

  // When the camera is missing or not working, open an alert box by itself that says what is wrong and what to
  // do. It is shown once per problem: if it is closed it stays closed until the camera has worked again, and
  // it closes by itself as soon as the camera is back. It never replaces another alert box that is on screen,
  // and it stays out of the way while an order is being packed.
  // A lost server connection is not popped up by itself: the status line already says so, and the alert
  // still appears if someone tries to start recording while the server is away.
  const detected =
    device.reachable === null ? null : diagnose(device.reachable, device.info);
  const cameraIssue = detected?.kind === "server" ? null : detected;
  const cameraIssueKind = cameraIssue?.kind ?? null;
  const cameraAlertClosedFor = useRef<string | null>(null);
  const packingIdle = packing.session.status === "idle";
  useEffect(() => {
    if (!cameraIssue || !cameraIssueKind) {
      cameraAlertClosedFor.current = null;
      closeCameraProblem();
      return;
    }
    if (
      !packingIdle ||
      cameraAlertClosedFor.current === cameraIssueKind ||
      isAlertOpen()
    )
      return;
    void showCameraProblem(cameraIssue, checkAgain).then(() => {
      cameraAlertClosedFor.current = cameraIssueKind;
    });
    // Runs on every camera check (every few seconds), so an alert box that was in the way is tried again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraIssueKind, device.info, device.reachable, packingIdle]);

  return (
    <AppDataContext.Provider
      value={{
        orders,
        device,
        packing,
        navLocked,
        openStartPacking: () => whenReady(() => setModalOpen(true)),
        beginPacking,
      }}
    >
      {children}

      <Toasts />

      {modalOpen && <StartPackingModal onClose={() => setModalOpen(false)} />}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData must be used inside AppDataProvider");
  return value;
}
