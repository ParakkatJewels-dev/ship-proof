"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  Eye,
  Info,
  Play,
  RotateCcw,
  Scissors,
  Share2,
} from "lucide-react";
import type { OrderRecord } from "../lib/orders";
import { isOrderNumber, matchesQuery } from "../lib/useOrders";
import { useAppData } from "./AppData";
import { AppShell, PageHeader } from "./AppShell";
import { Card, OrdersTable, isProcessing, processingOrderNumbers } from "./ui";
import { useUploads } from "./UploadsMenu";
import dynamic from "next/dynamic";

// The video windows (player, trimmer, properties, share) load only when one is opened from a row's
// menu, so the Orders page itself stays small and no video code or video is fetched up front.
const SavedVideoModal = dynamic(
  () => import("./SavedVideoModal").then((m) => m.SavedVideoModal),
  { ssr: false },
);
const VideoPropertiesModal = dynamic(
  () => import("./VideoPropertiesModal").then((m) => m.VideoPropertiesModal),
  { ssr: false },
);
const ShareVideoModal = dynamic(
  () => import("./ShareVideoModal").then((m) => m.ShareVideoModal),
  { ssr: false },
);
import { fetchVideoDownload } from "../lib/shipproofApi";
import { RowMenu } from "./RowMenu";
import { Pagination } from "./Pagination";
import { clampPage, pageCount } from "../lib/pagination";
import { confirmRetake, showToast } from "../lib/alerts";

/** Saves an order's stored video to this computer, named after the order. */
async function downloadVideo(order: OrderRecord) {
  try {
    const { url, fileName } = await fetchVideoDownload(order.id);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    void showToast("ok", `Downloading ${fileName}`);
  } catch (err) {
    void showToast(
      "error",
      err instanceof Error ? err.message : "Could not download the video.",
      "Download failed",
    );
  }
}

const TABS = ["All", "Pending", "Packed"] as const;
type Filter = (typeof TABS)[number];

/** Rows per page the packer can choose from, and the one used at first. */
const PAGE_SIZES = [5, 10, 20];
const DEFAULT_PAGE_SIZE = 5;

/** Reads ?status=all|pending|packed (any case) into a filter tab. With no status, All is shown first. */
function filterFromParam(param: string | null): Filter {
  return (
    TABS.find((t) => t.toLowerCase() === (param || "").toLowerCase()) ?? "All"
  );
}

export function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = filterFromParam(searchParams.get("status"));
  /** An order to show and highlight, for example the one whose packing was just cancelled. */
  const focusId = searchParams.get("focus");

  const {
    orders: ordersData,
    device,
    packing,
    beginPacking,
    scanCode,
  } = useAppData();
  const {
    orders,
    shopify,
    searching,
    searchMessage,
    setSearchMessage,
    lookUp,
  } = ordersData;
  const busy = packing.session.status !== "idle";
  const { items: uploads } = useUploads();
  const processing = processingOrderNumbers(uploads);
  const [propertiesOf, setPropertiesOf] = useState<OrderRecord | null>(null);
  const [sharing, setSharing] = useState<OrderRecord | null>(null);
  const [saved, setSaved] = useState<{
    order: OrderRecord;
    mode: "view" | "trim";
  } | null>(null);

  /** The Action cell: start packing a pending order, or stop the one being recorded. */
  const renderAction = (order: OrderRecord) => {
    const s = packing.session;
    if (s.orderId === order.id && s.status !== "idle") {
      // The order being packed right now: a plain label, with no buttons. Stop is on the packing page.
      const text = {
        starting: "Starting…",
        recording: "Recording",
        stopping: "Finishing…",
        review: "Reviewing",
        saving: "Saving…",
      }[s.status];
      if (s.status === "review") {
        return (
          <Link
            href="/packing"
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-dark"
          >
            Review video
            <span aria-hidden="true">›</span>
          </Link>
        );
      }
      return (
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted">
          <span
            className={`w-1.5 h-1.5 rounded-full ${s.status === "recording" ? "bg-[#D9443A] animate-pulse" : "bg-[#9AA0AE]"}`}
          />
          {text}
        </span>
      );
    }
    // Saved, but the video is still being compressed or uploaded: nothing to view, trim or share yet.
    if (isProcessing(order, processing)) {
      return (
        <Link
          href="/uploads"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          Uploading…
        </Link>
      );
    }
    if (order.status === "Packed") {
      return (
        <div className="flex justify-end">
          <RowMenu
            label={`Actions for ${order.orderNumber}`}
            heading={order.orderNumber}
            items={[
              {
                label: "Trim",
                icon: Scissors,
                onSelect: () => setSaved({ order, mode: "trim" }),
              },
              {
                label: "View",
                icon: Eye,
                onSelect: () => setSaved({ order, mode: "view" }),
              },
              {
                label: "Download",
                icon: Download,
                onSelect: () => void downloadVideo(order),
              },
              {
                label: "Share",
                icon: Share2,
                onSelect: () => setSharing(order),
              },
              {
                label: "Properties",
                icon: Info,
                onSelect: () => setPropertiesOf(order),
              },
              {
                label: "Retake",
                icon: RotateCcw,
                danger: true,
                disabled: busy,
                title: busy
                  ? `Finish packing ${s.orderNumber} first`
                  : undefined,
                onSelect: async () => {
                  if (await confirmRetake(order.orderNumber))
                    beginPacking(order);
                },
              },
            ]}
          />
        </div>
      );
    }
    if (order.status !== "Pending")
      return <span className="text-muted">—</span>;

    // No camera is not a reason to disable the button: clicking it explains the problem.
    const reason = busy ? `Finish packing ${s.orderNumber} first` : undefined;
    return (
      <button
        onClick={() => beginPacking(order)}
        disabled={!!reason}
        title={reason ?? `Start packing ${order.orderNumber}`}
        aria-label={`Start packing ${order.orderNumber}`}
        className="inline-flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-lg bg-accent hover:bg-accent-dark text-white text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-accent disabled:cursor-not-allowed"
      >
        <span className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
          <Play className="w-3 h-3" fill="currentColor" />
        </span>
        Start packing
      </button>
    );
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // The page is tied to the tab + search it was chosen for, so any other list starts on page 1.
  const [pageState, setPageState] = useState({ key: "", page: 1 });
  const resetPage = () => setPageState({ key: "", page: 1 });

  const setFilter = (next: Filter) => {
    resetPage();
    router.replace(`/orders?status=${next.toLowerCase()}`, { scroll: false });
  };

  const counts: Record<Filter, number> = {
    All: orders.length,
    Pending: orders.filter((o) => o.status === "Pending").length,
    Packed: orders.filter((o) => o.status === "Packed").length,
  };

  const visible = orders.filter(
    (o) =>
      (filter === "All" || o.status === filter) && matchesQuery(o, searchQuery),
  );

  // One page of the list at a time. The page is kept inside the list, so when an order leaves it (for example
  // once it is packed) you are never left on a page that no longer exists.
  const listKey = `${filter}|${searchQuery.trim().toLowerCase()}`;
  const totalPages = pageCount(visible.length, pageSize);
  // Until a page is chosen, open on the page that holds the focused order.
  const focusIndex = focusId ? visible.findIndex((o) => o.id === focusId) : -1;
  const page = clampPage(
    pageState.key === listKey
      ? pageState.page
      : focusIndex >= 0
        ? Math.floor(focusIndex / pageSize) + 1
        : 1,
    totalPages,
  );
  const shownOrders = visible.slice((page - 1) * pageSize, page * pageSize);

  const handleSearch = async () => {
    // An order number (typed, or scanned into this box) works like a barcode scan: it starts packing.
    if (isOrderNumber(searchQuery)) {
      const code = searchQuery.trim();
      setSearchQuery("");
      return scanCode(code);
    }
    if (!searchQuery.trim() || visible.length > 0) return;
    const found = await lookUp(searchQuery);
    // Show the looked-up order even if it sits under another tab.
    if (found && filter !== "All" && found.status !== filter) setFilter("All");
  };

  return (
    <AppShell>
      <PageHeader
        title="Orders"
        subtitle="Every Shopify order and where it is in packing"
        shopify={shopify}
        search={searchQuery}
        onSearchChange={(v) => {
          setSearchQuery(v);
          setSearchMessage(null);
          resetPage();
        }}
        onSearchSubmit={handleSearch}
      />

      <main>
        <Card>
          {packing.session.status !== "idle" && (
            <div
              role="status"
              className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent-pale px-4 py-3 text-sm"
            >
              <p className="text-ink">
                {packing.session.status === "review" ? (
                  <>
                    <span className="font-semibold">
                      {packing.session.orderNumber} has a recording waiting for
                      review.
                    </span>{" "}
                    Save or retake it before packing the next order.
                  </>
                ) : packing.session.status === "saving" ? (
                  <>
                    <span className="font-semibold">
                      Saving {packing.session.orderNumber}…
                    </span>{" "}
                    You can pack the next order in a moment.
                  </>
                ) : (
                  <>
                    <span className="font-semibold">
                      Packing {packing.session.orderNumber} is in progress.
                    </span>{" "}
                    Finish it before starting another order.
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                {packing.session.status === "review" &&
                  !!packing.session.videoSeconds && (
                    <button
                      onClick={() =>
                        void packing.saveReview({
                          start: 0,
                          end: packing.session.videoSeconds ?? 0,
                        })
                      }
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-white hover:bg-white/70 cursor-pointer transition-colors"
                    >
                      Save as it is
                    </button>
                  )}
                <Link
                  href="/packing"
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-accent hover:bg-accent-dark transition-colors"
                >
                  {packing.session.status === "review"
                    ? "Review now"
                    : "Open packing page"}
                </Link>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Status tabs */}
            <div
              role="tablist"
              aria-label="Filter orders by status"
              className="flex flex-wrap gap-2"
            >
              {TABS.map((f) => {
                const active = f === filter;
                return (
                  <button
                    key={f}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(f)}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
                      active
                        ? "bg-ink text-white"
                        : "bg-canvas text-ink/80 hover:bg-[#E1E5EF]"
                    }`}
                  >
                    {f}
                    <span
                      className={`min-w-5 px-1.5 rounded-full text-[11px] font-semibold ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-white text-muted"
                      }`}
                    >
                      {counts[f]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Which camera "Start packing" will use */}
            <p className="inline-flex items-center gap-1.5 text-xs text-muted">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  device.connected
                    ? "bg-[#2F9E5B]"
                    : device.reachable === null
                      ? "bg-ink/30 animate-pulse"
                      : "bg-[#9AA0AE]"
                }`}
              />
              {packing.session.offline
                ? "Device offline · still recording on the packing station"
                : device.connected
                  ? `Camera ready · ${device.connected.stationName}`
                  : device.reachable === null
                    ? "Checking camera…"
                    : device.reachable
                      ? "No camera device connected"
                      : "ShipProof server not reachable"}
              {!!device.connected?.pendingUploads && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-[#F6ECDD] text-[#8A5A1C] font-semibold">
                  {device.connected.pendingUploads}{" "}
                  {device.connected.pendingUploads === 1 ? "video" : "videos"}{" "}
                  waiting to upload
                </span>
              )}
            </p>
          </div>

          {(searching || searchMessage) && (
            <p role="status" className="text-sm text-muted mt-4">
              {searching ? "Searching Shopify…" : searchMessage}
            </p>
          )}

          {visible.length === 0 ? (
            !searching &&
            !searchMessage && (
              <p className="text-sm text-muted py-10 text-center">
                {shopify.state === "loading"
                  ? "Loading orders…"
                  : searchQuery.trim()
                    ? `No orders match "${searchQuery.trim()}".${shopify.state === "live" ? " Press Enter to look it up in Shopify." : ""}`
                    : filter === "All"
                      ? "No orders yet."
                      : `No ${filter.toLowerCase()} orders.`}
              </p>
            )
          ) : (
            <div className="mt-5">
              <OrdersTable
                orders={shownOrders}
                renderAction={renderAction}
                highlightId={focusId}
                processing={processing}
              />
            </div>
          )}

          {visible.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              pageSizes={PAGE_SIZES}
              total={visible.length}
              noun={`${filter === "All" ? "" : `${filter.toLowerCase()} `}orders${shopify.state === "live" ? " from the last 60 days" : ""}`}
              onPage={(next) => setPageState({ key: listKey, page: next })}
              onPageSize={(size) => {
                setPageSize(size);
                setPageState({ key: listKey, page: 1 });
              }}
            />
          )}
        </Card>
      </main>
      {propertiesOf && (
        <VideoPropertiesModal
          key={propertiesOf.id}
          order={propertiesOf}
          onClose={() => setPropertiesOf(null)}
        />
      )}
      {sharing && (
        <ShareVideoModal
          key={sharing.id}
          order={sharing}
          onClose={() => setSharing(null)}
        />
      )}
      {saved && (
        <SavedVideoModal
          key={`${saved.order.id}-${saved.mode}`}
          order={saved.order}
          mode={saved.mode}
          onClose={() => setSaved(null)}
        />
      )}
    </AppShell>
  );
}
