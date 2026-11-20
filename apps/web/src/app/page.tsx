"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { VmsDashboard } from "../components/VmsDashboard";
import { CustomerProofView } from "../components/CustomerProofView";

function DashboardRouter() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

    if (tab === "customer") {
      return <CustomerProofView />;
    }

    return <VmsDashboard />;
  }

      export default function Home() {
        return (
          <Suspense
            fallback={
              <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center text-xs font-semibold text-zinc-400">
                Loading VMS Dashboard...
              </div>
            }
    >
      <DashboardRouter />
    </Suspense >
  );
}
