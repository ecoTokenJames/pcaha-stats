"use client";

import { useEffect } from "react";

/**
 * Sends the visitor on after a short pause, long enough for Vercel Web Analytics
 * to record this page view (that's how sponsor clicks get counted).
 */
export function ForwardTo({ url }: { url: string }) {
  useEffect(() => {
    const timer = setTimeout(() => window.location.replace(url), 400);
    return () => clearTimeout(timer);
  }, [url]);
  return null;
}
