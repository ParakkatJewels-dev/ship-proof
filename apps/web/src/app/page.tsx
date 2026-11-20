"use client";

import React, { useState } from "react";
import { Navbar } from "../components/Navbar";
import { PackerDashboard } from "../components/PackerDashboard";
import { AdminDashboard } from "../components/AdminDashboard";
import { CustomerProofView } from "../components/CustomerProofView";

export default function Home() {
  const [currentTab, setCurrentTab] = useState<"packer" | "admin" | "customer">("packer");
  const [selectedStation, setSelectedStation] = useState("STATION-01");

  return (
    <div className="min-h-screen bg-zinc-100/70 font-sans text-zinc-900 flex flex-col">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        selectedStation={selectedStation}
        setSelectedStation={setSelectedStation}
        stationStatus="Station Online"
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {currentTab === "packer" && <PackerDashboard selectedStation={selectedStation} />}
        {currentTab === "admin" && <AdminDashboard />}
        {currentTab === "customer" && <CustomerProofView />}
      </main>

      <footer className="border-t border-zinc-200 bg-white py-4 text-center text-xs text-zinc-500">
        ShipProof Order Packing Video Verification System • Integrated with Shopify & Supabase
      </footer>
    </div>
  );
}
