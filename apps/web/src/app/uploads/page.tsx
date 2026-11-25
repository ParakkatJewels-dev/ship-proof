import type { Metadata } from "next";
import { UploadsPage } from "../../components/UploadsPage";

export const metadata: Metadata = {
  title: "Uploads – ShipProof",
};

export default function Page() {
  return <UploadsPage />;
}
