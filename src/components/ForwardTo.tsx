"use client";

import { useEffect } from "react";

/**
 * Reports the click to Level Up's PostHog (through our own /api/ad-click, so no
 * PostHog script or cookies here), then sends the visitor on after a short pause,
 * long enough for Vercel Web Analytics to record this page view too.
 */
export function ForwardTo({
  url,
  sponsor,
  placement,
}: {
  url: string;
  sponsor: string;
  placement: string;
}) {
  useEffect(() => {
    let from: string | null = null;
    try {
      const ref = new URL(document.referrer);
      if (ref.origin === window.location.origin) from = ref.pathname;
    } catch {
      // no referrer
    }
    const body = JSON.stringify({ sponsor, placement, from });
    try {
      const sent = navigator.sendBeacon?.("/api/ad-click", new Blob([body], { type: "application/json" }));
      if (!sent) {
        void fetch("/api/ad-click", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // analytics must never block the visitor
    }
    const timer = setTimeout(() => window.location.replace(url), 400);
    return () => clearTimeout(timer);
  }, [url, sponsor, placement]);
  return null;
}
