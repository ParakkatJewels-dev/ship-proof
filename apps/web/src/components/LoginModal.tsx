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
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
                <div className="relative w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 border border-zinc-200">

                  {/* Close Button top-right */}
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-zinc-200/80 hover:bg-zinc-300 flex items-center justify-center text-zinc-600 transition-colors text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>

                  {/* Left Column: Blue Hero Banner */}
                  <div className="md:col-span-5 bg-[#2557ff] p-7 flex flex-col justify-between items-center text-center text-white relative overflow-hidden min-h-[300px]">
                    <div className="absolute top-6 left-6 text-emerald-200 text-sm opacity-80">✦</div>
                    <div className="absolute top-12 right-6 text-emerald-200 text-xs opacity-90">✦</div>

                    <div className="w-full flex items-center justify-start space-x-2 z-10">
                      <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center font-bold text-white text-xs border border-white/20">
                        SP
                      </div>
                      <span className="font-bold text-base text-white">ShipProof</span>
                    </div>

                    <div className="my-auto py-4 flex flex-col items-center z-10">
                      <div className="w-14 h-14 rounded-2xl bg-[#bbf7d0] flex items-center justify-center text-[#182c25] shadow-lg mb-3">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M23 7l-7 5 7 5V7z" />
                          <rect x="1" y="5" width="15" height="14" rx="3" ry="3" />
                        </svg>
                      </div>
                      <div className="px-3 py-1 rounded-full bg-[#bbf7d0] text-[#14422b] text-[10px] font-extrabold uppercase tracking-widest shadow-sm">
                        Tamper Proof
                      </div>
                      <h4 className="text-white font-extrabold text-sm uppercase tracking-wider mt-3">
                        Video Verification
                      </h4>
                    </div>

                    <div className="text-[10px] text-white/60">
                      Secure Packing Protocol
                    </div>
                  </div>

                        {/* Right Column: Form */}
                        <div className="md:col-span-7 p-7 sm:p-9 bg-white flex flex-col justify-center">
                          <div className="mb-5">
                            <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight">
                              Sign in to ShipProof today
                            </h2>
                            <p className="text-xs text-zinc-500 mt-1">Select your access role to continue</p>
                          </div>

                          {error && (
                            <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                              ⚠️ {error}
                            </div>
                          )}

                          <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-extrabold text-zinc-900 mb-2">
                                  Your role
                                </label>
                            <div className="space-y-1.5">
                              <div
                                onClick={() => setRole("packer")}
                                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${role === "packer"
                                    ? "bg-[#eef2ff] border-[#2557ff]/40 text-zinc-900"
                                    : "bg-[#f8f9fa] border-transparent text-zinc-600 hover:bg-zinc-100"
                                  }`}
                              >
                                <div className="flex items-center space-x-2.5">
                                  <div className={`w-4 h-4 rounded flex items-center justify-center ${role === "packer" ? "bg-[#2557ff] text-white text-[10px] font-bold" : "border border-zinc-300 bg-white"
                                    }`}>
                                    {role === "packer" && "✓"}
                                  </div>
                                  <span className="text-xs font-bold text-zinc-900">Packer Station</span>
                                </div>
                              </div>

                                <div
                                  onClick={() => setRole("admin")}
                                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${role === "admin"
                                      ? "bg-[#eef2ff] border-[#2557ff]/40 text-zinc-900"
                                      : "bg-[#f8f9fa] border-transparent text-zinc-600 hover:bg-zinc-100"
                                    }`}
                                >
                                  <div className="flex items-center space-x-2.5">
                                    <div className={`w-4 h-4 rounded flex items-center justify-center ${role === "admin" ? "bg-[#2557ff] text-white text-[10px] font-bold" : "border border-zinc-300 bg-white"
                                      }`}>
                                      {role === "admin" && "✓"}
                                    </div>
                                    <span className="text-xs font-bold text-zinc-900">Administrator</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                              <div>
                                  <label className="block text-xs font-extrabold text-zinc-900 mb-2">
                                    {role === "packer" ? "Packer details" : "Admin credentials"}
                                  </label>

                                <div className="space-y-2">
                                  {role === "packer" ? (
                                    <>
                                      <input
                                        type="text"
                                        value={packerName}
                                        onChange={(e) => setPackerName(e.target.value)}
                                        placeholder="Full name or Employee ID"
                                        required
                                        className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#2557ff]"
                                      />
                                      <select
                                        value={stationBay}
                                        onChange={(e) => setStationBay(e.target.value)}
                                        className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#2557ff] cursor-pointer"
                                      >
                                        <option value="STATION-01">Bay 1 • Bengaluru Warehouse</option>
                                        <option value="STATION-02">Bay 2 • Express Desk</option>
                                        <option value="STATION-03">Bay 3 • Kochi Showroom</option>
                                      </select>
                                      <input
                                        type="password"
                                        value={packerPin}
                                        onChange={(e) => setPackerPin(e.target.value)}
                                        placeholder="Security PIN"
                                        required
                                        className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#2557ff]"
                                      />
                                    </>
                                  ) : (
                                    <>
                                      <input
                                        type="email"
                                        value={adminEmail}
                                        onChange={(e) => setAdminEmail(e.target.value)}
                                        placeholder="Admin email"
                                        required
                                        className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#2557ff]"
                                      />
                                      <input
                                        type="password"
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                        placeholder="Password"
                                        required
                                        className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-[#2557ff]"
                                      />
                                    </>
                                  )}
                                </div>
                              </div>

                              <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 rounded-xl bg-[#2557ff] hover:bg-[#1f4ae0] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                              >
                                {loading ? "Authenticating..." : role === "packer" ? "Access Packing Bay" : "Open Admin Console"}
                              </button>
                            </form>
                        </div>

                      </div>
                    </div>
                  );
}
