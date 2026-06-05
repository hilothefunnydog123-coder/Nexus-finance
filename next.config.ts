import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't advertise the framework, and don't ship readable source maps to the browser.
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
};

export default nextConfig;
