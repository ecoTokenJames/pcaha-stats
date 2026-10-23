import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The stats assistant's /api/chat function reads the nightly data files at request time
  outputFileTracingIncludes: {
    "/api/chat": ["./data/**/*"],
  },
  // Browsers and crawlers still request /favicon.ico; serve the SVG icon there
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon.svg" }];
  },
};

export default nextConfig;
