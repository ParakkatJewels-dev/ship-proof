"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

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
      if (!adminEmail || !adminEmail.includes("@")) {
        setError("Please enter a valid administrator email address.");
        setLoading(false);
        return;
      }

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

          {/* ShipProof Text Below The Image */}
          <div className="mt-4 sm:mt-[18px] text-center">
            <Link href="/" className="inline-block group">
              <span className="font-calligraphy font-bold text-4xl sm:text-5xl lg:text-6xl text-white block leading-tight tracking-wide group-hover:scale-105 transition-transform drop-shadow-sm">
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

        <div className="w-full max-w-sm sm:max-w-md mx-auto my-auto space-y-6">

          {/* Main Heading */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight leading-snug">
              Admin Login
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1.5 font-normal">
              Enter your credentials to access the audit and operations console
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center space-x-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-700 tracking-wide">
                Email address
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@shipproof.com"
                required
                className="w-full text-sm px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#3654D6] focus:ring-2 focus:ring-[#3654D6]/15 transition-colors"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-700 tracking-wide">
                Password
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full text-sm px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#3654D6] focus:ring-2 focus:ring-[#3654D6]/15 transition-colors"
              />
            </div>

            {/* Primary Action Button (Blue #3654D6) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg bg-[#3654D6] hover:bg-[#2b45b5] text-white font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-70"
              >
                <span>{loading ? "Authenticating..." : "Sign in to Admin Console"}</span>
                <span>→</span>
              </button>
            </div>

          </form>

        </div>

      </section>

    </div>
  );
}
