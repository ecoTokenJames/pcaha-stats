import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browsers and crawlers still request /favicon.ico; serve the SVG icon there
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon.svg" }];
  },
};

export default nextConfig;
