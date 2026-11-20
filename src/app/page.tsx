"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "../components/Navbar";
import { PackerDashboard } from "../components/PackerDashboard";
import { AdminDashboard } from "../components/AdminDashboard";
import { CustomerProofView } from "../components/CustomerProofView";
import { UserSession } from "../components/LoginModal";

  const DEFAULT_USER: UserSession = {
    name: "Jithin P.M.",
    role: "PACKER",
    id: "PKR-101",
    stationId: "STATION-01",
  };

  function DashboardContent() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab") as "packer" | "admin" | "customer" | null;
    const [selectedTab, setSelectedTab] = useState<"packer" | "admin" | "customer">("packer");
    const currentTab = tabParam || selectedTab;

    const [selectedStation, setSelectedStation] = useState("STATION-01");
    const [currentUser, setCurrentUser] = useState<UserSession | null>(DEFAULT_USER);

    const handleSignOut = () => {
      setCurrentUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("shipproof_user");
      }
    };

    return (
      <div className="min-h-screen bg-zinc-100/70 font-sans text-zinc-900 flex flex-col">
        <Navbar
          currentTab={currentTab}
          setCurrentTab={setSelectedTab}
          selectedStation={selectedStation}
          setSelectedStation={setSelectedStation}
          stationStatus="Station Online"
          currentUser={currentUser}
          onSignOut={handleSignOut}
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

  export default function Home() {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-zinc-50 flex items-center justify-center text-xs font-semibold text-zinc-400">
            Loading ShipProof...
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    );
  }
