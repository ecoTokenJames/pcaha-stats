import { randomUUID } from "node:crypto";
import { SPONSORS, type Sponsor } from "@/lib/sponsor-links";
import { AD_CLICK_EVENT, LEVELUP_POSTHOG, LEVELUP_SPONSORS } from "@/lib/levelup-posthog";

export const runtime = "nodejs";

/**
 * One Level Up ad click, sent to Level Up's PostHog from our server: the visitor's
 * browser never loads PostHog (no script, no cookies, not blocked by ad blockers),
 * and no IP or person profile is sent (only the browser type, for bot filtering). Called by the /go/<sponsor>/<placement>
 * page just before it forwards the visitor.
 */
export async function POST(req: Request) {
  // Only our own /go pages may report clicks
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return new Response(null, { status: 403 });

  let body: { sponsor?: string; placement?: string; from?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const sponsor = String(body.sponsor ?? "");
  const placement = String(body.placement ?? "");
  const s = SPONSORS[sponsor as Sponsor];
  if (!s || !(s.placements as readonly string[]).includes(placement)) {
    return new Response(null, { status: 400 });
  }
  if (!LEVELUP_SPONSORS.has(sponsor)) return new Response(null, { status: 204 });

  // The pcahastats page the click came from, path only (e.g. /standings/rep/u13)
  const from = typeof body.from === "string" && /^\/[\w\-/]*$/.test(body.from) ? body.from.slice(0, 120) : null;
  const destination = s.url(placement);
  const utm = Object.fromEntries(new URL(destination).searchParams);

  try {
    await fetch(`${LEVELUP_POSTHOG.host}/i/v0/e/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: LEVELUP_POSTHOG.token,
        event: AD_CLICK_EVENT,
        // A fresh id per click: anonymous, nothing ties clicks to a person
        distinct_id: `pcahastats-${randomUUID()}`,
        timestamp: new Date().toISOString(),
        properties: {
          $process_person_profile: false,
          // The request comes from our server, so its location would be wrong
          $geoip_disable: true,
          // The visitor's browser type, so PostHog tells people from bots (the
          // request itself comes from our server, which it would count as automation)
          $raw_user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300) || undefined,
          source_site: "pcahastats.com",
          sponsor,
          placement,
          from_path: from,
          destination: destination.split("?")[0],
          ...utm,
          environment: process.env.VERCEL_ENV ?? "development",
        },
      }),
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // Never let analytics get in the way of the visitor
  }
  return new Response(null, { status: 204 });
}
