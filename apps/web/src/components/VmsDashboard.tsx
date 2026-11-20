"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  imageUrl: string;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  itemCount: number;
  placedTime: string;
  placedDate: string;
  status: "Pending" | "Packing" | "Packed" | "Dispatched";
  thumbnailUrl: string;
  items: OrderItem[];
}

const INITIAL_ORDERS: OrderRecord[] = [
  {
    id: "ord-10582",
    orderNumber: "#10582",
    customerName: "Rahul Kumar",
    customerPhone: "+91 98765 43210",
    customerEmail: "rahul@example.com",
    itemCount: 3,
    placedTime: "2:34 PM",
    placedDate: "20 Nov 2026",
    status: "Pending",
    thumbnailUrl: "/item-sneaker.jpg",
    items: [
      {
        id: "itm-1",
        name: "White Sneakers",
        quantity: 1,
        imageUrl: "/item-sneaker.jpg",
      },
      {
        id: "itm-2",
        name: "Black Classic T-Shirt",
        quantity: 1,
        imageUrl: "/item-tshirt.jpg",
      },
      {
        id: "itm-3",
        name: "Wireless Over-Ear Headphones",
        quantity: 1,
        imageUrl: "/item-headphones.jpg",
      },
    ],
  },
  {
    id: "ord-10581",
    orderNumber: "#10581",
    customerName: "Anjali Menon",
    customerPhone: "+91 98451 23456",
    customerEmail: "anjali.m@example.com",
    itemCount: 2,
    placedTime: "2:33 PM",
    placedDate: "20 Nov 2026",
    status: "Packing",
    thumbnailUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&auto=format&fit=crop&q=80",
    items: [
      {
        id: "itm-3",
        name: "Wireless Headphones",
        quantity: 1,
        imageUrl: "/item-headphones.jpg",
      },
      {
        id: "itm-5",
        name: "Fitness Smartwatch",
        quantity: 1,
        imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    id: "ord-10580",
    orderNumber: "#10580",
    customerName: "Arjun Nair",
    customerPhone: "+91 97400 98765",
    customerEmail: "arjun.nair@example.com",
    itemCount: 5,
    placedTime: "2:31 PM",
    placedDate: "20 Nov 2026",
    status: "Pending",
    thumbnailUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=150&auto=format&fit=crop&q=80",
    items: [
      {
        id: "itm-4",
        name: "Leather Handbag",
        quantity: 1,
        imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200&auto=format&fit=crop&q=80",
      },
      {
        id: "itm-6",
        name: "Polarized Sunglasses",
        quantity: 2,
        imageUrl: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&auto=format&fit=crop&q=80",
      },
      {
        id: "itm-2",
        name: "Black Classic T-Shirt",
        quantity: 2,
        imageUrl: "/item-tshirt.jpg",
      },
    ],
  },
  {
    id: "ord-10579",
    orderNumber: "#10579",
    customerName: "Meera S.",
    customerPhone: "+91 99123 45678",
    customerEmail: "meera.s@example.com",
    itemCount: 1,
    placedTime: "2:29 PM",
    placedDate: "20 Nov 2026",
    status: "Packed",
    thumbnailUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&auto=format&fit=crop&q=80",
    items: [
      {
        id: "itm-5",
        name: "Fitness Smartwatch Black Edition",
        quantity: 1,
        imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    id: "ord-10578",
    orderNumber: "#10578",
    customerName: "Vivek Das",
    customerPhone: "+91 98234 56789",
    customerEmail: "vivek.das@example.com",
    itemCount: 2,
    placedTime: "2:27 PM",
    placedDate: "20 Nov 2026",
    status: "Packed",
    thumbnailUrl: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=150&auto=format&fit=crop&q=80",
    items: [
      {
        id: "itm-6",
        name: "Polarized UV Sunglasses",
        quantity: 1,
        imageUrl: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&auto=format&fit=crop&q=80",
      },
      {
        id: "itm-1",
        name: "White Sneakers",
        quantity: 1,
        imageUrl: "/item-sneaker.jpg",
      },
    ],
  },
  {
    id: "ord-10577",
    orderNumber: "#10577",
    customerName: "Sneha Reddy",
    customerPhone: "+91 98490 12345",
    customerEmail: "sneha.reddy@example.com",
    itemCount: 4,
    placedTime: "2:25 PM",
    placedDate: "20 Nov 2026",
    status: "Dispatched",
    thumbnailUrl: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=150&auto=format&fit=crop&q=80",
    items: [
      {
        id: "itm-7",
        name: "Running Shoes Light Gold",
        quantity: 1,
        imageUrl: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=200&auto=format&fit=crop&q=80",
      },
      {
        id: "itm-4",
        name: "Leather Handbag",
        quantity: 1,
        imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200&auto=format&fit=crop&q=80",
      },
      {
        id: "itm-2",
        name: "Black Classic T-Shirt",
        quantity: 2,
        imageUrl: "/item-tshirt.jpg",
      },
    ],
  },
  {
    id: "ord-10576",
    orderNumber: "#10576",
    customerName: "Aditya Verma",
    customerPhone: "+91 98711 22334",
    customerEmail: "aditya.v@example.com",
    itemCount: 1,
    placedTime: "2:24 PM",
    placedDate: "20 Nov 2026",
    status: "Packed",
    thumbnailUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=150&auto=format&fit=crop&q=80",
    items: [
      {
        id: "itm-1",
        name: "Sport Sneakers White/Grey",
        quantity: 1,
        imageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&auto=format&fit=crop&q=80",
      },
    ],
  },
];

export function VmsDashboard() {
  const [orders, setOrders] = useState<OrderRecord[]>(INITIAL_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord>(INITIAL_ORDERS[0]);
  const [filterTab, setFilterTab] = useState<"All" | "Pending" | "Packed" | "Dispatched">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarNav, setSidebarNav] = useState<"Dashboard" | "Reports" | "Settings">("Dashboard");
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Camera & Recording State
  const [isRecording, setIsRecording] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [recordDuration, setRecordDuration] = useState(74); // 01:14
  const [cameraMode, setCameraMode] = useState<"stream" | "webcam">("stream");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Timer for recording
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      timer = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording, isPaused]);

  // Webcam connect handler
  const handleToggleWebcam = async () => {
    if (cameraMode === "stream") {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
          setCameraMode("webcam");
        }
      } catch (err) {
        console.warn("Webcam access not granted, continuing with high-res stream.", err);
      }
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setCameraMode("stream");
    }
  };

  // Format record duration
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Status Badge Helper matching reference screenshot colors
  const renderStatusBadge = (status: OrderRecord["status"]) => {
    switch (status) {
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF7ED] text-[#EA580C] border border-[#FFEDD5]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
            Pending
          </span>
        );
      case "Packing":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
            Packing
          </span>
        );
      case "Packed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#059669] border border-[#D1FAE5]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
            Packed
          </span>
        );
      case "Dispatched":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F5F3FF] text-[#7C3AED] border border-[#EDE9FE]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
            Dispatched
          </span>
        );
    }
  };

  // Filtered orders list
  const filteredOrders = orders.filter((order) => {
    const matchesFilter = filterTab === "All" || order.status === filterTab;
    const matchesQuery =
      searchQuery.trim() === "" ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-zinc-900 font-sans p-4 sm:p-5 lg:p-6 flex flex-col justify-between">
      <div className="w-full max-w-[1640px] mx-auto flex flex-col lg:flex-row gap-5 items-start">

        {/* ================= COLUMN 1: LEFT SIDEBAR ================= */}
        <aside className="w-full lg:w-[220px] shrink-0 flex flex-col justify-between self-stretch bg-transparent py-1">
          <div className="space-y-6">

            {/* Logo Brand: ShipProof */}
            <Link href="/" className="flex items-center space-x-2.5 px-1 group">
              <div className="w-16 h-16 shrink-0 flex items-center justify-center bg-transparent">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="ShipProof Logo"
                  className="w-full h-full object-contain select-none group-hover:scale-105 transition-transform"
                />
              </div>
              <span className="font-calligraphy font-bold text-2xl sm:text-[26px] text-zinc-900 group-hover:text-[#3654D6] leading-tight tracking-wide transition-colors whitespace-nowrap">
                ShipProof
              </span>
            </Link>

            {/* Navigation Menu */}
            <nav className="space-y-1.5">
              <button
                onClick={() => setSidebarNav("Dashboard")}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${sidebarNav === "Dashboard"
                  ? "bg-[#EEF2FF] text-[#4F46E5] font-bold shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-white/80"
                  }`}
              >
                <svg className="w-4 h-4 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => setSidebarNav("Reports")}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${sidebarNav === "Reports"
                  ? "bg-[#EEF2FF] text-[#4F46E5] font-bold shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-white/80"
                  }`}
              >
                <svg className="w-4 h-4 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Reports</span>
              </button>

              <button
                onClick={() => setSidebarNav("Settings")}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${sidebarNav === "Settings"
                  ? "bg-[#EEF2FF] text-[#4F46E5] font-bold shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-white/80"
                  }`}
              >
                <svg className="w-4 h-4 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </button>
            </nav>

          </div>

          {/* Bottom Card: Shopify Integration Status */}
          <div className="pt-6">
            <div className="p-3 bg-white rounded-2xl border border-zinc-200/80 shadow-xs flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-[#95BF47]/15 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#5E8E3E]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.5 7.5L16 6l-2-2.5h-4L8 6 4.5 7.5C3.7 7.9 3.2 8.7 3.2 9.6L2 20.5C2 21.3 2.7 22 3.5 22h17c.8 0 1.5-.7 1.5-1.5L20.8 9.6c0-.9-.5-1.7-1.3-2.1z" />
                </svg>
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-zinc-900 truncate">Shopify Connected</div>
                <div className="text-[10px] text-zinc-400 font-medium">Last sync: 1 min ago</div>
              </div>
            </div>

            <div className="mt-2.5 text-center">
              <Link
                href="/login"
                className="text-[11px] font-semibold text-zinc-400 hover:text-[#4F46E5] transition-colors"
              >
                Switch Account / Sign In →
              </Link>
            </div>
          </div>
        </aside>

        {/* ================= COLUMN 2: CENTER ORDERS & METRICS ================= */}
        <main className="flex-1 min-w-0 space-y-4">

          {/* Top Search Pill Bar */}
          <div className="flex items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-full border border-zinc-200/80 shadow-xs">
            <div className="flex items-center space-x-2.5 flex-1">
              <svg className="w-4 h-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders...  (e.g. #10582)"
                className="w-full text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 bg-transparent focus:outline-none"
              />
            </div>

            {/* Live Indicator Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live</span>
            </div>
          </div>

          {/* Heading */}
          <div className="flex items-center justify-between pt-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
              Orders
            </h1>
            {!showRightPanel && (
              <button
                onClick={() => setShowRightPanel(true)}
                className="text-xs font-bold text-[#4F46E5] hover:underline"
              >
                Show Order Details & Camera →
              </button>
            )}
          </div>

          {/* 4 Stat Cards in a row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">

            {/* Total Orders */}
            <div className="bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-xs flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-zinc-900 leading-none">248</div>
                <div className="text-[11px] font-medium text-zinc-500 mt-1">Total Orders</div>
              </div>
            </div>

            {/* Pending */}
            <div className="bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-xs flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                </svg>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-zinc-900 leading-none">64</div>
                <div className="text-[11px] font-medium text-zinc-500 mt-1">Pending</div>
              </div>
            </div>

            {/* Packed */}
            <div className="bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-xs flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-zinc-900 leading-none">156</div>
                <div className="text-[11px] font-medium text-zinc-500 mt-1">Packed</div>
              </div>
            </div>

            {/* Dispatched */}
            <div className="bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-xs flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8h4l3 3v5a1 1 0 01-1 1h-2" />
                </svg>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-zinc-900 leading-none">28</div>
                <div className="text-[11px] font-medium text-zinc-500 mt-1">Dispatched</div>
              </div>
            </div>

          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterTab("All")}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${filterTab === "All"
                ? "bg-[#4F46E5] text-white shadow-xs font-bold"
                : "bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200/80"
                }`}
            >
              All (248)
            </button>
            <button
              onClick={() => setFilterTab("Pending")}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${filterTab === "Pending"
                ? "bg-[#4F46E5] text-white shadow-xs font-bold"
                : "bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200/80"
                }`}
            >
              Pending (64)
            </button>
            <button
              onClick={() => setFilterTab("Packed")}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${filterTab === "Packed"
                ? "bg-[#4F46E5] text-white shadow-xs font-bold"
                : "bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200/80"
                }`}
            >
              Packed (156)
            </button>
            <button
              onClick={() => setFilterTab("Dispatched")}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${filterTab === "Dispatched"
                ? "bg-[#4F46E5] text-white shadow-xs font-bold"
                : "bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200/80"
                }`}
            >
              Dispatched (28)
            </button>
          </div>

          {/* Orders Table Card */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Order</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Items</th>
                    <th className="py-3.5 px-4">Placed At</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs font-medium">
                  {filteredOrders.map((order) => {
                    const isSelected = selectedOrder?.id === order.id;
                    return (
                      <tr
                        key={order.id}
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowRightPanel(true);
                        }}
                        className={`transition-colors cursor-pointer group ${isSelected
                          ? "bg-[#EEF2FF] border-l-4 border-l-[#4F46E5]"
                          : "hover:bg-zinc-50/80"
                          }`}
                      >
                        {/* Order & Thumbnail */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-zinc-100 overflow-hidden shrink-0 flex items-center justify-center border border-zinc-200/60">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={order.thumbnailUrl}
                                alt={order.orderNumber}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="font-extrabold text-zinc-900 group-hover:text-[#4F46E5] transition-colors">
                              {order.orderNumber}
                            </span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-3 px-4 font-semibold text-zinc-800">
                          {order.customerName}
                        </td>

                        {/* Items */}
                        <td className="py-3 px-4 text-zinc-500 font-normal">
                          {order.itemCount} items
                        </td>

                        {/* Placed At */}
                        <td className="py-3 px-4 text-zinc-500 font-normal">
                          {order.placedTime}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {renderStatusBadge(order.status)}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            className={`w-7 h-7 rounded-full inline-flex items-center justify-center transition-transform ${isSelected
                              ? "bg-[#4F46E5] text-white shadow-xs"
                              : "bg-zinc-100 text-zinc-400 group-hover:text-zinc-700 group-hover:bg-zinc-200/70"
                              }`}
                          >
                            <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </main>

        {/* ================= COLUMN 3: RIGHT DETAIL & CAMERA PANEL ================= */}
        {showRightPanel && selectedOrder && (
          <aside className="w-full lg:w-[400px] shrink-0 bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200/80 shadow-xs space-y-4">

            {/* Top Bar: Status Badge + Close Button */}
            <div className="flex items-center justify-between">
              {renderStatusBadge(selectedOrder.status)}
              <button
                onClick={() => setShowRightPanel(false)}
                className="w-7 h-7 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                title="Hide details"
              >
                ✕
              </button>
            </div>

            {/* Order Title & Placed Date */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight leading-none">
                {selectedOrder.orderNumber}
              </h2>
              <p className="text-xs text-zinc-400 font-medium mt-1.5">
                Placed at {selectedOrder.placedTime} • {selectedOrder.placedDate}
              </p>
            </div>

            {/* Customer Contact Details */}
            <div className="space-y-2 py-1 text-xs">
              <div className="flex items-center space-x-2.5 text-zinc-900 font-bold">
                <svg className="w-4 h-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{selectedOrder.customerName}</span>
              </div>
              <div className="flex items-center space-x-2.5 text-zinc-500 font-normal">
                <svg className="w-4 h-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>{selectedOrder.customerPhone}</span>
              </div>
              <div className="flex items-center space-x-2.5 text-zinc-500 font-normal">
                <svg className="w-4 h-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="truncate">{selectedOrder.customerEmail}</span>
              </div>
            </div>

            {/* Order Items Horizontal Row */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="text-xs font-bold text-zinc-900 tracking-wide">
                    Order Items ({selectedOrder.itemCount})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => alert(`Reviewing all ${selectedOrder.itemCount} items for ${selectedOrder.orderNumber}`)}
                  className="text-xs font-bold text-[#4F46E5] hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <span>View Items</span>
                  <span>→</span>
                </button>
              </div>

              {/* Items Card List */}
              <div className="grid grid-cols-3 gap-2.5">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex flex-col items-center">
                    <div className="w-full aspect-square rounded-2xl bg-[#F8FAFC] border border-zinc-100 p-2 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-xs font-semibold text-zinc-500 mt-1.5">
                      ×{item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Packing Camera Section */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-xs font-bold text-zinc-900 tracking-wide">
                    Packing Camera
                  </h3>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleToggleWebcam}
                    className="text-[10px] text-zinc-400 hover:text-[#4F46E5] font-semibold underline cursor-pointer"
                    title="Switch camera"
                  >
                    {cameraMode === "stream" ? "Use Webcam" : "Use Stream"}
                  </button>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live</span>
                  </div>
                </div>
              </div>

              {/* Viewfinder: Real Packing Bay Feed */}
              <div className="relative aspect-[16/9.6] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-200 shadow-inner flex items-center justify-center">
                {cameraMode === "webcam" ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/camera-feed.jpg"
                      alt="Warehouse Packing Station Camera Feed"
                      className={`w-full h-full object-cover transition-opacity duration-300 ${isPaused ? "opacity-60" : "opacity-100"
                        }`}
                    />
                  </>
                )}

                {/* Overlaid Live Stamp & REC badge */}
                <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-white">
                  <span className={`w-2 h-2 rounded-full ${isRecording && !isPaused ? "bg-red-500 animate-ping" : "bg-zinc-400"}`} />
                  <span>{isRecording && !isPaused ? `REC ${formatTime(recordDuration)}` : "PAUSED"}</span>
                </div>

                {isPaused && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs">
                    <div className="bg-black/80 px-3 py-1.5 rounded-xl text-white text-xs font-bold flex items-center space-x-2">
                      <span>⏸ Video Paused</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: Pause & Stop/Start Recording */}
              <div className="flex items-center space-x-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  className="px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    {isPaused ? (
                      <path d="M8 5v14l11-7z" />
                    ) : (
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    )}
                  </svg>
                  <span>{isPaused ? "Resume" : "Pause"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isRecording) {
                      setIsRecording(false);
                      setIsPaused(false);
                      alert(`Recording stopped and synced for order ${selectedOrder.orderNumber}! Duration: ${formatTime(recordDuration)}.`);
                    } else {
                      setIsRecording(true);
                      setIsPaused(false);
                      setRecordDuration(0);
                    }
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-2xl text-white text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm active:scale-98 ${isRecording
                    ? "bg-[#EF4444] hover:bg-[#DC2626] shadow-red-500/25"
                    : "bg-[#16A34A] hover:bg-[#15803D] shadow-emerald-500/25"
                    }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                  <span>{isRecording ? "Stop Recording" : "Start Recording"}</span>
                </button>
              </div>
            </div>

          </aside>
        )}

      </div>
    </div>
  );
}
