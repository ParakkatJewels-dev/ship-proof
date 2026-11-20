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
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 font-sans bg-white m-0 p-0 overflow-x-hidden">

      {/* ================= LEFT SECTION: BRANDING & CAMERA PANEL (BRIGHT BLUE #3956D7) ================= */}
      <section className="bg-[#3956D7] text-white flex flex-col justify-between p-8 sm:p-12 lg:p-16 min-h-[460px] lg:min-h-screen relative overflow-hidden select-none">

        {/* Background Sparkles & Ambient Glows */}
        <div className="absolute top-10 left-12 text-emerald-200 text-xl opacity-90 animate-pulse pointer-events-none">✦</div>
        <div className="absolute top-24 right-16 text-emerald-200 text-sm opacity-90 pointer-events-none">✦</div>
        <div className="absolute bottom-36 left-14 text-emerald-300 text-lg opacity-80 pointer-events-none">✦</div>
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-blue-900/30 blur-3xl pointer-events-none" />

        {/* Top Header / Brand Logo */}
        <div className="w-full flex items-center justify-between z-10">
          <Link href="/" className="inline-flex items-center space-x-3 group">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-extrabold text-white text-base border border-white/30 shadow-md group-hover:scale-105 transition-transform">
              SP
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tight text-white block leading-tight">ShipProof</span>
              <span className="text-[11px] font-semibold text-blue-100 tracking-wide uppercase">Order Packing Verification</span>
            </div>
          </Link>

          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/15 border border-white/25 text-white/90 backdrop-blur-sm hidden sm:inline-block">
            Enterprise v1.0
          </span>
        </div>

        {/* Center Graphic & Verification Showcase */}
          <div className="my-auto py-6 lg:py-8 flex flex-col items-center text-center z-10 w-full max-w-md mx-auto">

            {/* Packing Worker Illustration */}
            <div className="relative w-full max-w-[280px] sm:max-w-[340px] lg:max-w-[380px] flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full pointer-events-none" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/packing-illustration.jpg"
                alt="Order Packing Station Illustration"
                className="relative z-10 w-full h-auto max-h-[340px] lg:max-h-[400px] object-contain drop-shadow-2xl rounded-2xl select-none"
              />
            </div>

              {/* Tamper Proof Lime Badge */}
              <div className="mt-5 px-4 py-1.5 rounded-full bg-[#bbf7d0] text-[#14422b] text-xs font-extrabold uppercase tracking-widest shadow-md inline-block">
                Tamper Proof
              </div>

              {/* Typography */}
              <div className="mt-4 space-y-1">
                <h2 className="text-white font-extrabold text-xl sm:text-2xl uppercase tracking-wider leading-snug">
                  Order Packing
                </h2>
                <p className="text-blue-100 font-bold text-sm uppercase tracking-widest">
                  Video Verification
                </p>
                <p className="text-blue-100/90 text-xs sm:text-sm font-normal max-w-xs mx-auto pt-1.5 leading-relaxed">
                  Automated station recording with direct Supabase storage and instant Shopify order metafields.
                </p>
              </div>
            </div>

            {/* Footer Meta */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-between text-xs text-blue-100/80 font-medium z-10 gap-2 border-t border-white/15 pt-6">
              <span>Supabase Storage • Shopify Metafields • 7-Day Retention</span>
              <span>© 2026 ShipProof</span>
            </div>

          </section>

          {/* ================= RIGHT SECTION: AUTHENTICATION FORM (PURE WHITE #FFFFFF) ================= */}
          <section className="bg-white text-zinc-900 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 min-h-screen">

            <div className="w-full max-w-md mx-auto my-auto space-y-7">

              {/* Main Heading */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight leading-snug">
                  Sign in to our packing portal today
                </h1>
                <p className="text-sm text-zinc-500 mt-2 font-normal">
                  Secure authentication for warehouse packers and admin auditors
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center space-x-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-6">

                {/* Section 1: "Your role" Selection Cards */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2.5">
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
                        ? "bg-[#eef3ff] border-2 border-[#3956D7] text-[#3956D7] font-bold shadow-sm"
                        : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700"
                        }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${role === "packer"
                            ? "bg-[#3956D7] text-white text-xs font-bold"
                            : "border-2 border-zinc-300 bg-white"
                            }`}
                        >
                          {role === "packer" && "✓"}
                        </div>
                        <span className="text-xs sm:text-sm font-bold">
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
                        ? "bg-[#eef3ff] border-2 border-[#3956D7] text-[#3956D7] font-bold shadow-sm"
                        : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700"
                        }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${role === "admin"
                            ? "bg-[#3956D7] text-white text-xs font-bold"
                            : "border-2 border-zinc-300 bg-white"
                            }`}
                        >
                          {role === "admin" && "✓"}
                        </div>
                        <span className="text-xs sm:text-sm font-bold">
                          Administrator (Audit & Retention)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Input Details */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2.5">
                    {role === "packer" ? "About yourself" : "Admin credentials"}
                  </label>

                  <div className="space-y-3">
                    {role === "packer" ? (
                      <>
                        <div>
                          <input
                            type="text"
                            value={packerName}
                            onChange={(e) => setPackerName(e.target.value)}
                            placeholder="Full name or Employee ID"
                            required
                            className="w-full text-xs sm:text-sm font-medium px-4 py-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-[#3956D7] focus:ring-2 focus:ring-[#3956D7]/20 transition-all shadow-sm"
                          />
                        </div>

                        <div>
                          <select
                            value={stationBay}
                            onChange={(e) => setStationBay(e.target.value)}
                            className="w-full text-xs sm:text-sm font-semibold px-4 py-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-[#3956D7] focus:ring-2 focus:ring-[#3956D7]/20 transition-all shadow-sm cursor-pointer"
                          >
                            <option value="STATION-01">Bay 1 • Bengaluru Warehouse (Logitech 1080p)</option>
                            <option value="STATION-02">Bay 2 • Bengaluru Warehouse (RTSP Cam 02)</option>
                            <option value="STATION-03">Bay 3 • Kochi Showroom (4K Desk Cam)</option>
                          </select>
                        </div>

                        <div>
                          <input
                            type="password"
                            value={packerPin}
                            onChange={(e) => setPackerPin(e.target.value)}
                            placeholder="Security PIN (e.g. 1234)"
                            required
                            className="w-full text-xs sm:text-sm font-mono px-4 py-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-[#3956D7] focus:ring-2 focus:ring-[#3956D7]/20 transition-all shadow-sm"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <input
                            type="email"
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            placeholder="Admin Email (e.g. admin@shipproof.com)"
                            required
                            className="w-full text-xs sm:text-sm font-medium px-4 py-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-[#3956D7] focus:ring-2 focus:ring-[#3956D7]/20 transition-all shadow-sm"
                          />
                        </div>

                        <div>
                          <input
                            type="password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="Password (e.g. admin123)"
                            required
                            className="w-full text-xs sm:text-sm font-mono px-4 py-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-[#3956D7] focus:ring-2 focus:ring-[#3956D7]/20 transition-all shadow-sm"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Primary Action Button (Blue #3956D7) */}
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 px-4 rounded-xl bg-[#3956D7] hover:bg-[#2e47bd] text-white font-extrabold text-sm shadow-lg shadow-[#3956D7]/25 transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-[0.99]"
                  >
                    <span>{loading ? "Authenticating..." : role === "packer" ? "Access Packing Bay" : "Open Admin Console"}</span>
                    <span>→</span>
                  </button>
                </div>

                {/* Quick Demo Fill & Return */}
                <div className="pt-2 flex items-center justify-between text-xs text-zinc-500">
                  <span>Demo credentials ready</span>
                  <button
                    type="button"
                    onClick={() => handleLogin()}
                    className="text-[#3956D7] font-bold hover:underline cursor-pointer"
                  >
                    ⚡ 1-Click Fast Fill
                  </button>
                </div>

              </form>

              {/* Return link */}
              <div className="text-center pt-2">
                <Link
                  href="/"
                  className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors inline-flex items-center space-x-1"
                >
                  <span>←</span>
                  <span>Return to Dashboard</span>
                </Link>
              </div>

            </div>

          </section>

        </div >
        );
}
