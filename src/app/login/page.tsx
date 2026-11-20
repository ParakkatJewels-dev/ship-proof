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
    <div className="h-screen w-full grid grid-cols-1 lg:grid-cols-2 font-sans bg-white m-0 p-0 overflow-hidden">

      {/* ================= LEFT SECTION: BRANDING & ENLARGED ILLUSTRATION (SOLID BLUE #3654D6) ================= */}
      <section className="bg-[#3654D6] text-white flex flex-col items-center justify-center p-6 sm:p-10 lg:p-12 h-full overflow-hidden relative select-none">

        <div className="flex flex-col items-center justify-center text-center my-auto w-full max-w-xl">

          {/* Packing Worker Illustration */}
          <div className="relative w-full max-w-[280px] sm:max-w-[360px] lg:max-w-[420px] xl:max-w-[460px] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/packing-illustration.jpg"
              alt="ShipProof Order Packing Station Illustration"
              className="w-full h-auto max-h-[46vh] sm:max-h-[52vh] lg:max-h-[56vh] object-contain rounded-2xl select-none"
            />
          </div>

          {/* ShipProof Signature Calligraphy Text Below The Image */}
          <div className="mt-3 sm:mt-4 text-center">
            <Link href="/" className="inline-block group">
              <span className="font-calligraphy font-bold text-5xl sm:text-6xl lg:text-7xl text-white block leading-tight tracking-wide group-hover:scale-105 transition-transform drop-shadow-sm">
                ShipProof
              </span>
            </Link>
            <p className="text-xs sm:text-sm font-medium text-blue-100/90 tracking-widest uppercase mt-1">
              Order Packing Video Verification
            </p>
          </div>

        </div>

      </section>

      {/* ================= RIGHT SECTION: AUTHENTICATION FORM (PURE WHITE #FFFFFF) ================= */}
      <section className="bg-white text-zinc-900 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 h-full overflow-y-auto">

        <div className="w-full max-w-md mx-auto my-auto space-y-5 sm:space-y-6">

          {/* Main Heading */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight leading-snug">
              Sign in to our packing portal today
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1.5 font-normal">
              Secure authentication for warehouse packers and admin auditors
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center space-x-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">

            {/* Section 1: "Your role" Selection Cards */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
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
                    ? "bg-[#eef3ff] border-2 border-[#3654D6] text-[#3654D6] font-bold shadow-sm"
                    : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700"
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${role === "packer"
                        ? "bg-[#3654D6] text-white text-xs font-bold"
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
                    ? "bg-[#eef3ff] border-2 border-[#3654D6] text-[#3654D6] font-bold shadow-sm"
                    : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700"
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${role === "admin"
                        ? "bg-[#3654D6] text-white text-xs font-bold"
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
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
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
                        className="w-full text-xs sm:text-sm font-medium px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-[#3654D6] focus:ring-2 focus:ring-[#3654D6]/20 transition-all shadow-sm"
                      />
                    </div>

                    <div>
                      <select
                        value={stationBay}
                        onChange={(e) => setStationBay(e.target.value)}
                        className="w-full text-xs sm:text-sm font-semibold px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-[#3654D6] focus:ring-2 focus:ring-[#3654D6]/20 transition-all shadow-sm cursor-pointer"
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
                        className="w-full text-xs sm:text-sm font-mono px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-[#3654D6] focus:ring-2 focus:ring-[#3654D6]/20 transition-all shadow-sm"
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
                        className="w-full text-xs sm:text-sm font-medium px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-[#3654D6] focus:ring-2 focus:ring-[#3654D6]/20 transition-all shadow-sm"
                      />
                    </div>

                    <div>
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Password (e.g. admin123)"
                        required
                        className="w-full text-xs sm:text-sm font-mono px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-[#3654D6] focus:ring-2 focus:ring-[#3654D6]/20 transition-all shadow-sm"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Primary Action Button (Blue #3654D6) */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#3654D6] hover:bg-[#2b45b5] text-white font-extrabold text-sm shadow-lg shadow-[#3654D6]/25 transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-[0.99]"
              >
                <span>{loading ? "Authenticating..." : role === "packer" ? "Access Packing Bay" : "Open Admin Console"}</span>
                <span>→</span>
              </button>
            </div>

            {/* Quick Demo Fill & Return */}
            <div className="pt-1 flex items-center justify-between text-xs text-zinc-500">
              <span>Demo credentials ready</span>
              <button
                type="button"
                onClick={() => handleLogin()}
                className="text-[#3654D6] font-bold hover:underline cursor-pointer"
              >
                ⚡ 1-Click Fast Fill
              </button>
            </div>

          </form>

          {/* Return link */}
          <div className="text-center pt-1">
            <Link
              href="/"
              className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors inline-flex items-center space-x-1"
            >
              <span>←</span>
              <span>Return to Dashboard</span>
            </Link>
          </div>

        </div>

      </section >

    </div >
  );
}
