"use client";

import React, { useState } from "react";

interface VideoItem {
  id: string;
  orderNumber: string;
  customer: string;
  packer: string;
  station: string;
  duration: string;
  size: string;
  deliveredAt: string;
  expiryDate: string;
  status: string;
  daysRemaining: number;
}

export function AdminDashboard() {
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  const stations = [
    {
      id: "STATION-01",
      name: "Packing Bay 1 (Main Hall)",
      location: "Bengaluru Warehouse",
      status: "ONLINE",
      camera: "CONNECTED",
      model: "Logitech C920 1080p",
      currentPacker: "Jithin P.M.",
      currentOrder: "#1042",
      fps: 30,
    },
    {
      id: "STATION-02",
      name: "Packing Bay 2 (Express)",
      location: "Bengaluru Warehouse",
      status: "BUSY",
      camera: "RECORDING",
      model: "Hikvision IP Cam",
      currentPacker: "Anand R.",
      currentOrder: "#1044",
      fps: 30,
    },
    {
      id: "STATION-03",
      name: "Packing Bay 3 (High Value)",
      location: "Kochi Showroom",
      status: "OFFLINE",
      camera: "DISCONNECTED",
      model: "Desk Cam 4K",
      currentPacker: "None",
      currentOrder: "Idle",
      fps: 0,
    },
  ];

  const recentVideos = [
    {
      id: "vid-1",
      orderNumber: "#1042",
      customer: "Rohan Sharma",
      packer: "Jithin P.M.",
      station: "STATION-01",
      duration: "01:24",
      size: "24.8 MB",
      deliveredAt: "17 Nov 2026",
      expiryDate: "24 Nov 2026",
      status: "ACTIVE",
      daysRemaining: 4,
    },
    {
      id: "vid-2",
      orderNumber: "#1038",
      customer: "Sneha Patel",
      packer: "Anand R.",
      station: "STATION-02",
      duration: "00:54",
      size: "16.2 MB",
      deliveredAt: "14 Nov 2026",
      expiryDate: "21 Nov 2026",
      status: "EXPIRING_SOON",
      daysRemaining: 1,
    },
    {
      id: "vid-3",
      orderNumber: "#1012",
      customer: "Vijay Kumar",
      packer: "Rahul K.",
      station: "STATION-01",
      duration: "02:10",
      size: "38.5 MB",
      deliveredAt: "08 Nov 2026",
      expiryDate: "15 Nov 2026",
      status: "PURGED",
      daysRemaining: 0,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Active Stations
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-extrabold text-zinc-900">2</span>
            <span className="text-xs text-zinc-400">/ 3 total</span>
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-1">● 1 currently recording</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Packing Videos (Active)
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-extrabold text-zinc-900">142</span>
            <span className="text-xs text-zinc-400">videos</span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">Protected in Supabase Storage</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Auto-Purged (7-Day Expiry)
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-extrabold text-[#3654D6]">68</span>
            <span className="text-xs text-zinc-400">purged</span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">Saved ~1.6 GB storage space</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Shopify Sync Health
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-extrabold text-emerald-600">100%</span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">Webhook latency: &lt; 85ms</p>
        </div>
      </div>

      {/* Packing Stations Real-time Monitor */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm">
        <h3 className="text-base font-bold text-zinc-900 mb-4">
          Packing Bay Hardware & Station Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stations.map((st) => (
            <div
              key={st.id}
              className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-zinc-900">{st.id}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${st.status === "ONLINE"
                      ? "bg-emerald-100 text-emerald-800"
                      : st.status === "BUSY"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                      }`}
                  >
                    {st.status}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-zinc-700 mt-1">{st.name}</h4>
                <p className="text-[11px] text-zinc-500">{st.location}</p>

                <div className="mt-3 pt-3 border-t border-zinc-200/60 space-y-1 text-xs">
                  <div className="flex justify-between text-zinc-600">
                    <span>Camera:</span>
                    <span className="font-medium text-zinc-800">{st.model}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>Packer:</span>
                    <span className="font-medium text-zinc-800">{st.currentPacker}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>Current Order:</span>
                    <span className="font-bold text-[#3654D6]">{st.currentOrder}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>FPS: {st.fps}</span>
                <span>Daemon Heartbeat: OK</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Verification Audit & Retention Table */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900">
              Video Verification Records & Retention Lifecycle
            </h3>
            <p className="text-xs text-zinc-500">
              Videos are kept for 30 days after customer delivery (60 days after a return to origin), then deleted automatically.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-y border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Packer</th>
                <th className="py-3 px-4">Duration & Size</th>
                <th className="py-3 px-4">Delivered On</th>
                <th className="py-3 px-4">Retention Expiry</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-700">
              {recentVideos.map((vid) => (
                <tr key={vid.id} className="hover:bg-zinc-50/50">
                  <td className="py-3.5 px-4 font-bold text-zinc-900">{vid.orderNumber}</td>
                  <td className="py-3.5 px-4">{vid.customer}</td>
                  <td className="py-3.5 px-4 font-medium">{vid.packer}</td>
                  <td className="py-3.5 px-4 font-mono text-zinc-600">
                    {vid.duration} • {vid.size}
                  </td>
                  <td className="py-3.5 px-4">{vid.deliveredAt}</td>
                  <td className="py-3.5 px-4">
                    {vid.status === "ACTIVE" && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {vid.daysRemaining} days left ({vid.expiryDate})
                      </span>
                    )}
                    {vid.status === "EXPIRING_SOON" && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                        Expiring Tomorrow ({vid.expiryDate})
                      </span>
                    )}
                    {vid.status === "PURGED" && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-500">
                        Purged & Deleted
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {vid.status !== "PURGED" ? (
                      <button
                        onClick={() => setSelectedVideo(vid)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Watch Proof
                      </button>
                    ) : (
                      <span className="text-zinc-400 font-medium text-xs">Expired</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h4 className="font-bold text-lg text-zinc-900">
                  Packing Proof: {selectedVideo.orderNumber}
                </h4>
                <p className="text-xs text-zinc-500">
                  Packer: {selectedVideo.packer} • Station: {selectedVideo.station}
                </p>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="my-4 aspect-video bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center text-white relative">
              <div className="text-center">
                <span className="text-4xl block mb-2">▶</span>
                <span className="text-sm font-semibold">Playing Packing Verification Video</span>
                <span className="text-xs text-zinc-500 block mt-1">
                  1080p Stream from Supabase Storage
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-100">
              <span>Retention Expiry: {selectedVideo.expiryDate}</span>
              <button
                onClick={() => setSelectedVideo(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
