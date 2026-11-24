"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronRight, MoreVertical, X, type LucideIcon } from "lucide-react";

export interface RowMenuItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  title?: string;
  danger?: boolean;
}

/** A three-dots button that opens a small modal of actions for a table row. */
export function RowMenu({
  items,
  label,
  heading,
  subheading,
}: {
  items: RowMenuItem[];
  /** Accessible name of the three-dots button. */
  label: string;
  /** Title of the modal, for example the order number. */
  heading: string;
  subheading?: string;
}) {
  // Where the card sits on the screen: just under the three dots, lined up with their right edge.
  const [pos, setPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  const open = pos !== null;
  const setOpen = (value: boolean) => {
    if (!value) return setPos(null);
    const r = button.current?.getBoundingClientRect();
    if (!r) return;
    const right = window.innerWidth - r.right;
    // Near the bottom of the screen the card opens upwards so it is never cut off.
    if (window.innerHeight - r.bottom < 240)
      setPos({ bottom: window.innerHeight - r.top + 6, right });
    else setPos({ top: r.bottom + 6, right });
  };
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const close = () => setPos(null);
    document.addEventListener("keydown", onKey);
    // The card is placed on the screen, so it closes when the page moves under it.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="w-8 h-8 rounded-full inline-flex items-center justify-center text-ink/70 hover:bg-canvas cursor-pointer transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {pos && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={heading}
            onClick={(e) => e.stopPropagation()}
            style={{ top: pos.top, bottom: pos.bottom, right: pos.right }}
            className="fixed w-[240px] text-left rounded-2xl bg-white border border-[#D9DCE6]"
          >
            <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold truncate">{heading}</h2>
                {subheading && (
                  <p className="text-xs text-muted mt-0.5">{subheading}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="w-7 h-7 -mr-1.5 -mt-0.5 shrink-0 rounded-full inline-flex items-center justify-center text-muted hover:bg-canvas cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ul className="border-t border-[#E6E8F0]">
              {items.map(
                ({
                  label: text,
                  icon: Icon,
                  onSelect,
                  disabled,
                  title,
                  danger,
                }) => (
                  <li
                    key={text}
                    className="border-b border-[#E6E8F0] last:border-b-0"
                  >
                    <button
                      type="button"
                      disabled={disabled}
                      title={title}
                      onClick={() => {
                        setOpen(false);
                        onSelect();
                      }}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-left transition-colors cursor-pointer hover:bg-canvas/70 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent ${danger ? "text-[#B2453D]" : "text-ink"}`}
                    >
                      <Icon className="w-4 h-4 opacity-70" strokeWidth={1.75} />
                      <span className="flex-1">{text}</span>
                      <ChevronRight className="w-4 h-4 opacity-40" />
                    </button>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
