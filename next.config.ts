import fs from "fs";
import path from "path";
import type { NextConfig } from "next";

// The season being scraped nightly. Its pages live at /seasons/<season>/... in the
// app, but are served at the plain /standings, /leaders and /tournaments URLs, so the
// site always opens on the current season. Past seasons keep their /seasons/<season> URLs.
const SEASON: string = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/meta/last-scrape.json"), "utf-8")).season ?? "";
  } catch {
    return "";
  }
})();

const SECTIONS = ["standings", "leaders", "tournaments"];

const nextConfig: NextConfig = {
  // The stats assistant's /api/chat function reads the nightly data files at request time
  outputFileTracingIncludes: {
    "/api/chat": ["./data/**/*"],
    // Past seasons' pages are built on first visit, from their packaged data
    "/seasons/**": ["./data/meta/**/*", "./data/seasons/**/*", "./scraper/hidden-players.json"],
  },
  // ...but not past seasons' pages data (the agent uses data/history)
  outputFileTracingExcludes: {
    "/api/chat": ["./data/seasons/**/*"],
  },
  async redirects() {
    // The current season only has the plain URLs
    return SEASON
      ? [
          { source: `/seasons/${SEASON}`, destination: "/standings", permanent: false },
          ...SECTIONS.map((s) => ({
            source: `/seasons/${SEASON}/${s}/:path*`,
            destination: `/${s}/:path*`,
            permanent: false,
          })),
        ]
      : [];
  },
  async rewrites() {
    return [
      // Browsers and crawlers still request /favicon.ico; serve the SVG icon there
      { source: "/favicon.ico", destination: "/icon.svg" },
      ...SECTIONS.flatMap((s) => [
        { source: `/${s}`, destination: `/seasons/${SEASON}/${s}` },
        { source: `/${s}/:path*`, destination: `/seasons/${SEASON}/${s}/:path*` },
      ]),
    ];
  },
};

export default nextConfig;
