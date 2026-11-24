import type { Metadata } from "next";
import { PackingPage } from "../../components/PackingPage";

export const metadata: Metadata = {
  title: "Packing – ShipProof",
};

export default function Page() {
  return <PackingPage />;
}
