"use client";

import React, { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Camera,
  ChevronRight,
  Hourglass,
  PackageCheck,
  Timer,
} from "lucide-react";
import type { ActiveDevice } from "../lib/shipproofApi";
import { isOrderNumber, matchesQuery } from "../lib/useOrders";
import { formatAverage, usePackedToday } from "../lib/usePackedToday";
import { useAppData } from "./AppData";
import { AppShell, PageHeader } from "./AppShell";
import { Card, OrdersTable } from "./ui";

/** The Pending Orders card shows this many orders; the rest are a click away on the Orders page. */
const DASHBOARD_ORDER_LIMIT = 5;

type ConnectedDevice = Extract<ActiveDevice, { connected: true }>;

// Shown only when the API can't be reached.
const DEMO_DEVICE: ConnectedDevice = {
  connected: true,
  stationId: "demo",
  stationName: "Packing Bay 1 (Main Hall)",
  location: "Bengaluru Warehouse",
  cameraName: "Logitech C920 Pro HD",
  resolution: "1080p",
  fps: 30,
  cameraStatus: "CONNECTED",
  connectedAt: new Date(2026, 10, 24, 9, 30).toISOString(),
  lastHeartbeat: new Date(2026, 10, 24, 11, 50).toISOString(),
};

const DEVICE_STATUS: Record<
  ConnectedDevice["cameraStatus"],
  { label: string; pill: string; dot: string }
> = {
  CONNECTED: {
    label: "Connected",
    pill: "bg-[#E3EFE5] text-[#2F6B3F]",
    dot: "bg-[#2F9E5B]",
  },
  RECORDING: {
    label: "Recording",
    pill: "bg-[#FBE6E4] text-[#B2453D]",
    dot: "bg-[#D9443A]",
  },
  DISCONNECTED: {
    label: "Offline",
    pill: "bg-[#ECEEF3] text-[#525868]",
    dot: "bg-[#9AA0AE]",
  },
  ERROR: {
    label: "Camera error",
    pill: "bg-[#F6ECDD] text-[#8A5A1C]",
    dot: "bg-[#D08A2C]",
  },
};

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  return `${Math.round(mins / (60 * 24))} d ago`;
}

const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

/* Signed-in user's first name, read from the session the login page stores. */
function readStoredFirstName() {
  try {
    const raw = localStorage.getItem("shipproof_auth");
    const name: string = raw ? JSON.parse(raw).user?.name || "" : "";
    return name.replace(/^Admin\s+/i, "").split(" ")[0] || "there";
  } catch {
    return "there";
  }
}

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/* ------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* ------------------------------------------------------------------------- */

export function VmsDashboard() {
  const { orders: ordersData, device: deviceState, scanCode } = useAppData();
  const {
    orders,
    shopify,
    searching,
    searchMessage,
    setSearchMessage,
    lookUp,
  } = ordersData;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const userName = useSyncExternalStore(
    subscribeToStorage,
    readStoredFirstName,
    () => "there",
  );

  // The single connected camera device, refreshed every 5 seconds. Demo device when the API is unreachable.
  const device: { info: ActiveDevice | null; demo: boolean } =
    deviceState.reachable === false
      ? { info: DEMO_DEVICE, demo: true }
      : { info: deviceState.info, demo: false };
  const activeDevice = device.info?.connected ? device.info : null;
  const deviceStatus = activeDevice
    ? (DEVICE_STATUS[activeDevice.cameraStatus] ?? DEVICE_STATUS.ERROR)
    : null;

  const pendingOrders = orders.filter((o) => o.status === "Pending");
  // While searching, show matches of any status so a packed order can still be found.
  const searchActive = searchQuery.trim() !== "";
  const listedOrders = searchActive
    ? orders.filter((o) => matchesQuery(o, searchQuery))
    : pendingOrders;

  const handleSearch = async () => {
    setSearchMessage(null);
    const q = searchQuery.trim();
    if (!q) return;
    // An order number (typed, or scanned into this box) works like a barcode scan: it starts packing.
    if (isOrderNumber(q)) {
      setSearchQuery("");
      return scanCode(q);
    }
    const exact = orders.find(
      (o) => o.orderNumber.replace(/^#/, "") === q.replace(/^#/, ""),
    );
    if (exact) return setSelectedId(exact.id);
    if (listedOrders.length === 1) return setSelectedId(listedOrders[0].id);
    const found = await lookUp(q);
    if (found) setSelectedId(found.id);
  };

  const packedCount = orders.filter(
    (o) => o.status === "Packed" || o.status === "Dispatched",
  ).length;
  const pendingCount = pendingOrders.length;
  const packedToday = usePackedToday();

  return (
    <AppShell>
      <PageHeader
        title={`Hello, ${userName}!`}
        subtitle="Explore packing activity and video proofs across your stations"
        shopify={shopify}
        search={searchQuery}
        onSearchChange={(v) => {
          setSearchQuery(v);
          setSearchMessage(null);
        }}
        onSearchSubmit={handleSearch}
      />

      {/* ================= MAIN GRID ================= */}
      <main className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-4">
        {/* --- Row 1: stat tiles --- */}
        <Card className="flex items-center gap-3 py-5! xl:col-span-4">
          <div className="w-12 h-12 rounded-full bg-[#E3EFE5] text-[#2F6B3F] flex items-center justify-center shrink-0">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-ink/80">Packed today</p>
            <p className="text-2xl font-bold mt-0.5">
              {packedToday ? packedToday.count : packedCount}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-3 py-5! xl:col-span-4">
          <div className="w-12 h-12 rounded-full bg-[#FBF0DC] text-[#9A6A12] flex items-center justify-center shrink-0">
            <Hourglass className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-ink/80 whitespace-nowrap">
              Pending orders
            </p>
            <p className="text-2xl font-bold mt-0.5">{pendingCount}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3 py-5! sm:col-span-2 xl:col-span-4">
          <div className="w-12 h-12 rounded-full bg-accent-pale text-accent-dark flex items-center justify-center shrink-0">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-ink/80">Average packing time today</p>
            <p className="text-2xl font-bold mt-0.5">
              {packedToday?.averageSeconds != null
                ? formatAverage(packedToday.averageSeconds)
                : "—"}
            </p>
          </div>
        </Card>

        <Card className="flex flex-col xl:col-span-3 xl:self-start">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Connected Device</h2>
            {device.demo && (
              <span className="px-2 py-0.5 rounded-full bg-canvas text-[10px] font-semibold text-muted">
                Demo
              </span>
            )}
          </div>

          <div
            role="status"
            className="flex-1 flex flex-col items-center justify-center text-center pt-6 pb-2"
          >
            {device.info === null ? (
              <p className="text-sm text-muted">Checking for a device…</p>
            ) : activeDevice && deviceStatus ? (
              <>
                <span className="relative w-20 h-20 rounded-full bg-accent-pale text-accent-dark flex items-center justify-center">
                  <Camera className="w-8 h-8" />
                  <span
                    className={`absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full ring-[3px] ring-white ${deviceStatus.dot}`}
                  />
                </span>
                <span
                  className={`mt-4 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${deviceStatus.pill}`}
                >
                  {deviceStatus.label}
                </span>
                <h3
                  className="text-lg font-semibold mt-2 max-w-full truncate"
                  title={activeDevice.cameraName}
                >
                  {activeDevice.cameraName}
                </h3>
                <p
                  className="text-sm text-muted max-w-full truncate"
                  title={activeDevice.stationName}
                >
                  {activeDevice.stationName}
                </p>
                <dl className="grid grid-cols-2 gap-3 w-full mt-5 text-left">
                  <div className="rounded-xl bg-canvas/60 px-3 py-2">
                    <dt className="text-[11px] text-muted">Connected since</dt>
                    <dd className="text-sm font-semibold mt-0.5">
                      {clockTime(activeDevice.connectedAt)}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-canvas/60 px-3 py-2">
                    <dt className="text-[11px] text-muted">Last signal</dt>
                    <dd className="text-sm font-semibold mt-0.5">
                      {timeAgo(activeDevice.lastHeartbeat)}
                    </dd>
                  </div>
                  {activeDevice.resolution && (
                    <div className="col-span-2 rounded-xl bg-canvas/60 px-3 py-2">
                      <dt className="text-[11px] text-muted">Video</dt>
                      <dd className="text-sm font-semibold mt-0.5">
                        {activeDevice.resolution}
                        {activeDevice.fps ? ` · ${activeDevice.fps} fps` : ""}
                      </dd>
                    </div>
                  )}
                </dl>
              </>
            ) : (
              <>
                <span className="w-20 h-20 rounded-full bg-[#ECEEF3] text-[#7A8090] flex items-center justify-center">
                  <Camera className="w-8 h-8" />
                </span>
                <h3 className="text-lg font-semibold mt-4">
                  No device connected
                </h3>
                <p className="text-sm text-muted mt-1 max-w-[270px]">
                  Start the ShipProof camera agent on the packing station. Only
                  one device can be connected at a time.
                </p>
              </>
            )}
          </div>
        </Card>

        <Card className="flex flex-col xl:col-span-9">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold">
                {searchActive ? "Search results" : "Pending Orders"}
              </h2>
              {!searchActive && (
                <span className="px-2 py-0.5 rounded-full bg-[#F6ECDD] text-[#8A5A1C] text-[11px] font-semibold">
                  {pendingCount}
                </span>
              )}
            </div>
            <Link
              href="/orders?status=pending"
              aria-label="View all orders"
              title="View all orders"
              className="w-9 h-9 flex items-center justify-center shrink-0 text-ink/70 hover:text-ink transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </Link>
          </div>
          {(searching || searchMessage) && (
            <p role="status" className="text-sm text-muted mt-4">
              {searching ? "Searching Shopify…" : searchMessage}
            </p>
          )}
          {listedOrders.length === 0 ? (
            !searching &&
            !searchMessage && (
              <p className="text-sm text-muted py-6">
                {shopify.state === "loading"
                  ? "Loading orders…"
                  : searchActive
                    ? `No orders match.${shopify.state === "live" ? " Press Enter to look it up in Shopify." : ""}`
                    : "No pending orders. Everything has been packed."}
              </p>
            )
          ) : (
            <div className="mt-4">
              <OrdersTable
                orders={listedOrders.slice(0, DASHBOARD_ORDER_LIMIT)}
                highlightId={selectedId}
              />
            </div>
          )}
          <div className="mt-auto pt-4 flex justify-center border-t border-canvas">
            <Link
              href={
                searchActive ? "/orders?status=all" : "/orders?status=pending"
              }
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-dark"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </Card>
      </main>
    </AppShell>
  );
}
