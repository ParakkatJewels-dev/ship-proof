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
  showSavingProgress,
  showStartProblem,
  showStartingCamera,
  showToast,
} from "../lib/alerts";
import { diagnose, type StartIssue } from "../lib/startIssues";
import { useBarcodeScanner } from "../lib/useBarcodeScanner";

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
  });
  const [modalOpen, setModalOpen] = useState(false);
  // A scan is handled one at a time: further scans are ignored until it finishes.
  const scanning = useRef(false);
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

  // From pressing Finish until the video is saved, show a progress bar. The success (or error) alert below
  // replaces it, so success only appears once the video is really saved.
  const { finishing } = packing;
  const savingOrder = packing.session.orderNumber;
  useEffect(() => {
    if (finishing) void showSavingProgress(savingOrder ?? "the order");
  }, [finishing, savingOrder]);

  // Messages show as a SweetAlert toast, then are cleared.
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
  const beginPacking = (order: OrderRecord) =>
    whenReady(() => {
      if (packing.start(order)) {
        openWhenRecording.current = true;
        void showStartingCamera();
      }
    });

  /**
   * A barcode scan: find the order and start recording it straight away. Anything that stops it
   * (no order, already packed, another recording running) is explained instead.
   */
  const handleScan = async (raw: string) => {
    const code = raw.trim().replace(/^#/, "");
    if (!code || scanning.current) return;
    if (packing.session.status !== "idle") {
      void showToast(
        "error",
        `Finish packing ${packing.session.orderNumber} before scanning another order.`,
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
        await showToast(
          "error",
          `No order #${code} was found${orders.shopify.state === "live" ? " in Shopify" : ""}. Scan again or enter the number by hand.`,
          "Order not found",
        );
        return;
      }
      if (order.status !== "Pending") {
        await showToast(
          "error",
          `Order ${order.orderNumber} is already ${order.status.toLowerCase()}. To record it again, use Retake on the Orders page.`,
          "Already packed",
        );
        return;
      }
      beginPacking(order);
    } finally {
      scanning.current = false;
    }
  };
  useBarcodeScanner(handleScan);

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

      {modalOpen && <StartPackingModal onClose={() => setModalOpen(false)} />}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData must be used inside AppDataProvider");
  return value;
}
