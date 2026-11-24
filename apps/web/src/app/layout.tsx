import type { Metadata } from "next";
import "./globals.css";
import { AuthGate } from "../components/AuthGate";

export const metadata: Metadata = {
  title: "ShipProof – Order Packing Video Verification System",
  description: "Video-based order packing verification system integrated with Shopify and Supabase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased font-sans">
      <body className="min-h-full flex flex-col font-sans">
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
