import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the dev-only Next.js badge away from the sidebar's sign-out button.
  devIndicators: {
    position: "bottom-right",
  },
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
