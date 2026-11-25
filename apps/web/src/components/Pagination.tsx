"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageList, pageRange } from "../lib/pagination";

/**
 * The bar under a list: "Showing 6 to 10 of 18 orders", a rows-per-page choice, and Previous, page numbers and
 * Next. The page buttons only appear when there is more than one page.
 */
export function Pagination({
  page,
  totalPages,
  pageSize,
  pageSizes,
  total,
  noun,
  onPage,
  onPageSize,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  pageSizes: number[];
  total: number;
  /** What the list holds, for the "Showing" text, for example "pending orders". */
  noun: string;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  const { from, to } = pageRange(page, pageSize, total);
  const button =
    "min-w-9 h-9 px-2 rounded-lg text-sm font-medium inline-flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <p className="text-xs text-muted">
        {total === 0
          ? `No ${noun}`
          : `Showing ${from} to ${to} of ${total} ${noun}`}
      </p>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {total > pageSizes[0] && (
          <label className="flex items-center gap-2 text-xs text-muted">
            Rows per page
            <select
              value={pageSize}
              onChange={(e) => onPageSize(Number(e.target.value))}
              className="h-9 rounded-lg bg-canvas px-2 text-sm text-ink cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {pageSizes.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}

        {totalPages > 1 && (
          <nav aria-label="Pagination" className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPage(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
              className={`${button} bg-canvas hover:bg-[#E1E5EF]`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {pageList(page, totalPages).map((item, i) =>
              item === "gap" ? (
                <span
                  key={`gap-${i}`}
                  aria-hidden="true"
                  className="w-6 text-center text-muted text-sm"
                >
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPage(item)}
                  aria-label={`Page ${item}`}
                  aria-current={item === page ? "page" : undefined}
                  className={`${button} ${item === page ? "bg-ink text-white" : "bg-canvas hover:bg-[#E1E5EF] text-ink"}`}
                >
                  {item}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => onPage(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
              className={`${button} bg-canvas hover:bg-[#E1E5EF]`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
