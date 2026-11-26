// Runs in the browser before the page becomes interactive (Next.js instrumentation-client).
// Cookieless PostHog page views, sent to Level Up's and James' Sites' PostHog projects, only on
// pcahastats.com / www.pcahastats.com (see src/lib/posthog.ts). Analytics must never break the page.
import { startPostHog } from "@/lib/posthog";

try {
  startPostHog().catch(() => {});
} catch {
  // ignore
}
