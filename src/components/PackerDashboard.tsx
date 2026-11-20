"use client";

import React, { useState, useEffect, useCallback } from "react";

interface OrderItem {
  id: string;
  sku: string;
  title: string;
  variantTitle?: string;
  quantity: number;
  price: string;
  imageUrl?: string;
  verified: boolean;
}

interface OrderData {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  currency: string;
  totalPrice: string;
  items: OrderItem[];
}

const DEFAULT_DEMO_ORDER: OrderData = {
  id: "order-uuid-1042",
  orderNumber: "#1042",
  customerName: "Rohan Sharma",
  customerEmail: "rohan.sharma@example.com",
  currency: "INR",
  totalPrice: "4,999.00",
  items: [
    {
      id: "item-1",
      sku: "PJ-GLD-RNG-01",
      title: "22K Gold Filigree Ring",
      variantTitle: "Size 14",
      quantity: 1,
      price: "3,499.00",
      imageUrl: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300",
      verified: true,
    },
    {
      id: "item-2",
      sku: "PJ-SIL-CHN-05",
      title: "Sterling Silver Box Chain",
      variantTitle: "18 Inch",
      quantity: 1,
      price: "1,500.00",
      imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300",
      verified: false,
    },
  ],
};

export function PackerDashboard({ selectedStation }: { selectedStation: string }) {
  const [searchQuery, setSearchQuery] = useState("#1042");
  const [order, setOrder] = useState<OrderData | null>(DEFAULT_DEMO_ORDER);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);

  const fetchOrder = useCallback((orderNum: string) => {
    setLoading(true);
    setUploadedVideoUrl(null);
    setTimeout(() => {
      setOrder({
        id: `order-uuid-${orderNum.replace(/\D/g, "") || "custom"}`,
        orderNumber: orderNum.startsWith("#") ? orderNum : `#${orderNum}`,
        customerName: "Rohan Sharma",
        customerEmail: "rohan.sharma@example.com",
        currency: "INR",
        totalPrice: "4,999.00",
        items: [
          {
            id: "item-1",
            sku: "PJ-GLD-RNG-01",
            title: "22K Gold Filigree Ring",
            variantTitle: "Size 14",
            quantity: 1,
            price: "3,499.00",
            imageUrl: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300",
            verified: true,
          },
          {
            id: "item-2",
            sku: "PJ-SIL-CHN-05",
            title: "Sterling Silver Box Chain",
            variantTitle: "18 Inch",
            quantity: 1,
            price: "1,500.00",
            imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300",
            verified: false,
          },
        ],
      });
      setLoading(false);
    }, 300);
  }, []);

  // Timer counter when recording
  useEffect(() => {
    if (!isRecording) return;
    const timer = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  const toggleItemVerify = (id: string) => {
    if (!order) return;
    setOrder({
      ...order,
      items: order.items.map((it) => (it.id === id ? { ...it, verified: !it.verified } : it)),
    });
  };

  const startRecording = () => {
    setRecordSeconds(0);
    setIsRecording(true);
    setUploadedVideoUrl(null);
  };

  const stopAndUpload = () => {
    setIsRecording(false);
    setUploadProgress(20);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null) return 20;
        if (prev >= 100) {
          clearInterval(interval);
          setUploadedVideoUrl(
            `https://mock-supabase.co/storage/v1/object/public/packing-videos/orders/${order?.id}/recording.mp4`
          );
          return null;
        }
        return prev + 25;
      });
    }, 400);
  };

  const allItemsVerified = order?.items.every((it) => it.verified) ?? false;

  return (
    <div className="space-y-6">
      {/* Top Search & Barcode Scanner bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full sm:w-auto flex-1">
          <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold">
            🔍
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchOrder(searchQuery)}
            placeholder="Scan barcode or enter Shopify Order ID (e.g. #1042)..."
            className="w-full text-base font-semibold text-zinc-800 placeholder-zinc-400 border-none outline-none focus:ring-0"
          />
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => fetchOrder(searchQuery)}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold shadow-sm transition-all"
          >
            {loading ? "Fetching..." : "Retrieve Order"}
          </button>
        </div>
      </div>

      {order && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Order Items Verification */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-zinc-900">{order.orderNumber}</h2>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#eef3ff] text-[#3654D6] border border-[#3654D6]/20">
                        Shopify Verified
                      </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Customer: <span className="font-semibold text-zinc-700">{order.customerName}</span> ({order.customerEmail})
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-zinc-400 block font-medium">Order Total</span>
                  <span className="text-lg font-bold text-zinc-900">
                    {order.currency} {order.totalPrice}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Package Item Checklist ({order.items.filter((i) => i.verified).length}/{order.items.length})
                  </h3>
                    <span className="text-xs font-medium text-[#3654D6]">
                      Scan or tap each item to confirm inclusion
                    </span>
                </div>

                {order.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleItemVerify(item.id)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${item.verified
                        ? "bg-emerald-50/50 border-emerald-300"
                        : "bg-zinc-50 border-zinc-200 hover:border-zinc-300"
                      }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-14 h-14 object-cover rounded-lg border border-zinc-200"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">{item.title}</h4>
                        <div className="flex items-center space-x-2 text-xs text-zinc-500 mt-0.5">
                          <span className="font-mono bg-zinc-200/60 px-1.5 py-0.5 rounded text-[11px]">
                            {item.sku}
                          </span>
                          {item.variantTitle && <span>• {item.variantTitle}</span>}
                        </div>
                        <span className="text-xs font-semibold text-zinc-700 mt-1 block">
                          Qty: {item.quantity} × ₹{item.price}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs transition-colors ${item.verified ? "bg-emerald-600 text-white" : "border-2 border-zinc-300"
                          }`}
                      >
                        {item.verified && "✓"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Live Camera & Recording Controls */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-zinc-950 rounded-2xl p-5 text-white shadow-xl flex flex-col justify-between">
              {/* Camera Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Live Feed • {selectedStation}
                  </span>
                </div>
                {isRecording && (
                  <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-red-600/30 border border-red-500 text-red-400 font-mono text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span>REC {String(Math.floor(recordSeconds / 60)).padStart(2, "0")}:{String(recordSeconds % 60).padStart(2, "0")}</span>
                  </div>
                )}
              </div>

              {/* Simulated Camera Viewfinder */}
              <div className="relative aspect-video rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />

                <div className="text-center z-10 p-4">
                  <div className="text-4xl mb-2">{isRecording ? "📹" : "📷"}</div>
                  <p className="text-sm font-semibold text-zinc-300">
                    {isRecording ? "Recording Packing Session..." : "Camera Ready & Focused on Bay"}
                  </p>
                  <p className="text-xs text-zinc-500 font-mono mt-1">
                    1080p @ 30 FPS • Station Daemon Local Link: ACTIVE
                  </p>
                </div>

                {/* Viewfinder crosshairs */}
                <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-white/40" />
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-white/40" />
                <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-white/40" />
                <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-white/40" />
              </div>

              {/* Upload Progress Bar */}
              {uploadProgress !== null && (
                <div className="mt-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="flex justify-between text-xs font-semibold text-zinc-300 mb-1.5">
                    <span>Uploading Video to Supabase Storage...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#3654D6] h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Upload Confirmed Badge */}
              {uploadedVideoUrl && (
                <div className="mt-4 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 text-xs flex items-center space-x-2">
                  <span className="text-base">✅</span>
                  <div>
                    <span className="font-bold block">Packing Video Linked & Synced!</span>
                    <span className="text-[11px] text-emerald-400/80">
                      Auto-synced to Shopify Order Metafield. Retained for 7 days post-delivery.
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-5 space-y-2">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center justify-center space-x-2 shadow-lg shadow-red-900/30 transition-all cursor-pointer"
                  >
                    <span className="w-3 h-3 rounded-full bg-white" />
                    <span>Start Video Recording</span>
                  </button>
                ) : (
                  <button
                    onClick={stopAndUpload}
                    disabled={!allItemsVerified}
                    className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-all ${allItemsVerified
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 cursor-pointer"
                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      }`}
                  >
                    <span>⏹ Finish Packing & Upload Proof</span>
                  </button>
                )}

                {!allItemsVerified && isRecording && (
                  <p className="text-[11px] text-amber-400 text-center font-medium">
                    ⚠️ Verify all checklist items before completing the recording.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
