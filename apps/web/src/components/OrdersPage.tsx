"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, Play, RotateCcw, Scissors } from "lucide-react";
import type { OrderRecord } from "../lib/orders";
import { matchesQuery } from "../lib/useOrders";
import { useAppData } from "./AppData";
import { AppShell, PageHeader } from "./AppShell";
import { Card, OrdersTable } from "./ui";
import { SavedVideoModal } from "./SavedVideoModal";
import { RowMenu } from "./RowMenu";
import { confirmRetake } from "../lib/alerts";

const TABS = ["All", "Pending", "Packed"] as const;
type Filter = (typeof TABS)[number];

const PAGE_SIZE = 5;

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

  const { orders: ordersData, device, packing, beginPacking } = useAppData();
  const {
    orders,
    shopify,
    searching,
    searchMessage,
    setSearchMessage,
    lookUp,
  } = ordersData;
  const busy = packing.session.status !== "idle";
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
  const [shown, setShown] = useState({ key: "", count: PAGE_SIZE });
  const resetShown = () => setShown({ key: "", count: PAGE_SIZE });

  const setFilter = (next: Filter) => {
    resetShown();
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

  // Show five orders at first; "Show more" adds five at a time. Changing the tab or search starts over at five.
  // The count is tied to the tab + search it was expanded for, so any other list starts at five.
  const listKey = `${filter}|${searchQuery.trim().toLowerCase()}`;
  const shownCount = shown.key === listKey ? shown.count : PAGE_SIZE;
  const shownOrders = visible.slice(0, shownCount);
  const remaining = visible.length - shownOrders.length;

  const handleSearch = async () => {
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
          resetShown();
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
                {searchQuery.trim()
                  ? `No orders match "${searchQuery.trim()}".${shopify.state === "live" ? " Press Enter to look it up in Shopify." : ""}`
                  : filter === "All"
                    ? "No orders yet."
                    : `No ${filter.toLowerCase()} orders.`}
              </p>
            )
          ) : (
            <div className="mt-5">
              <OrdersTable orders={shownOrders} renderAction={renderAction} />
            </div>
          )}

          {visible.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">
                Showing {shownOrders.length} of {visible.length}{" "}
                {filter === "All" ? "" : `${filter.toLowerCase()} `}
                orders{shopify.state === "live" ? " from the last 60 days" : ""}
              </p>
              {remaining > 0 && (
                <button
                  onClick={() =>
                    setShown({ key: listKey, count: shownCount + PAGE_SIZE })
                  }
                  className="px-4 py-2 rounded-full bg-canvas hover:bg-[#E1E5EF] text-sm font-medium cursor-pointer transition-colors"
                >
                  Show {Math.min(PAGE_SIZE, remaining)} more
                </button>
              )}
            </div>
          )}
        </Card>
      </main>
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
