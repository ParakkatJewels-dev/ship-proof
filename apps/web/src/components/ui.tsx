"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImageOff, X } from "lucide-react";
import type { OrderRecord } from "../lib/orders";

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`bg-white rounded-[22px] p-5 sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

/** "Processing": recorded and saved, but the video is still being compressed or uploaded. */
type ShownStatus = OrderRecord["status"] | "Processing";

const STATUS_STYLES: Record<ShownStatus, string> = {
  Pending: "bg-[#F6ECDD] text-[#8A5A1C]",
  Processing: "bg-[#E4E9FB] text-[#3446A8]",
  Packed: "bg-[#E3EFE5] text-[#2F6B3F]",
  Dispatched: "bg-[#ECEEF3] text-[#525868]",
};

/** Order numbers ("19441", without "#") whose video is still on its way to the cloud. */
export function processingOrderNumbers(
  uploads: { orderNumber: string; state: string }[],
): Set<string> {
  return new Set(
    uploads
      .filter((u) => u.state !== "done")
      .map((u) => u.orderNumber.replace(/^#/, "")),
  );
}

export function isProcessing(order: OrderRecord, processing?: Set<string>) {
  return !!processing?.has(order.orderNumber.replace(/^#/, ""));
}

export function StatusPill({ status }: { status: ShownStatus }) {
  return (
    <span
      className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

/**
 * Orders as a table with Order ID, Order date, Product name, Quantity and Status columns.
 * Each product sits on its own line with its quantity on the same line. `highlightId` marks one row.
 * Passing `renderAction` adds an Action column at the end.
 */
export function OrdersTable({
  orders,
  highlightId,
  renderAction,
  processing,
}: {
  orders: OrderRecord[];
  highlightId?: string | null;
  renderAction?: (order: OrderRecord) => React.ReactNode;
  /** Orders whose video is still uploading; they show "Processing" instead of their status. */
  processing?: Set<string>;
}) {
  // Every cell draws its own right and bottom border, giving a bordered grid. The last column and
  // last row drop theirs because the wrapper supplies the outer border.
  const cell = "border-b border-r border-[#E1E5EF] last:border-r-0";
  const head = `${cell} px-4 py-2.5 bg-canvas/60 font-semibold`;

  return (
    <div className="overflow-x-auto rounded-xl border border-[#E1E5EF]">
      <table
        className={`w-full ${renderAction ? "min-w-[800px]" : "min-w-[640px]"} text-sm border-collapse [&_tbody_tr:last-child>*]:border-b-0`}
      >
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
            <th scope="col" className={`${head} w-[14%]`}>
              Order ID
            </th>
            <th scope="col" className={`${head} w-28`}>
              Order date
            </th>
            <th scope="col" className={`${head} w-[36%]`}>
              Product name
            </th>
            <th
              scope="col"
              className={`${head} text-right w-px whitespace-nowrap`}
            >
              Qty
            </th>
            <th scope="col" className={`${head} text-right w-28`}>
              Status
            </th>
            {renderAction && (
              <th scope="col" className={`${head} text-right w-44`}>
                Action
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              aria-current={order.id === highlightId ? "true" : undefined}
              className={`align-top ${order.id === highlightId ? "bg-accent-pale/50" : ""}`}
            >
              <th
                scope="row"
                className={`${cell} px-4 py-3 text-left font-semibold whitespace-nowrap`}
              >
                <div className="h-12 flex items-center">
                  {order.orderNumber}
                </div>
              </th>
              <td className={`${cell} px-4 py-3 whitespace-nowrap`}>
                <div className="h-12 flex flex-col justify-center">
                  <div className="leading-5 whitespace-nowrap">
                    {order.placedDate}
                  </div>
                  <div className="text-[11px] text-muted">
                    {order.placedTime}
                  </div>
                </div>
              </td>
              <td className={`${cell} px-4 py-3`}>
                {order.items.map((it, n) => (
                  <div
                    key={`${it.id}-${n}`}
                    className="h-12 flex items-center gap-3 text-ink/90"
                  >
                    <ProductThumb src={it.imageUrl} name={it.name} />
                    {it.name}
                  </div>
                ))}
              </td>
              <td className={`${cell} px-4 py-3 text-right tabular-nums`}>
                {order.items.map((it, n) => (
                  <div
                    key={`${it.id}-${n}`}
                    className="h-12 flex items-center justify-end"
                  >
                    {it.quantity}
                  </div>
                ))}
              </td>
              <td className={`${cell} px-4 py-3 text-right`}>
                <span className="h-12 flex items-center justify-end">
                  <StatusPill
                    status={
                      isProcessing(order, processing)
                        ? "Processing"
                        : order.status
                    }
                  />
                </span>
              </td>
              {renderAction && (
                <td className={`${cell} px-4 py-3 text-right`}>
                  <div className="h-12 flex items-center justify-end">
                    {renderAction(order)}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Small product picture. Click it to see the image full size in a dialog.
 * Shows a neutral placeholder when there is no image or it fails to load.
 */
export function ProductThumb({
  src,
  name,
  size = 40,
}: {
  src?: string;
  name: string;
  size?: number;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const showImage = !!src && failedSrc !== src;
  const box =
    "shrink-0 rounded-lg overflow-hidden bg-canvas flex items-center justify-center text-muted/60";

  if (!showImage) {
    return (
      <span className={box} style={{ width: size, height: size }}>
        <ImageOff className="w-4 h-4" aria-label={`No image for ${name}`} />
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View larger image of ${name}`}
        title="Click to enlarge"
        className={`${box} cursor-zoom-in hover:ring-2 hover:ring-accent/40 transition`}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailedSrc(src ?? null)}
          className="w-full h-full object-cover"
        />
      </button>
      {open && (
        <ImageLightbox src={src!} name={name} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

/** Full-size image dialog. Escape, the X button or a click outside closes it. */
function ImageLightbox({
  src,
  name,
  onClose,
}: {
  src: string;
  name: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    // Capture phase, so Escape closes only this view and not a dialog it was opened from.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 p-4 sm:p-8 bg-ink/85 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={name}
        className="relative max-w-full"
      >
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Close image"
          className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full bg-white text-ink flex items-center justify-center cursor-pointer hover:bg-canvas transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name}
          className="block w-[min(88vw,640px)] h-[min(72vh,640px)] rounded-2xl bg-white object-contain"
        />
      </div>
      <p className="text-sm font-medium text-white text-center">{name}</p>
    </div>,
    document.body,
  );
}
