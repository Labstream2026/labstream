import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker minimal image (Node-only runtime, no full node_modules)
  output: "standalone",
};

export default nextConfig;
