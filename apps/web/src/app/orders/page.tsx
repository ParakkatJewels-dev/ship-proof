import { Suspense } from "react";
import type { Metadata } from "next";
import { OrdersPage } from "../../components/OrdersPage";

export const metadata: Metadata = {
  title: "Orders – ShipProof",
};

// OrdersPage reads ?status= with useSearchParams, which needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center text-xs font-semibold text-muted">
          Loading orders…
        </div>
      }
    >
      <OrdersPage />
    </Suspense>
  );
}
