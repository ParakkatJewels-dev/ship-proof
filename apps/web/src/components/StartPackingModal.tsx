"use client";

import React, { useEffect, useRef, useState } from "react";
import { LoaderCircle, Play, X } from "lucide-react";
import type { OrderRecord } from "../lib/orders";
import { useAppData } from "./AppData";
import { ProductThumb, StatusPill } from "./ui";

/** Start packing dialog: enter an order ID, review its products, then confirm to start recording. */
export function StartPackingModal({ onClose }: { onClose: () => void }) {
  const { orders, device, packing, beginPacking } = useAppData();
  const [step, setStep] = useState<"enter" | "review">("enter");
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finding, setFinding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const findOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().replace(/^#/, "");
    if (!q) return setError("Enter an order ID, for example 10582.");
    setError(null);

    let found =
      orders.orders.find((o) => o.orderNumber.replace(/^#/, "") === q) ?? null;
    if (!found && orders.shopify.state === "live") {
      setFinding(true);
      found = await orders.lookUp(q);
      orders.setSearchMessage(null);
      setFinding(false);
    }
    if (!found) {
      return setError(
        `No order #${q} found${orders.shopify.state === "live" ? " in Shopify" : ""}. Check the number and try again.`,
      );
    }
    setOrder(found);
    setStep("review");
    // Let the review step render, then put focus on the main action.
    setTimeout(() => confirmRef.current?.focus(), 0);
  };

  // Why the confirm button can't be used yet, if anything.
  const blocker = !order
    ? null
    : order.cancelled
      ? `Order ${order.orderNumber} was cancelled in Shopify, so it can't be packed.`
      : order.status !== "Pending"
        ? `Order ${order.orderNumber} is already ${order.status.toLowerCase()}.`
        : packing.session.status !== "idle"
          ? `Finish packing ${packing.session.orderNumber} first.`
          : !device.connected
            ? "No camera device is connected. Start the camera agent on the packing station."
            : null;

  const confirm = () => {
    if (!order || blocker) return;
    beginPacking(order);
    onClose();
  };

  const totalQty = order?.items.reduce((sum, it) => sum + it.quantity, 0) ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-packing-title"
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-[22px] shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 id="start-packing-title" className="text-lg font-semibold">
            {step === "enter" ? "Start packing" : `Order ${order?.orderNumber}`}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 -mr-2 rounded-full hover:bg-canvas flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === "enter" ? (
          <form onSubmit={findOrder} className="px-6 pb-6 pt-2">
            <label htmlFor="order-id" className="block text-sm text-muted">
              Enter the order ID to pack
            </label>
            <input
              id="order-id"
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setError(null);
              }}
              placeholder="e.g. #10582"
              autoComplete="off"
              inputMode="numeric"
              aria-describedby={error ? "order-id-error" : undefined}
              aria-invalid={error ? true : undefined}
              className="mt-2 w-full rounded-xl border border-canvas bg-canvas/50 px-4 py-3 text-base outline-none focus:border-accent focus:bg-white transition-colors"
            />
            {error && (
              <p
                id="order-id-error"
                role="alert"
                className="mt-2 text-sm text-[#B2453D]"
              >
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg text-sm font-medium bg-canvas hover:bg-[#E1E5EF] cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={finding}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-accent hover:bg-accent-dark disabled:opacity-60 disabled:cursor-wait cursor-pointer transition-colors"
              >
                {finding && <LoaderCircle className="w-4 h-4 animate-spin" />}
                {finding ? "Finding…" : "Find order"}
              </button>
            </div>
          </form>
        ) : (
          order && (
            <div className="px-6 pb-6 pt-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                <span>
                  {order.placedDate}, {order.placedTime}
                </span>
                <span>{order.customerName}</span>
                <StatusPill status={order.status} />
              </div>

              <table className="mt-4 w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-canvas text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
                    <th scope="col" className="py-2 pr-4 font-semibold">
                      Product name
                    </th>
                    <th
                      scope="col"
                      className="py-2 font-semibold text-right w-20"
                    >
                      Quantity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it, n) => (
                    <tr
                      key={`${it.id}-${n}`}
                      className="border-b border-canvas last:border-0"
                    >
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-3">
                          <ProductThumb
                            src={it.imageUrl}
                            name={it.name}
                            size={44}
                          />
                          {it.name}
                        </div>
                      </td>
                      <td className="py-2.5 text-right tabular-nums font-medium">
                        {it.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted">
                {order.items.length}{" "}
                {order.items.length === 1 ? "product" : "products"} · {totalQty}{" "}
                items in total. Check each one against the box before you start.
              </p>

              {blocker && (
                <p
                  role="alert"
                  className="mt-4 text-sm rounded-xl px-3 py-2 bg-[#F6ECDD] text-[#8A5A1C]"
                >
                  {blocker}
                </p>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setStep("enter");
                    setOrder(null);
                    setTimeout(() => inputRef.current?.focus(), 0);
                  }}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium bg-canvas hover:bg-[#E1E5EF] cursor-pointer transition-colors"
                >
                  Back
                </button>
                <button
                  ref={confirmRef}
                  onClick={confirm}
                  disabled={!!blocker}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-accent hover:bg-accent-dark disabled:opacity-40 disabled:hover:bg-accent disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <Play className="w-3.5 h-3.5" fill="currentColor" />
                  Confirm &amp; start packing
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
