"use client";

import React, { useState } from "react";

export interface UserSession {
  name: string;
  role: "PACKER" | "ADMIN";
  id: string;
  stationId?: string;
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserSession) => void;
  selectedStation: string;
}

export function LoginModal({ isOpen, onClose, onLogin, selectedStation }: LoginModalProps) {
  const [role, setRole] = useState<"packer" | "admin">("packer");
  const [packerName, setPackerName] = useState("Jithin P.M.");
  const [packerPin, setPackerPin] = useState("1234");
  const [stationBay, setStationBay] = useState(selectedStation);

  const [adminEmail, setAdminEmail] = useState("admin@shipproof.com");
  const [adminPassword, setAdminPassword] = useState("admin123");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      if (role === "packer") {
        if (!packerPin || packerPin.length < 4) {
          setError("Please enter a valid 4-digit PIN.");
          setLoading(false);
          return;
        }

        onLogin({
          name: packerName || "Station Packer",
          role: "PACKER",
          id: "PKR-101",
          stationId: stationBay,
        });
      } else {
        if (!adminPassword) {
          setError("Please enter your administrator password.");
          setLoading(false);
          return;
        }

        onLogin({
          name: "Admin Kasinath",
          role: "ADMIN",
          id: "ADM-001",
        });
      }
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans">
      <div className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 border border-zinc-200">

        {/* Close Button top-right */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-20 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors text-xs font-bold cursor-pointer"
          title="Close modal"
        >
          ✕
        </button>

          {/* ================= LEFT COLUMN: BRANDING (SOLID BLUE #3956D7) ================= */}
          <div className="md:col-span-5 bg-[#3956D7] p-8 sm:p-10 flex flex-col justify-between items-center text-center relative text-white min-h-[360px] md:min-h-[560px]">

            {/* Top Logo */}
            <div className="w-full flex items-center justify-start space-x-2.5 z-10">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-white text-sm border border-white/30 shadow-sm">
                SP
              </div>
              <span className="font-extrabold text-lg tracking-tight text-white">ShipProof</span>
            </div>

            {/* Center Graphic */}
              <div className="my-auto py-6 flex flex-col items-center text-center z-10 w-full max-w-[280px]">
                <div className="relative w-full flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/packing-illustration.jpg"
                    alt="Order Packing Station Illustration"
                    className="w-full h-auto max-h-[250px] object-contain rounded-xl select-none"
                  />
                </div>

                <div className="mt-4 px-4 py-1.5 rounded-full bg-[#bbf7d0] text-[#14422b] text-[11px] font-extrabold uppercase tracking-widest shadow-sm">
                  Tamper Proof
                </div>

              <div className="mt-4">
                <h4 className="text-white font-extrabold text-sm sm:text-base uppercase tracking-wider leading-snug">
                  Order Packing
                </h4>
                <p className="text-blue-100 font-bold text-xs uppercase tracking-widest">
                  Video Verification
                </p>
              </div>
            </div>

            <div className="text-[11px] text-blue-100/80 font-medium">
              Supabase Cloud Storage & Shopify Sync
            </div>
          </div>

          {/* ================= RIGHT COLUMN: LOGIN SECTION (PURE WHITE #FFFFFF) ================= */}
          <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-center bg-white text-zinc-900">

            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight leading-snug">
                Sign in to our packing portal today
              </h1>
              <p className="text-xs text-zinc-500 mt-1.5 font-medium">
                Secure authentication for warehouse packers and admin auditors
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

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
                      <span className="text-xs font-bold">
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
                      <input
                        type="text"
                        value={packerName}
                        onChange={(e) => setPackerName(e.target.value)}
                        placeholder="Full name or Employee ID"
                        required
                        className="w-full text-xs font-medium px-4 py-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-[#3956D7] focus:ring-2 focus:ring-[#3956D7]/20 transition-all shadow-sm"
                      />

                      <select
                        value={stationBay}
                        onChange={(e) => setStationBay(e.target.value)}
                        className="w-full text-xs font-semibold px-4 py-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-[#3956D7] focus:ring-2 focus:ring-[#3956D7]/20 transition-all shadow-sm cursor-pointer"
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
                        className="w-full text-xs font-mono px-4 py-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-[#3956D7] focus:ring-2 focus:ring-[#3956D7]/20 transition-all shadow-sm"
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
                        className="w-full text-xs font-medium px-4 py-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-[#3956D7] focus:ring-2 focus:ring-[#3956D7]/20 transition-all shadow-sm"
                      />

                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Password (e.g. admin123)"
                        required
                        className="w-full text-xs font-mono px-4 py-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-[#3956D7] focus:ring-2 focus:ring-[#3956D7]/20 transition-all shadow-sm"
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Primary Action Button */}
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

              {/* Quick Demo Fill */}
              <div className="pt-2 flex items-center justify-between text-xs text-zinc-500">
                <span>Demo credentials ready</span>
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  className="text-[#3956D7] font-bold hover:underline cursor-pointer"
                >
                  ⚡ 1-Click Fast Fill
                </button>
              </div>

            </form>
          </div>

        </div>
      </div >
      );
}
