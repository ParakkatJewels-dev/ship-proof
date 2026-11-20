"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"packer" | "admin">("packer");

  // Packer credentials
  const [packerName, setPackerName] = useState("Jithin P.M.");
  const [packerPin, setPackerPin] = useState("1234");
  const [stationBay, setStationBay] = useState("STATION-01");

  // Admin credentials
  const [adminEmail, setAdminEmail] = useState("admin@shipproof.com");
  const [adminPassword, setAdminPassword] = useState("admin123");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

    const handleLogin = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      setError(null);
      setLoading(true);

          setTimeout(() => {
            if (role === "packer") {
              if (!packerPin || packerPin.length < 4) {
                setError("Please enter a valid 4-digit security PIN.");
                setLoading(false);
                return;
              }

              const session = {
                name: packerName || "Station Packer",
                role: "PACKER" as const,
                id: "PKR-101",
                stationId: stationBay,
              };

              if (typeof window !== "undefined") {
                localStorage.setItem("shipproof_user", JSON.stringify(session));
              }
              router.push("/?tab=packer");
            } else {
              if (!adminPassword) {
                setError("Please enter your administrator password.");
                setLoading(false);
                return;
              }

              const session = {
                name: "Admin Kasinath",
                role: "ADMIN" as const,
                id: "ADM-001",
              };

        if (typeof window !== "undefined") {
          localStorage.setItem("shipproof_user", JSON.stringify(session));
        }
        router.push("/?tab=admin");
      }
    }, 350);
  };

        return (
        <div className="min-h-screen bg-[#0d162e] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
          {/* Main Split Modal Card Filled with #3154D6 */}
          <div className="relative w-full max-w-4xl bg-[#3154D6] rounded-[2rem] shadow-2xl shadow-black/50 overflow-hidden grid grid-cols-1 md:grid-cols-12 border border-white/15">

            {/* Close Button top-right */}
            <Link
              href="/"
              className="absolute top-5 right-5 z-20 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors text-xs font-bold"
              title="Return to dashboard"
            >
              ✕
            </Link>

            {/* ================= LEFT COLUMN: ARTISTIC BANNER (#3154D6 with deep tint) ================= */}
            <div className="md:col-span-5 bg-black/15 p-8 sm:p-10 flex flex-col justify-between items-center text-center relative overflow-hidden text-white min-h-[360px] md:min-h-[580px] border-b md:border-b-0 md:border-r border-white/10">

              {/* Decorative Sparkle Stars */}
              <div className="absolute top-8 left-10 text-emerald-200 text-lg opacity-90 animate-pulse">✦</div>
              <div className="absolute top-16 right-10 text-emerald-200 text-sm opacity-90">✦</div>
              <div className="absolute bottom-32 left-8 text-emerald-300 text-base opacity-75">✦</div>

                {/* Top Logo */}
                <div className="w-full flex items-center justify-start space-x-2.5 z-10">
                  <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-white text-sm border border-white/30 shadow-sm">
                    SP
                  </div>
                  <span className="font-extrabold text-lg tracking-tight text-white">ShipProof</span>
                </div>

                {/* Center Graphic */}
                <div className="my-auto py-6 flex flex-col items-center z-10 w-full max-w-[240px]">
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    {/* Radial Sunburst overlay */}
                    <div className="absolute inset-0 flex items-center justify-center text-white/20">
                      <svg viewBox="0 0 100 100" className="w-full h-full animate-[spin_60s_linear_infinite]">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                        <path d="M50 0 L50 100 M0 50 L100 50 M15 15 L85 85 M15 85 L85 15" stroke="currentColor" strokeWidth="0.75" />
                      </svg>
                    </div>

                        {/* Glass Card Icon */}
                        <div className="relative z-10 bg-white/15 backdrop-blur-md p-6 rounded-3xl border border-white/30 shadow-xl flex flex-col items-center">
                          <div className="w-16 h-16 rounded-2xl bg-[#bbf7d0] flex items-center justify-center text-[#14422b] shadow-lg mb-2">
                            <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M23 7l-7 5 7 5V7z" />
                              <rect x="1" y="5" width="15" height="14" rx="3" ry="3" />
                            </svg>
                          </div>
                          <div className="flex items-center space-x-1.5 text-[11px] font-bold text-emerald-200 mt-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="tracking-wider uppercase">Live Cam Protocol</span>
                          </div>
                        </div>
                      </div>

                          {/* Pill Badge */}
                          <div className="mt-4 px-4 py-1.5 rounded-full bg-[#bbf7d0] text-[#14422b] text-[11px] font-extrabold uppercase tracking-widest shadow-md">
                            Tamper Proof
                          </div>

                        {/* Typography */}
                        <div className="mt-4">
                          <h4 className="text-white font-extrabold text-sm sm:text-base uppercase tracking-wider leading-snug">
                            Order Packing
                          </h4>
                          <p className="text-blue-100 font-bold text-xs uppercase tracking-widest">
                            Video Verification
                          </p>
                        </div>
                      </div>

                      {/* Footer note */}
                      <div className="text-[11px] text-blue-200/80 font-medium">
                        Supabase Cloud Storage & Shopify Sync
                      </div>
                    </div>

                  {/* ================= RIGHT COLUMN: LOGIN SECTION (FILLED WITH #3154D6) ================= */}
                  <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-center bg-[#3154D6] text-white">

                    {/* Main Heading */}
                    <div className="mb-6">
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                        Sign in to our packing portal today
                      </h1>
                      <p className="text-xs text-blue-100 mt-1.5 font-medium">
                        Secure authentication for warehouse packers and admin auditors
                      </p>
                    </div>

          {error && (
                      <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-300 text-red-100 text-xs font-semibold">
                        ⚠️ {error}
                      </div>
                    )}

                      <form onSubmit={handleLogin} className="space-y-6">

                        {/* Section 1: "Your role" Selection Cards */}
                        <div>
                          <label className="block text-xs font-extrabold text-white uppercase tracking-wider mb-2.5">
                            Your role
                          </label>

                            <div className="space-y-2.5">
                              {/* Packer Option Card */}
                              <div
                                onClick={() => {
                                  setRole("packer");
                                  setError(null);
                                }}
                                className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${role === "packer"
                                    ? "bg-[#eaf0ff] text-[#1e3b8a] font-bold shadow-lg border-white"
                                    : "bg-white/10 hover:bg-white/15 border-white/20 text-white"
                                  }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <div
                                    className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${role === "packer"
                                        ? "bg-[#3154D6] text-white text-xs font-bold"
                                        : "border border-white/40 bg-white/10"
                                      }`}
                                  >
                                    {role === "packer" && "✓"}
                                  </div>
                                  <span className="text-xs font-bold">
                                    Packer Station (Warehouse Bay)
                                  </span>
                                </div>
                              </div>

                                {/* Admin Option Card */}
                                <div
                                  onClick={() => {
                                    setRole("admin");
                                    setError(null);
                                  }}
                                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${role === "admin"
                                      ? "bg-[#eaf0ff] text-[#1e3b8a] font-bold shadow-lg border-white"
                                      : "bg-white/10 hover:bg-white/15 border-white/20 text-white"
                                    }`}
                                >
                                  <div className="flex items-center space-x-3">
                                    <div
                                      className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${role === "admin"
                                          ? "bg-[#3154D6] text-white text-xs font-bold"
                                          : "border border-white/40 bg-white/10"
                                        }`}
                                    >
                                      {role === "admin" && "✓"}
                                    </div>
                                    <span className="text-xs font-bold">
                                      Administrator (Audit & Retention)
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                        {/* Section 2: Input Details */}
                        <div>
                          <label className="block text-xs font-extrabold text-white uppercase tracking-wider mb-2.5">
                            {role === "packer" ? "About yourself" : "Admin credentials"}
                          </label>

                            <div className="space-y-3">
                              {role === "packer" ? (
                                <>
                                  <input
                                    type="text"
                                    value={packerName}
                                    onChange={(e) => setPackerName(e.target.value)}
                                    placeholder="Full name or Employee ID"
                                    required
                                    className="w-full text-xs font-medium px-4 py-3.5 rounded-xl bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm"
                                  />

                                        <select
                                          value={stationBay}
                                          onChange={(e) => setStationBay(e.target.value)}
                                          className="w-full text-xs font-semibold px-4 py-3.5 rounded-xl bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm cursor-pointer"
                                        >
                                          <option value="STATION-01">Bay 1 • Bengaluru Warehouse (Logitech 1080p)</option>
                                          <option value="STATION-02">Bay 2 • Bengaluru Warehouse (RTSP Cam 02)</option>
                                          <option value="STATION-03">Bay 3 • Kochi Showroom (4K Desk Cam)</option>
                                        </select>

                                        <input
                                          type="password"
                                          value={packerPin}
                                          onChange={(e) => setPackerPin(e.target.value)}
                                          placeholder="Security PIN (e.g. 1234)"
                                          required
                                          className="w-full text-xs font-mono px-4 py-3.5 rounded-xl bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm"
                                        />
                                      </>
                                    ) : (
                                      <>
                                        <input
                                          type="email"
                                          value={adminEmail}
                                          onChange={(e) => setAdminEmail(e.target.value)}
                                          placeholder="Admin Email (e.g. admin@shipproof.com)"
                                          required
                                          className="w-full text-xs font-medium px-4 py-3.5 rounded-xl bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm"
                                        />

                                      <input
                                        type="password"
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                        placeholder="Password (e.g. admin123)"
                                        required
                                        className="w-full text-xs font-mono px-4 py-3.5 rounded-xl bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm"
                                      />
                                    </>
                )}
                                  </div>
                                </div>

                        {/* High-Contrast Action Button */}
                        <div>
                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 px-4 rounded-xl bg-white hover:bg-blue-50 text-[#3154D6] font-extrabold text-sm shadow-xl shadow-black/20 transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-[0.99]"
                          >
                            <span>{loading ? "Authenticating..." : role === "packer" ? "Access Packing Bay" : "Open Admin Console"}</span>
                            <span>→</span>
                          </button>
                        </div>

                        {/* Quick Demo Fill */}
                        <div className="pt-2 flex items-center justify-between text-xs text-blue-100">
                          <span>Demo credentials ready</span>
                          <button
                            type="button"
                            onClick={() => handleLogin()}
                            className="text-white font-bold underline hover:text-blue-100 cursor-pointer"
                          >
                            ⚡ 1-Click Fast Fill
                          </button>
                        </div>

                    </form>
                  </div>

            </div>
          </div>
          );
}
