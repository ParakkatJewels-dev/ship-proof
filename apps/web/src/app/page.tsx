"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DonezoDashboard } from "../components/DonezoDashboard";
import { CustomerProofView } from "../components/CustomerProofView";

function DashboardRouter() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  if (tab === "customer") {
    return <CustomerProofView />;
  }

  return <DonezoDashboard />;
  }

  export default function Home() {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center text-xs font-semibold text-zinc-400">
            Loading Dashboard...
          </div>
        }
      >
        <DashboardRouter />
    </Suspense >
  );
  }
