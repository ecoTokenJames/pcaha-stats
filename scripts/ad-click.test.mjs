// Tests for src/app/api/ad-click/route.ts: Level Up ad clicks reach Level Up's PostHog from our
// server (the browser never talks to PostHog for these). PostHog itself is never called here.
// Run: npm test
import "./resolve-ts.mjs";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

const { POST } = await import("../src/app/api/ad-click/route.ts");
const { AD_CLICK_EVENT, LEVELUP_POSTHOG } = await import("../src/lib/levelup-posthog.ts");

/** Calls the route makes to the outside world */
let outgoing = [];
globalThis.fetch = async (url, init) => {
  outgoing.push({ url: String(url), init, body: JSON.parse(init.body) });
  return new Response(null, { status: 200 });
};
beforeEach(() => {
  outgoing = [];
});

const click = (body, headers = { "sec-fetch-site": "same-origin" }) =>
  POST(
    new Request("https://www.pcahastats.com/api/ad-click", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (iPhone) Safari/604.1",
        ...headers,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

test("a Level Up ad click is sent to Level Up's PostHog as pcahastats_ad_click", async () => {
  const res = await click({ sponsor: "levelup", placement: "footer", from: "/standings/rep/u13" });
  assert.equal(res.status, 204);
  assert.equal(outgoing.length, 1);
  const [{ url, init, body }] = outgoing;
  assert.equal(url, "https://us.i.posthog.com/i/v0/e/");
  assert.equal(init.method, "POST");
  assert.equal(body.api_key, LEVELUP_POSTHOG.token);
  assert.equal(body.api_key, "phc_Dn56xkFVKAQvQFVehoqxvY5CiucGFoFD4qjRxTmY5Ge5");
  assert.equal(body.event, AD_CLICK_EVENT);
  assert.equal(body.event, "pcahastats_ad_click");
  assert.match(body.distinct_id, /^pcahastats-[0-9a-f-]{36}$/);
  assert.deepEqual(
    {
      $process_person_profile: body.properties.$process_person_profile,
      $geoip_disable: body.properties.$geoip_disable,
      source_site: body.properties.source_site,
      sponsor: body.properties.sponsor,
      placement: body.properties.placement,
      from_path: body.properties.from_path,
      destination: body.properties.destination,
      utm_source: body.properties.utm_source,
      utm_content: body.properties.utm_content,
    },
    {
      $process_person_profile: false,
      $geoip_disable: true,
      source_site: "pcahastats.com",
      sponsor: "levelup",
      placement: "footer",
      from_path: "/standings/rep/u13",
      destination: "https://levelup.hockey/mobile",
      utm_source: "pcahastats",
      utm_content: "footer",
    },
  );
});

test("store and coach ads count too; Falcons clicks are not sent to Level Up", async () => {
  assert.equal((await click({ sponsor: "levelup-store", placement: "home" })).status, 204);
  assert.equal((await click({ sponsor: "levelup-coach", placement: "team-page-coach" })).status, 204);
  assert.deepEqual(
    outgoing.map((o) => o.body.properties.sponsor),
    ["levelup-store", "levelup-coach"],
  );
  outgoing = [];
  assert.equal((await click({ sponsor: "falcons", placement: "home" })).status, 204);
  assert.equal(outgoing.length, 0);
});

test("only our own pages, real ads and well-formed requests", async () => {
  assert.equal((await click({ sponsor: "levelup", placement: "footer" }, { "sec-fetch-site": "cross-site" })).status, 403);
  assert.equal((await click({ sponsor: "levelup", placement: "nowhere" })).status, 400);
  assert.equal((await click({ sponsor: "someone-else", placement: "footer" })).status, 400);
  assert.equal((await click("not json")).status, 400);
  assert.equal(outgoing.length, 0);
  // A "from" that isn't a plain path is dropped
  await click({ sponsor: "levelup", placement: "footer", from: "/search?q=Sam" });
  assert.equal(outgoing[0].body.properties.from_path, null);
});

test("a PostHog outage never breaks the click", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network down");
  };
  try {
    assert.equal((await click({ sponsor: "levelup", placement: "footer" })).status, 204);
  } finally {
    globalThis.fetch = realFetch;
  }
});
