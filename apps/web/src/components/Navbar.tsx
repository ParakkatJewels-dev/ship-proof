"use client";

import React from "react";

interface NavbarProps {
  currentTab: "packer" | "admin" | "customer";
  setCurrentTab: (tab: "packer" | "admin" | "customer") => void;
  selectedStation: string;
  setSelectedStation: (station: string) => void;
  stationStatus: string;
}

export function Navbar({
  currentTab,
  setCurrentTab,
  selectedStation,
  setSelectedStation,
  stationStatus,
}: NavbarProps) {
  return (
    <header className="border-b border-zinc-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-indigo-200">
            SP
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-zinc-900 tracking-tight">ShipProof</span>
              <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                v1.0 Pro
              </span>
            </div>
            <p className="text-xs text-zinc-500">Order Packing Video Verification</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 bg-zinc-100 p-1 rounded-xl">
          <button
            onClick={() => setCurrentTab("packer")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              currentTab === "packer"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            📦 Packer Station
          </button>
          <button
            onClick={() => setCurrentTab("admin")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              currentTab === "admin"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            📊 Admin & Retention
          </button>
          <button
            onClick={() => setCurrentTab("customer")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              currentTab === "customer"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            🎥 Customer View
          </button>
        </nav>

        {/* Station Selector & Health */}
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-medium text-zinc-500 block">Active Bay</span>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="text-xs font-semibold text-zinc-800 bg-transparent cursor-pointer border-none focus:ring-0 p-0"
            >
              <option value="STATION-01">Bay 1 (Logitech 1080p)</option>
              <option value="STATION-02">Bay 2 (RTSP Cam 02)</option>
              <option value="STATION-03">Bay 3 (4K Desk Cam)</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-800">{stationStatus}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
