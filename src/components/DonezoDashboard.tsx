"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export function DonezoDashboard() {
  const [activeMenu, setActiveMenu] = useState<string>("Dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  // Timer Tracker State
  const [timerSeconds, setTimerSeconds] = useState(5048); // 01:24:08
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTimer = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-zinc-900 font-sans p-3 sm:p-5 lg:p-7 flex items-center justify-center">
      {/* Outer Floating Canvas */}
      <div className="w-full max-w-[1580px] bg-white rounded-[2rem] lg:rounded-[2.5rem] shadow-xl border border-zinc-200/70 p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 lg:gap-8">

        {/* ================= LEFT SIDEBAR ================= */}
        <aside className="w-full lg:w-[220px] shrink-0 flex flex-col justify-between">
          <div className="space-y-7">

            {/* Logo Brand: Donezo */}
            <div className="flex items-center space-x-2.5 px-2">
              <div className="w-8 h-8 rounded-full border-2 border-[#10B981] flex items-center justify-center text-[#10B981]">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm1 14.5a4.5 4.5 0 01-4.5-4.5A4.5 4.5 0 0113 7.5a1 1 0 010 2 2.5 2.5 0 00-2.5 2.5A2.5 2.5 0 0013 14.5a1 1 0 010 2z" />
                </svg>
              </div>
              <span className="text-xl font-extrabold text-zinc-900 tracking-tight">Donezo</span>
            </div>

            {/* Section: MENU */}
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-3 mb-2.5">
                Menu
              </div>
              <nav className="space-y-1">
                {/* Dashboard (Active) */}
                <button
                  onClick={() => setActiveMenu("Dashboard")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeMenu === "Dashboard"
                      ? "text-[#0F382C] font-bold"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    {/* Active vertical bar indicator */}
                    {activeMenu === "Dashboard" && (
                      <span className="w-1 h-4 rounded-full bg-[#0F382C] -ml-2 mr-1" />
                    )}
                    <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                      <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zm-9 9h7v7H4v-7zm9 0h7v7h-7v-7z" />
                    </svg>
                    <span>Dashboard</span>
                  </div>
                </button>

                {/* Tasks */}
                <button
                  onClick={() => setActiveMenu("Tasks")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeMenu === "Tasks"
                      ? "text-[#0F382C] font-bold"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    {activeMenu === "Tasks" && (
                      <span className="w-1 h-4 rounded-full bg-[#0F382C] -ml-2 mr-1" />
                    )}
                    <svg className="w-4 h-4 shrink-0 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <span>Tasks</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0F382C] text-white">
                    10+
                  </span>
                </button>

                {/* Calendar */}
                <button
                  onClick={() => setActiveMenu("Calendar")}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeMenu === "Calendar"
                      ? "text-[#0F382C] font-bold"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                    }`}
                >
                  {activeMenu === "Calendar" && (
                    <span className="w-1 h-4 rounded-full bg-[#0F382C] -ml-2 mr-1" />
                  )}
                  <svg className="w-4 h-4 shrink-0 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>Calendar</span>
                </button>

                {/* Analytics */}
                <button
                  onClick={() => setActiveMenu("Analytics")}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeMenu === "Analytics"
                      ? "text-[#0F382C] font-bold"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                    }`}
                >
                  {activeMenu === "Analytics" && (
                    <span className="w-1 h-4 rounded-full bg-[#0F382C] -ml-2 mr-1" />
                  )}
                  <svg className="w-4 h-4 shrink-0 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Analytics</span>
                </button>

                {/* Team */}
                <button
                  onClick={() => setActiveMenu("Team")}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeMenu === "Team"
                      ? "text-[#0F382C] font-bold"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                    }`}
                >
                  {activeMenu === "Team" && (
                    <span className="w-1 h-4 rounded-full bg-[#0F382C] -ml-2 mr-1" />
                  )}
                  <svg className="w-4 h-4 shrink-0 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>Team</span>
                </button>
              </nav>
            </div>

            {/* Section: GENERAL */}
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-3 mb-2.5">
                General
              </div>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveMenu("Settings")}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Settings</span>
                </button>

                <button
                  onClick={() => setActiveMenu("Help")}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3m.08 4h.01" />
                  </svg>
                  <span>Help</span>
                </button>

                <Link
                  href="/login"
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-red-600 hover:bg-red-50/60 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </Link>
              </nav>
            </div>

          </div>

          {/* Bottom Card: "Download our Mobile App" */}
          <div className="pt-6">
            <div className="relative rounded-2xl bg-gradient-to-b from-[#0F382C] to-[#0A261E] p-4 text-white overflow-hidden shadow-sm">
              {/* Subtle wavy pattern background */}
              <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#10B981_1px,transparent_1px)] [background-size:12px_12px]" />

              <h4 className="text-xs font-bold leading-snug relative z-10">
                Download our<br />Mobile App
              </h4>
              <p className="text-[10px] text-zinc-300 mt-1 relative z-10">
                Get easy in another way
              </p>

              <button
                type="button"
                className="mt-3.5 w-full py-1.5 px-3 rounded-full bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer relative z-10"
              >
                Download
              </button>
            </div>
          </div>
        </aside>

        {/* ================= MAIN CONTENT DASHBOARD ================= */}
        <main className="flex-1 min-w-0 space-y-6">

          {/* Top Header Bar: Search, Shortcut, Notifications, User Avatar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search Pill */}
            <div className="w-full sm:w-auto flex-1 max-w-md bg-zinc-100/80 rounded-full px-4 py-2 flex items-center justify-between text-xs text-zinc-500">
              <div className="flex items-center space-x-2.5 flex-1">
                <svg className="w-4 h-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search task"
                  className="w-full bg-transparent text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                />
              </div>
              <span className="px-2 py-0.5 rounded-md bg-white text-[10px] font-bold text-zinc-400 border border-zinc-200 shadow-2xs">
                ⌘F
              </span>
            </div>

            {/* User Profile & Action Icons */}
            <div className="flex items-center space-x-3.5 shrink-0 self-end sm:self-center">
              {/* Message icon */}
              <button
                type="button"
                className="w-8 h-8 rounded-full border border-zinc-200/80 hover:bg-zinc-100 flex items-center justify-center text-zinc-600 transition-colors cursor-pointer"
                title="Messages"
              >
                <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Notification icon */}
              <button
                type="button"
                className="w-8 h-8 rounded-full border border-zinc-200/80 hover:bg-zinc-100 flex items-center justify-center text-zinc-600 transition-colors cursor-pointer relative"
                title="Notifications"
              >
                <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>

              {/* User Avatar & Name */}
              <div className="flex items-center space-x-2.5 pl-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                  alt="Totok Michael"
                  className="w-9 h-9 rounded-full object-cover border border-zinc-200"
                />
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-zinc-900 leading-tight">Totok Michael</div>
                  <div className="text-[10px] text-zinc-400">tmichael20@gmail.com</div>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Title & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight leading-none">
                Dashboard
              </h1>
              <p className="text-xs text-zinc-400 mt-1 font-normal">
                Plan, prioritize, and accomplish your tasks with ease.
              </p>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                className="py-2 px-4 rounded-full bg-[#0F382C] hover:bg-[#0A261E] text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <span>+ Add Project</span>
              </button>
              <button
                type="button"
                className="py-2 px-4 rounded-full bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200/90 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                <span>Import Data</span>
              </button>
            </div>
          </div>

          {/* ================= ROW 1: 4 STAT METRIC CARDS ================= */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">

            {/* Total Projects (Dark Green Card) */}
            <div className="rounded-2xl bg-[#0F382C] p-4 text-white flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300">Total Projects</span>
                <div className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs text-white cursor-pointer transition-colors">
                  ↗
                </div>
              </div>
              <div className="my-2.5">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">24</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] text-emerald-300 font-medium">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[9px] font-bold">
                  ↗
                </span>
                <span>Increased from last month</span>
              </div>
            </div>

            {/* Ended Projects (White Card) */}
            <div className="rounded-2xl bg-white p-4 border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-600">Ended Projects</span>
                <div className="w-6 h-6 rounded-full border border-zinc-200 hover:bg-zinc-50 flex items-center justify-center text-xs text-zinc-500 cursor-pointer transition-colors">
                  ↗
                </div>
              </div>
              <div className="my-2.5">
                <span className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">10</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] text-zinc-400 font-medium">
                <span className="w-3.5 h-3.5 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center text-[9px] font-bold">
                  ↗
                </span>
                <span>Increased from last month</span>
              </div>
            </div>

            {/* Running Projects (White Card) */}
            <div className="rounded-2xl bg-white p-4 border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-600">Running Projects</span>
                <div className="w-6 h-6 rounded-full border border-zinc-200 hover:bg-zinc-50 flex items-center justify-center text-xs text-zinc-500 cursor-pointer transition-colors">
                  ↗
                </div>
              </div>
              <div className="my-2.5">
                <span className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">12</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] text-zinc-400 font-medium">
                <span className="w-3.5 h-3.5 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center text-[9px] font-bold">
                  ↗
                </span>
                <span>Increased from last month</span>
              </div>
            </div>

            {/* Pending Project (White Card) */}
            <div className="rounded-2xl bg-white p-4 border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-600">Pending Project</span>
                <div className="w-6 h-6 rounded-full border border-zinc-200 hover:bg-zinc-50 flex items-center justify-center text-xs text-zinc-500 cursor-pointer transition-colors">
                  ↗
                </div>
              </div>
              <div className="my-2.5">
                <span className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">2</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] text-zinc-400 font-medium">
                <span>On Discuss</span>
              </div>
            </div>

          </div>

          {/* ================= ROW 2: PROJECT ANALYTICS, REMINDERS, PROJECT ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

            {/* Widget 1: Project Analytics (Pill Bar Chart) */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-zinc-900 tracking-wide">
                  Project Analytics
                </h3>
              </div>

              {/* Striped and Solid Pill Chart Bars */}
              <div className="flex items-end justify-between gap-2 h-44 px-2 pt-2">
                {/* S - Sunday (Striped) */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-full max-w-[34px] h-28 rounded-full border border-zinc-300 bg-[repeating-linear-gradient(45deg,#E4E4E7,#E4E4E7_3px,#F4F4F5_3px,#F4F4F5_6px)]" />
                  <span className="text-[11px] font-semibold text-zinc-400">S</span>
                </div>

                {/* M - Monday (Striped) */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-full max-w-[34px] h-36 rounded-full border border-zinc-300 bg-[repeating-linear-gradient(45deg,#E4E4E7,#E4E4E7_3px,#F4F4F5_3px,#F4F4F5_6px)]" />
                  <span className="text-[11px] font-semibold text-zinc-400">M</span>
                </div>

                {/* T - Tuesday (Mint Green with 54% label) */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="relative w-full max-w-[34px] h-32 rounded-full bg-[#34D399] shadow-xs flex items-center justify-center">
                    <span className="text-[9px] font-extrabold text-white">54%</span>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-400">T</span>
                </div>

                {/* W - Wednesday (Dark Forest Green - Highest) */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-full max-w-[34px] h-40 rounded-full bg-[#0F382C] shadow-xs" />
                  <span className="text-[11px] font-semibold text-zinc-400">W</span>
                </div>

                {/* T - Thursday (Striped) */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-full max-w-[34px] h-36 rounded-full border border-zinc-300 bg-[repeating-linear-gradient(45deg,#E4E4E7,#E4E4E7_3px,#F4F4F5_3px,#F4F4F5_6px)]" />
                  <span className="text-[11px] font-semibold text-zinc-400">T</span>
                </div>

                {/* F - Friday (Striped) */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-full max-w-[34px] h-30 rounded-full border border-zinc-300 bg-[repeating-linear-gradient(45deg,#E4E4E7,#E4E4E7_3px,#F4F4F5_3px,#F4F4F5_6px)]" />
                  <span className="text-[11px] font-semibold text-zinc-400">F</span>
                </div>

                {/* S - Saturday (Striped) */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-full max-w-[34px] h-24 rounded-full border border-zinc-300 bg-[repeating-linear-gradient(45deg,#E4E4E7,#E4E4E7_3px,#F4F4F5_3px,#F4F4F5_6px)]" />
                  <span className="text-[11px] font-semibold text-zinc-400">S</span>
                </div>
              </div>
            </div>

            {/* Widget 2: Reminders */}
            <div className="lg:col-span-3 bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-zinc-900 tracking-wide mb-3">
                  Reminders
                </h3>
                <h4 className="text-sm font-extrabold text-zinc-900 leading-snug">
                  Meeting with Arc Company
                </h4>
                <p className="text-[11px] text-zinc-400 font-medium mt-1">
                  Time : 02.00 pm - 04.00 pm
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0F382C] hover:bg-[#0A261E] text-white text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-xs"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Start Meeting</span>
                </button>
              </div>
            </div>

            {/* Widget 3: Project List */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-zinc-900 tracking-wide">
                  Project
                </h3>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 border border-zinc-200 rounded-lg px-2 py-0.5"
                >
                  + New
                </button>
              </div>

              <div className="space-y-2.5">
                {/* Item 1 */}
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                    ⚡
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-zinc-800 truncate">Develop API Endpoints</div>
                    <div className="text-[10px] text-zinc-400">Due date: Nov 28, 2024</div>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0">
                    👥
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-zinc-800 truncate">Onboarding Flow</div>
                    <div className="text-[10px] text-zinc-400">Due date: Nov 29, 2024</div>
                  </div>
                </div>

                {/* Item 3 */}
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-md bg-green-50 text-green-600 flex items-center justify-center text-xs font-bold shrink-0">
                    📊
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-zinc-800 truncate">Build Dashboard</div>
                    <div className="text-[10px] text-zinc-400">Due date: Dec 1, 2024</div>
                  </div>
                </div>

                {/* Item 4 */}
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-bold shrink-0">
                    ⚙️
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-zinc-800 truncate">Optimize Page Load</div>
                    <div className="text-[10px] text-zinc-400">Due date: Dec 2, 2024</div>
                  </div>
                </div>

                {/* Item 5 */}
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center text-xs font-bold shrink-0">
                    🌐
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-zinc-800 truncate">Cross-Browser Testing</div>
                    <div className="text-[10px] text-zinc-400">Due date: Dec 4, 2024</div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ================= ROW 3: TEAM COLLABORATION, PROJECT PROGRESS, TIME TRACKER ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

            {/* Widget 1: Team Collaboration */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-xs font-bold text-zinc-900 tracking-wide">
                  Team Collaboration
                </h3>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 border border-zinc-200 rounded-lg px-2 py-0.5 cursor-pointer"
                >
                  + Add Member
                </button>
              </div>

              <div className="space-y-3">
                {/* Member 1 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
                      alt="Alexandra Deff"
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-zinc-800 truncate">Alexandra Deff</div>
                      <div className="text-[10px] text-zinc-400 truncate">Working on GitHub Project Repository</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                    Completed
                  </span>
                </div>

                {/* Member 2 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                      alt="Edwin Adenike"
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-zinc-800 truncate">Edwin Adenike</div>
                      <div className="text-[10px] text-zinc-400 truncate">Working on Integrate User Authentication System</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
                    In Progress
                  </span>
                </div>

                {/* Member 3 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80"
                      alt="Isaac Oluwatemilorun"
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-zinc-800 truncate">Isaac Oluwatemilorun</div>
                      <div className="text-[10px] text-zinc-400 truncate">Working on Develop Search and Filter Functionality</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-red-600 border border-red-200 shrink-0">
                    Pending
                  </span>
                </div>

                {/* Member 4 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80"
                      alt="David Oshodi"
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-zinc-800 truncate">David Oshodi</div>
                      <div className="text-[10px] text-zinc-400 truncate">Working on Responsive Layout for Homepage</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
                    In Progress
                  </span>
                </div>
              </div>
            </div>

            {/* Widget 2: Project Progress (Donut Gauge) */}
            <div className="lg:col-span-3 bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
              <h3 className="text-xs font-bold text-zinc-900 tracking-wide mb-2">
                Project Progress
              </h3>

              {/* Gauge Semi-circle */}
              <div className="relative flex flex-col items-center justify-center my-auto py-2">
                <svg className="w-36 h-20" viewBox="0 0 160 90">
                  <path
                    d="M 20 80 A 60 60 0 0 1 140 80"
                    fill="none"
                    stroke="#E4E4E7"
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 20 80 A 60 60 0 0 1 95 24"
                    fill="none"
                    stroke="#0F382C"
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="text-center -mt-8">
                  <div className="text-2xl font-black text-zinc-900 leading-none">41%</div>
                  <div className="text-[10px] text-zinc-400 font-medium mt-1">Project Ended</div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center space-x-3 text-[10px] text-zinc-500 font-medium pt-2">
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-[#0F382C]" />
                  <span>Completed</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-[#34D399]" />
                  <span>In Progress</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-zinc-300" />
                  <span>Pending</span>
                </div>
              </div>
            </div>

            {/* Widget 3: Time Tracker */}
            <div className="lg:col-span-4 rounded-2xl bg-gradient-to-b from-[#0F382C] to-[#081F19] p-5 text-white flex flex-col justify-between relative overflow-hidden shadow-xs">
              {/* Subtle topographical wavy rings */}
              <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-emerald-400 via-transparent to-transparent" />

              <div className="relative z-10">
                <h3 className="text-xs font-semibold text-zinc-300 tracking-wide">
                  Time Tracker
                </h3>
              </div>

              {/* Big Digital Monospace Clock */}
              <div className="relative z-10 my-3 text-center">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-widest drop-shadow-sm">
                  {formatTimer(timerSeconds)}
                </span>
              </div>

              {/* Controls */}
              <div className="relative z-10 flex items-center justify-center space-x-3 pt-1">
                {/* Pause Button */}
                <button
                  type="button"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="w-10 h-10 rounded-full bg-white text-zinc-900 flex items-center justify-center hover:bg-zinc-100 transition-transform active:scale-95 shadow-sm cursor-pointer"
                  title={isTimerRunning ? "Pause" : "Resume"}
                >
                  {isTimerRunning ? (
                    <span className="text-sm font-bold">❚❚</span>
                  ) : (
                    <span className="text-sm font-bold ml-0.5">▶</span>
                  )}
                </button>

                {/* Stop / Reset Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSeconds(0);
                  }}
                  className="w-10 h-10 rounded-full bg-[#EF4444] text-white flex items-center justify-center hover:bg-[#DC2626] transition-transform active:scale-95 shadow-sm cursor-pointer"
                  title="Stop / Reset"
                >
                  <span className="w-3.5 h-3.5 rounded-sm bg-white" />
                </button>
              </div>
            </div>

          </div>

        </main>

      </div>
    </div>
  );
}
