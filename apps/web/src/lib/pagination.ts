/** Total number of pages for a list. An empty list still has one (empty) page. */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}

/** A page number kept inside 1 to the last page, so a shrinking list never leaves you on a page that no longer exists. */
export function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
}

/** The first and last position (1-based) shown on a page, for "Showing 6 to 10 of 18". Both are 0 for an empty list. */
export function pageRange(
  page: number,
  pageSize: number,
  total: number,
): { from: number; to: number } {
  if (total === 0) return { from: 0, to: 0 };
  const from = (page - 1) * pageSize + 1;
  return { from, to: Math.min(total, page * pageSize) };
}

/**
 * The page buttons to show: always the first and last page, the current page with one on each side, and "gap"
 * where pages are skipped. For 20 pages on page 9: 1 ... 8 9 10 ... 20. Short lists show every page.
 */
export function pageList(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const wanted = new Set([1, total, current - 1, current, current + 1]);
  // Near either end, show a few more so the row keeps the same width.
  if (current <= 3) [2, 3, 4].forEach((n) => wanted.add(n));
  if (current >= total - 2)
    [total - 3, total - 2, total - 1].forEach((n) => wanted.add(n));
  const pages = [...wanted]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  pages.forEach((n, i) => {
    if (i > 0 && n - pages[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}
