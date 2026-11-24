"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  LoaderCircle,
  LogOut,
  Package,
  Play,
  Search,
  Square,
  Video,
  type LucideIcon,
} from "lucide-react";
import { formatDuration } from "../lib/usePacking";
import { useAppData } from "./AppData";
import { confirmSignOut, showToast } from "../lib/alerts";
import { logout } from "../lib/auth";
import type { ShopifyConnection } from "../lib/useOrders";

const NAV_ITEMS: { label: string; href?: string; icon: LucideIcon }[] = [
  { label: "Dashboard", href: "/", icon: LayoutGrid },
  { label: "Orders", href: "/orders", icon: Package },
  { label: "Recordings", icon: Video },
];

const navButton =
  "w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center shrink-0 transition-colors";

/** Fixed sidebar (left rail on desktop, bottom bar on phones) around a page's content. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { navLocked } = useAppData();
  // The sidebar is switched off while recording; this explains why when it is pressed.
  const lockedNotice = () =>
    showToast(
      "error",
      "Finish the recording before leaving this page.",
      "Recording in progress",
    );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside className="fixed z-30 inset-x-3 bottom-3 md:inset-x-auto md:left-4 md:top-4 md:bottom-4 md:w-15 flex md:flex-col items-center gap-4">
        <Link
          href="/"
          onClick={(e) => {
            if (navLocked) {
              e.preventDefault();
              lockedNotice();
            }
          }}
          className="hidden md:block w-14 h-14 shrink-0"
          aria-label="ShipProof home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-tight.png"
            alt=""
            className="w-full h-full object-contain"
          />
        </Link>
        <nav className="w-full md:flex-1 bg-white rounded-full p-2 flex md:flex-col items-center justify-between gap-1 overflow-x-auto md:overflow-visible shadow-[0_8px_24px_rgba(26,29,41,0.12)] md:shadow-none">
          <div className="flex md:flex-col items-center gap-1 md:gap-2">
            {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
              const active =
                href !== undefined &&
                (href === "/" ? pathname === "/" : pathname.startsWith(href));
              const cls = `${navButton} ${active ? "bg-ink text-white" : "text-ink/80 hover:bg-canvas"}`;
              return href ? (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  title={label}
                  aria-current={active ? "page" : undefined}
                  aria-disabled={navLocked || undefined}
                  onClick={(e) => {
                    if (navLocked) {
                      e.preventDefault();
                      lockedNotice();
                    }
                  }}
                  className={`${cls} ${navLocked ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <Icon className="w-5 h-5" />
                </Link>
              ) : (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  title={`${label} (coming soon)`}
                  className={`${cls} cursor-default`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
          </div>
          <button
            type="button"
            aria-label="Sign out"
            title="Sign out"
            aria-disabled={navLocked || undefined}
            onClick={() => {
              if (navLocked) lockedNotice();
              else
                void confirmSignOut().then((yes) => {
                  if (yes) void logout();
                });
            }}
            className={`${navButton} text-ink/80 hover:bg-canvas cursor-pointer ${navLocked ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </nav>
      </aside>

      {/* Content, offset past the fixed sidebar */}
      <div className="px-3 pt-3 pb-24 sm:px-4 sm:pt-4 md:pb-4 md:pl-23">
        {children}
      </div>
    </div>
  );
}

/** Page title, Shopify connection status and order search. */
export function PageHeader({
  title,
  subtitle,
  shopify,
  search,
  onSearchChange,
  onSearchSubmit,
}: {
  title: string;
  subtitle: string;
  shopify: ShopifyConnection;
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center gap-x-5 gap-y-3 mb-4 min-h-14">
      <Link
        href="/"
        className="md:hidden w-12 h-12 shrink-0"
        aria-label="ShipProof home"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-tight.png"
          alt=""
          className="w-full h-full object-contain"
        />
      </Link>
      <div className="flex-1 min-w-[220px]">
        <h1 className="text-2xl sm:text-[26px] font-medium tracking-tight">
          {title}
        </h1>
        <p className="text-sm sm:text-[15px] text-ink/80 mt-1">{subtitle}</p>
        <span
          role="status"
          className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-white text-[11px] font-medium text-ink/80"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              shopify.state === "live"
                ? "bg-[#2F9E5B]"
                : shopify.state === "demo"
                  ? "bg-[#D08A2C]"
                  : "bg-ink/30 animate-pulse"
            }`}
          />
          {shopify.label}
        </span>
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto">
        <form
          className="flex items-center flex-1 min-w-0 md:w-[380px] bg-white rounded-full pl-5 pr-1.5 py-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit();
          }}
        >
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              shopify.state === "live"
                ? "Search or enter order number..."
                : "Search orders..."
            }
            aria-label="Search orders by number or customer"
            className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-ink/70"
          />
          <button
            type="submit"
            aria-label="Search"
            className="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center shrink-0 cursor-pointer hover:bg-black transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
        <PackingButton />
      </div>
    </header>
  );
}

/** Common Start packing button. While a recording is running it becomes a Stop button with the timer. */
function PackingButton() {
  const { packing, openStartPacking } = useAppData();
  const { session } = packing;

  if (session.status === "starting" || session.status === "stopping") {
    return (
      <button
        disabled
        className={`${headerButton} bg-white text-ink/70 cursor-wait`}
      >
        <LoaderCircle className="w-4 h-4 animate-spin" />
        {session.status === "starting" ? "Starting…" : "Saving video…"}
      </button>
    );
  }
  if (session.status === "recording") {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/packing"
          aria-label="Open the packing page"
          title="Open the packing page"
          className="inline-flex items-center justify-center w-[52px] h-[52px] rounded-full bg-white hover:bg-white/80 text-ink transition-colors"
        >
          <Video className="w-5 h-5" />
        </Link>
        <button
          onClick={() => packing.stop()}
          aria-label={`Stop packing ${session.orderNumber}`}
          className={`${headerButton} bg-[#D9443A] hover:bg-[#C23A31] text-white tabular-nums cursor-pointer`}
        >
          <Square className="w-3.5 h-3.5" fill="currentColor" />
          Stop {session.orderNumber} · {formatDuration(packing.elapsedSeconds)}
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={openStartPacking}
      className="group inline-flex items-center gap-3 h-[52px] pl-2 pr-6 rounded-full shrink-0 whitespace-nowrap text-sm font-medium tracking-wide text-white cursor-pointer bg-linear-to-b from-[#2B3150] to-[#14172A] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span className="w-9 h-9 rounded-full bg-linear-to-br from-[#5E78E4] to-accent flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
        <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />
      </span>
      Start packing
    </button>
  );
}

const headerButton =
  "inline-flex items-center justify-center gap-2 h-[52px] px-5 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-colors";
