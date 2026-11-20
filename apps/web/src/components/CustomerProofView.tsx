"use client";

import React from "react";

export function CustomerProofView() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl font-bold mb-3">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-zinc-900">Order Packing Verification</h2>
        <p className="text-sm text-zinc-500 mt-1 max-w-md mx-auto">
          Here is the tamper-proof video recorded by our warehouse team while packing your order{" "}
          <span className="font-semibold text-zinc-800">#1042</span>.
        </p>
      </div>

      {/* Video Player Card */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm space-y-4">
        <div className="aspect-video bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center relative shadow-inner">
          <div className="text-center text-white z-10">
            <div className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-500 cursor-pointer flex items-center justify-center text-2xl mx-auto mb-3 shadow-lg transition-transform hover:scale-105">
              ▶
            </div>
            <p className="text-sm font-bold">Watch Your Order Packing Video</p>
            <p className="text-xs text-zinc-400 mt-0.5">Recorded live at Bengaluru Warehouse</p>
          </div>
          {/* Watermark */}
          <div className="absolute bottom-3 left-3 bg-black/60 px-2.5 py-1 rounded text-[11px] font-mono text-zinc-300">
            SHIPPROOF • #1042 • 17-NOV-2026
          </div>
        </div>

        {/* Verified Items Breakdown */}
        <div className="pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
            Items Included & Verified in This Package
          </h4>
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <span className="text-emerald-600 font-bold">✓</span>
                <div>
                  <span className="font-bold text-zinc-800 block">22K Gold Filigree Ring (Size 14)</span>
                  <span className="text-zinc-500 font-mono text-[11px]">SKU: PJ-GLD-RNG-01</span>
                </div>
              </div>
              <span className="font-semibold text-zinc-700">Qty: 1</span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <span className="text-emerald-600 font-bold">✓</span>
                <div>
                  <span className="font-bold text-zinc-800 block">Sterling Silver Box Chain (18 Inch)</span>
                  <span className="text-zinc-500 font-mono text-[11px]">SKU: PJ-SIL-CHN-05</span>
                </div>
              </div>
              <span className="font-semibold text-zinc-700">Qty: 1</span>
            </div>
          </div>
        </div>

        {/* Retention & Security Notice */}
        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-800 flex items-center space-x-2.5">
          <span className="text-base">🔒</span>
          <div>
            <span className="font-bold block">Security & Privacy Assurance</span>
            <span className="text-[11px] text-blue-700">
              This recording is securely archived and accessible for 7 days post-delivery.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
