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
        <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
          {/* Main Split Modal Card */}
          <div className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl shadow-zinc-300/60 overflow-hidden grid grid-cols-1 md:grid-cols-12 border border-zinc-200/70">

            {/* Close Button top-right */}
            <Link
              href="/"
              className="absolute top-5 right-5 z-20 w-8 h-8 rounded-full bg-zinc-200/80 hover:bg-zinc-300 flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors text-xs font-bold"
              title="Close and return to dashboard"
            >
              ✕
            </Link>

            {/* ================= LEFT COLUMN: VIBRANT BLUE BRAND BANNER ================= */}
            <div className="md:col-span-5 bg-[#2557ff] p-8 sm:p-10 flex flex-col justify-between items-center text-center relative overflow-hidden text-white min-h-[380px] md:min-h-[580px]">

              {/* Decorative Sparkle Stars */}
              <div className="absolute top-8 left-10 text-emerald-200 text-lg opacity-80 animate-pulse">✦</div>
              <div className="absolute top-16 right-10 text-emerald-200 text-sm opacity-90">✦</div>
              <div className="absolute bottom-32 left-8 text-emerald-300 text-base opacity-75">✦</div>

              {/* Top Logo / Label */}
              <div className="w-full flex items-center justify-start space-x-2.5 z-10">
                <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center font-bold text-white text-sm border border-white/20">
                  SP
                </div>
                <span className="font-bold text-lg tracking-tight text-white">ShipProof</span>
              </div>

              {/* Center Artistic Illustration (Packaging & Video Verification Graphic) */}
              <div className="my-auto py-6 flex flex-col items-center z-10 w-full max-w-[240px]">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  {/* Radial Sunburst / Seal background */}
                  <div className="absolute inset-0 flex items-center justify-center text-white/20">
                    <svg viewBox="0 0 100 100" className="w-full h-full animate-[spin_60s_linear_infinite]">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                      <path d="M50 0 L50 100 M0 50 L100 50 M15 15 L85 85 M15 85 L85 15" stroke="currentColor" strokeWidth="0.75" />
                    </svg>
                  </div>

                          {/* Verified Camera & Box Vector Artwork */}
                          <div className="relative z-10 bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/25 shadow-xl flex flex-col items-center">
                            <div className="w-16 h-16 rounded-2xl bg-[#bbf7d0] flex items-center justify-center text-[#182c25] shadow-lg mb-2">
                              <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 7l-7 5 7 5V7z" />
                                <rect x="1" y="5" width="15" height="14" rx="3" ry="3" />
                              </svg>
                            </div>
                            <div className="flex items-center space-x-1 text-[11px] font-bold text-emerald-200 mt-1">
                              <span>●</span>
                              <span className="tracking-wider uppercase">Live 1080p Stream</span>
                            </div>
                          </div>
                        </div>

                        {/* Pill Badge (matches the neon/lime badge in reference design) */}
                        <div className="mt-4 px-4 py-1.5 rounded-full bg-[#bbf7d0] text-[#14422b] text-[11px] font-extrabold uppercase tracking-widest shadow-sm">
                          Tamper Proof
                        </div>

                        {/* Bottom Graphic Typography */}
                        <div className="mt-4">
                          <h4 className="text-white font-extrabold text-sm sm:text-base uppercase tracking-wider leading-snug">
                            Order Packing
                          </h4>
                          <p className="text-white/80 font-bold text-xs uppercase tracking-widest">
                            Video Verification
                          </p>
                        </div>
                    </div>

                      {/* Footer watermark */}
                      <div className="text-[11px] text-white/60 font-medium">
                        Protected by Supabase Storage & Shopify Sync
                      </div>
                    </div>

                    {/* ================= RIGHT COLUMN: FORM CARD ================= */}
                    <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-center bg-white">

                      {/* Main Heading */}
                      <div className="mb-6">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight leading-snug">
                          Sign in to our packing portal today
                        </h1>
                        <p className="text-xs text-zinc-500 mt-1.5">
                          Secure authentication for warehouse packers and admin auditors
                        </p>
                      </div>

                      {error && (
                          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                            ⚠️ {error}
                          </div>
          )}

                              <form onSubmit={handleLogin} className="space-y-6">

                                {/* Section 1: "Your role" Selection Cards (Matches Reference design cards) */}
                                <div>
                                  <label className="block text-xs font-extrabold text-zinc-900 mb-2.5">
                                    Your role
                                  </label>

              <div className="space-y-2">
                                      {/* Packer Option Card */}
                                      <div
                                        onClick={() => {
                                          setRole("packer");
                                          setError(null);
                                        }}
                                        className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${role === "packer"
                                            ? "bg-[#eef2ff] border-[#2557ff]/40 text-zinc-900 shadow-sm"
                                            : "bg-[#f8f9fa] border-transparent text-zinc-600 hover:bg-zinc-100"
                                          }`}
                                      >
                                      <div className="flex items-center space-x-3">
                                        <div
                                          className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${role === "packer"
                                              ? "bg-[#2557ff] text-white text-xs font-bold"
                                              : "border border-zinc-300 bg-white"
                                            }`}
                                        >
                                          {role === "packer" && "✓"}
                                        </div>
                                        <span className="text-xs font-bold text-zinc-900">
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
                                          ? "bg-[#eef2ff] border-[#2557ff]/40 text-zinc-900 shadow-sm"
                                          : "bg-[#f8f9fa] border-transparent text-zinc-600 hover:bg-zinc-100"
                                        }`}
                                    >
                                      <div className="flex items-center space-x-3">
                                        <div
                                          className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${role === "admin"
                                              ? "bg-[#2557ff] text-white text-xs font-bold"
                                              : "border border-zinc-300 bg-white"
                                            }`}
                                        >
                                          {role === "admin" && "✓"}
                                        </div>
                                        <span className="text-xs font-bold text-zinc-900">
                                          Administrator (Audit & Retention)
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                  {/* Section 2: "About yourself" Credentials */}
                                  <div>
                                    <label className="block text-xs font-extrabold text-zinc-900 mb-2.5">
                                      {role === "packer" ? "Packer details" : "Admin credentials"}
                                    </label>

                                    <div className="space-y-2.5">
                                      {role === "packer" ? (
                                        <>
                                          <input
                                            type="text"
                                            value={packerName}
                                            onChange={(e) => setPackerName(e.target.value)}
                                            placeholder="Full name or Employee ID"
                                            required
                                            className="w-full text-xs font-medium px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#2557ff] focus:ring-1 focus:ring-[#2557ff] bg-white placeholder-zinc-400"
                                          />

                                          <select
                                            value={stationBay}
                                            onChange={(e) => setStationBay(e.target.value)}
                                            className="w-full text-xs font-semibold px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#2557ff] focus:ring-1 focus:ring-[#2557ff] bg-white text-zinc-800 cursor-pointer"
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
                                            className="w-full text-xs font-mono px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#2557ff] focus:ring-1 focus:ring-[#2557ff] bg-white placeholder-zinc-400"
                                          />
                                        </>
                                      ) : (
                                        <>
                                          <input
                                            type="email"
                                            value={adminEmail}
                                            onChange={(e) => setAdminEmail(e.target.value)}
                                            placeholder="Email (e.g. admin@shipproof.com)"
                                            required
                                            className="w-full text-xs font-medium px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#2557ff] focus:ring-1 focus:ring-[#2557ff] bg-white placeholder-zinc-400"
                                          />

                                          <input
                                            type="password"
                                            value={adminPassword}
                                            onChange={(e) => setAdminPassword(e.target.value)}
                                            placeholder="Password (e.g. admin123)"
                                            required
                                            className="w-full text-xs font-mono px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#2557ff] focus:ring-1 focus:ring-[#2557ff] bg-white placeholder-zinc-400"
                                          />
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Primary Blue Action Button (Matches image button) */}
                                  <div>
                                    <button
                                      type="submit"
                                      disabled={loading}
                                      className="w-full py-3.5 px-4 rounded-xl bg-[#2557ff] hover:bg-[#1f4ae0] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center space-x-2"
                                    >
                                      <span>{loading ? "Authenticating..." : role === "packer" ? "Access Packing Bay" : "Open Admin Console"}</span>
                                    </button>
                                </div>

                                    {/* Demo Quick Fill */}
                                    <div className="pt-2 flex items-center justify-between text-xs text-zinc-400">
                                      <span>Demo credentials ready</span>
                                      <button
                                        type="button"
                                        onClick={() => handleLogin()}
                                        className="text-[#2557ff] font-bold hover:underline cursor-pointer"
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
