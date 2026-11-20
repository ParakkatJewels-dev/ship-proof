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

  const handlePackerLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      if (!packerPin || packerPin.length < 4) {
        setError("Please enter a valid 4-digit security PIN.");
        setLoading(false);
        return;
      }

      const session = {
        name: packerName || "Station Packer",
        role: "PACKER",
        id: "PKR-101",
        stationId: stationBay,
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("shipproof_user", JSON.stringify(session));
      }
      router.push("/?tab=packer");
    }, 350);
  };

  const handleAdminLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      if (!adminPassword) {
        setError("Please enter your administrator password.");
        setLoading(false);
        return;
      }

      const session = {
        name: "Admin Kasinath",
        role: "ADMIN",
        id: "ADM-001",
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("shipproof_user", JSON.stringify(session));
      }
      router.push("/?tab=admin");
    }, 350);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Logo */}
        <Link href="/" className="inline-flex items-center space-x-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-500/20">
            SP
          </div>
          <span className="font-extrabold text-2xl text-zinc-900 tracking-tight">ShipProof</span>
        </Link>
        <h2 className="text-xl font-bold tracking-tight text-zinc-900">
          Order Packing Video Verification
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Sign in to your packing workstation or admin audit console
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-zinc-200/50 rounded-3xl border border-zinc-200/80">
          {/* Role Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setRole("packer");
                setError(null);
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                role === "packer"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              📦 Packer Station
            </button>
            <button
              type="button"
              onClick={() => {
                setRole("admin");
                setError(null);
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                role === "admin"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              🛡️ Administrator
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          {/* Packer Form */}
          {role === "packer" && (
            <form onSubmit={handlePackerLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Packer Name / Employee ID
                </label>
                <input
                  type="text"
                  value={packerName}
                  onChange={(e) => setPackerName(e.target.value)}
                  placeholder="e.g. Jithin P.M. or PKR-101"
                  required
                  className="w-full text-xs font-medium px-4 py-3 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Assigned Packing Bay
                </label>
                <select
                  value={stationBay}
                  onChange={(e) => setStationBay(e.target.value)}
                  className="w-full text-xs font-semibold px-4 py-3 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white cursor-pointer"
                >
                  <option value="STATION-01">Bay 1 (Bengaluru Warehouse - Logitech 1080p)</option>
                  <option value="STATION-02">Bay 2 (Bengaluru Warehouse - RTSP Cam 02)</option>
                  <option value="STATION-03">Bay 3 (Kochi Showroom - 4K Desk Cam)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Workstation Security PIN
                </label>
                <input
                  type="password"
                  value={packerPin}
                  onChange={(e) => setPackerPin(e.target.value)}
                  placeholder="••••"
                  required
                  className="w-full text-xs font-mono px-4 py-3 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>{loading ? "Authenticating..." : "Sign In to Packing Station"}</span>
                <span>→</span>
              </button>
            </form>
          )}

          {/* Admin Form */}
          {role === "admin" && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Admin Work Email
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@shipproof.com"
                  required
                  className="w-full text-xs font-medium px-4 py-3 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Administrator Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full text-xs font-mono px-4 py-3 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>{loading ? "Authenticating..." : "Sign In to Admin Dashboard"}</span>
                <span>→</span>
              </button>
            </form>
          )}

          {/* Quick Demo Login Fillers */}
          <div className="mt-6 pt-5 border-t border-zinc-100 flex items-center justify-between text-xs">
            <span className="text-zinc-400">Quick Test:</span>
            <button
              type="button"
              onClick={() => (role === "packer" ? handlePackerLogin() : handleAdminLogin())}
              className="text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              ⚡ 1-Click Fast Sign In
            </button>
          </div>
        </div>

        {/* Back Link */}
        <p className="mt-6 text-center text-xs text-zinc-500">
          <Link href="/" className="font-semibold text-zinc-700 hover:text-zinc-900">
            ← Return to Dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
