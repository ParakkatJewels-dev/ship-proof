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
  const [authTab, setAuthTab] = useState<"packer" | "admin">("packer");
  const [packerName, setPackerName] = useState("Jithin P.M.");
  const [packerPin, setPackerPin] = useState("1234");
  const [adminEmail, setAdminEmail] = useState("admin@shipproof.com");
  const [adminPassword, setAdminPassword] = useState("admin123");

  if (!isOpen) return null;

  const handlePackerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({
      name: packerName || "Station Packer",
      role: "PACKER",
      id: "PKR-101",
      stationId: selectedStation,
    });
    onClose();
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({
      name: "Admin Kasinath",
      role: "ADMIN",
      id: "ADM-001",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h3 className="font-bold text-lg text-zinc-900">ShipProof Authentication</h3>
            <p className="text-xs text-zinc-500">Sign in to access your station or admin controls</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Auth Role Tabs */}
        <div className="grid grid-cols-2 gap-1 bg-zinc-100 p-1 rounded-xl my-4">
          <button
            type="button"
            onClick={() => setAuthTab("packer")}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              authTab === "packer"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            📦 Packer Login
          </button>
          <button
            type="button"
            onClick={() => setAuthTab("admin")}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              authTab === "admin"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            🛡️ Admin Login
          </button>
        </div>

        {/* Packer Form */}
        {authTab === "packer" && (
          <form onSubmit={handlePackerSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Packer Name / Employee ID
              </label>
              <input
                type="text"
                value={packerName}
                onChange={(e) => setPackerName(e.target.value)}
                placeholder="e.g. Jithin P.M. or PKR-101"
                required
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Security PIN
              </label>
              <input
                type="password"
                value={packerPin}
                onChange={(e) => setPackerPin(e.target.value)}
                placeholder="••••"
                required
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900">
              <span className="font-semibold block">Active Bay:</span>
              <span className="font-mono text-[11px] text-indigo-700">{selectedStation}</span>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              Sign In to Packing Bay
            </button>
          </form>
        )}

        {/* Admin Form */}
        {authTab === "admin" && (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Admin Work Email
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@shipproof.com"
                required
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Sign In as Administrator
            </button>
          </form>
        )}

        {/* Quick Demo Fillers */}
        <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
          <span>Demo credentials loaded</span>
          <button
            type="button"
            onClick={authTab === "packer" ? handlePackerSubmit : handleAdminSubmit}
            className="text-indigo-600 font-semibold hover:underline cursor-pointer"
          >
            ⚡ 1-Click Fast Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
