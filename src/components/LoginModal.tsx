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

export function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      if (!adminEmail) {
        setError("Please enter your email address.");
        setLoading(false);
        return;
      }

      if (!adminPassword) {
        setError("Please enter your password.");
        setLoading(false);
        return;
      }

      const session: UserSession = {
        name: "Admin Kasinath",
        role: "ADMIN",
        id: "ADM-001",
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("shipproof_user", JSON.stringify(session));
      }

      onLogin(session);
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans">
      <div className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 border border-zinc-200">

        {/* Close Button top-right */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-20 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 flex items-center justify-center transition-colors text-xs font-bold cursor-pointer"
          title="Close modal"
        >
          ✕
        </button>

        {/* ================= LEFT COLUMN: BRANDING (SOLID BLUE #3654D6) ================= */}
        <div className="md:col-span-5 bg-[#3654D6] p-6 sm:p-8 flex flex-col items-center justify-center text-center relative text-white min-h-[360px] md:min-h-[480px]">

          {/* Center Graphic: Packing Illustration */}
          <div className="my-auto py-4 flex flex-col items-center justify-center text-center z-10 w-full max-w-[270px]">
            <div className="relative w-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/packing-illustration.jpg"
                alt="ShipProof Order Packing Station Illustration"
                className="w-full h-auto max-h-[250px] object-contain rounded-xl select-none"
              />
            </div>

            {/* ShipProof text below the image */}
            <div className="mt-4 text-center">
              <span className="font-calligraphy font-bold text-3xl sm:text-4xl text-white block leading-tight tracking-wide drop-shadow-sm">
                ShipProof
              </span>
              <p className="text-[11px] font-medium text-blue-100/90 tracking-widest uppercase mt-1">
                Order Packing Video Verification
              </p>
            </div>
          </div>

        </div>

        {/* ================= RIGHT COLUMN: LOGIN SECTION (GREY SHADE CARD ON WHITE BG) ================= */}
        <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-white text-zinc-900">

          <div className="w-full max-w-[420px] sm:max-w-[460px] mx-auto my-auto bg-[#F4F5F7] rounded-2xl p-8 sm:p-10 border border-zinc-200/90 space-y-6">

            {/* Logo in Card Center */}
            <div className="flex justify-center -mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.jpg"
                alt="ShipProof Logo"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain mx-auto mix-blend-multiply select-none"
              />
            </div>

            {/* Main Heading */}
            <div className="text-center">
              <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight leading-[1.2]">
                Sign in to our<br />packing portal today
              </h1>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email Field */}
              <div>
                <label className="block text-sm sm:text-[15px] font-semibold text-zinc-800 mb-2">
                  Email id
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="Enter your Email"
                  required
                  className="w-full text-sm sm:text-base px-4 py-3 rounded-xl bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 placeholder:text-sm sm:placeholder:text-[15px] focus:outline-none focus:border-[#3654D6] transition-colors"
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm sm:text-[15px] font-semibold text-zinc-800 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full text-sm sm:text-base px-4 py-3 rounded-xl bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 placeholder:text-sm sm:placeholder:text-[15px] focus:outline-none focus:border-[#3654D6] transition-colors"
                />
              </div>

              {/* Primary Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-[#3654D6] hover:bg-[#2b45b5] text-white font-semibold text-sm sm:text-base transition-colors cursor-pointer text-center disabled:opacity-70"
                >
                  {loading ? "Signing in..." : "Sign in to portal"}
                </button>
              </div>

            </form>

          </div>

        </div>

      </div>
    </div>
  );
}
