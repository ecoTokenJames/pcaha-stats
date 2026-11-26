// Runs the real posthog-js in a simulated browser (happy-dom) and checks what actually leaves it:
// nothing off pcahastats.com; on it, page views and page leaves reach BOTH projects, URLs are
// scrubbed, and no cookie or storage is ever written. Network calls are caught, nothing is sent.
// Run: npm test
import "./resolve-ts.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { Window } from "happy-dom";

const { JAMES_SITES_POSTHOG_TOKEN, startPostHog } = await import("../src/lib/posthog.ts");
const { LEVELUP_POSTHOG } = await import("../src/lib/levelup-posthog.ts");

const TOKENS = { [LEVELUP_POSTHOG.token]: "Level Up", [JAMES_SITES_POSTHOG_TOKEN]: "James' Sites" };

// --- A browser for posthog-js to run in. Set up before posthog-js is first imported. ----------
const win = new Window({
  url: "http://localhost:3000/",
  // A normal browser, not a test robot (posthog-js drops events from webdriver browsers)
  settings: {
    navigator: {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1",
    },
  },
});
Object.defineProperty(win.navigator, "webdriver", { value: false, configurable: true });
const NodeResponse = globalThis.Response;
/** Every request posthog-js makes: { url, body (decoded text) } */
const sent = [];

/** Request body as text: posthog-js gzips event sends (fetch: ArrayBuffer, beacon: Blob) */
async function decode(body) {
  if (typeof body === "string") return body;
  const bytes = Buffer.from(typeof body?.arrayBuffer === "function" ? await body.arrayBuffer() : body);
  return bytes[0] === 0x1f && bytes[1] === 0x8b ? zlib.gunzipSync(bytes).toString() : bytes.toString();
}
const pending = [];
const record = (url, body) => pending.push(decode(body).then((text) => sent.push({ url: String(url), text })));

const fakeFetch = async (url, init = {}) => {
  record(url, init.body);
  return new NodeResponse('{"status":"Ok"}', { status: 200, headers: { "content-type": "application/json" } });
};
win.fetch = fakeFetch;
win.navigator.sendBeacon = (url, body) => {
  record(url, body);
  return true;
};
for (const [key, value] of Object.entries({
  window: win,
  self: win,
  document: win.document,
  location: win.location,
  navigator: win.navigator,
  history: win.history,
  localStorage: win.localStorage,
  sessionStorage: win.sessionStorage,
  fetch: fakeFetch,
})) {
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}

/** The events in one request body (one event, or a batch), with the token each was sent with */
function eventsIn(text) {
  const data = JSON.parse(text);
  return (Array.isArray(data) ? data : (data.batch ?? [data])).map((e) => ({ ...e, token: e.properties?.token }));
}

/** Every event sent so far */
async function events() {
  await Promise.all(pending);
  return sent.flatMap(({ text }) => eventsIn(text));
}

async function waitFor(check, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (check(await events())) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  assert.fail(`timed out; events so far: ${JSON.stringify((await events()).map((e) => [TOKENS[e.token], e.event]))}`);
}

function assertNoStorage() {
  assert.equal(win.document.cookie, "", "no cookies");
  assert.equal(win.localStorage.length, 0, `no localStorage: ${Object.keys(win.localStorage)}`);
  assert.equal(win.sessionStorage.length, 0, `no sessionStorage: ${Object.keys(win.sessionStorage)}`);
}

// ---------------------------------------------------------------------------------------------

test("localhost and Vercel previews: nothing loads, nothing is sent, nothing is stored", async () => {
  for (const url of [
    "http://localhost:3000/standings",
    "http://127.0.0.1:3000/",
    "https://pcaha-stats.vercel.app/",
    "https://pcaha-stats-git-feat-posthog-cookieless-ecotokenjames.vercel.app/standings",
  ]) {
    win.happyDOM.setURL(url);
    assert.equal(await startPostHog(), false, url);
  }
  await new Promise((r) => setTimeout(r, 200));
  assert.deepEqual(sent, []);
  assertNoStorage();
});

test("www.pcahastats.com: both projects get every page view and the page leave, scrubbed, with no cookies or storage", async () => {
  win.happyDOM.setURL(
    "https://www.pcahastats.com/standings?token=abc&utm_source=newsletter#access_token=secret-from-a-link",
  );
  win.document.title = "Standings | PCAHA Stats";
  assert.equal(await startPostHog(), true);

  // The first page view goes out straight away, from each instance
  const pageviews = (list, token) => list.filter((e) => e.token === token && e.event === "$pageview");
  await waitFor((list) => Object.keys(TOKENS).every((t) => pageviews(list, t).length === 1));
  assertNoStorage();

  // Client-side page changes (Next.js uses history.pushState), including a search for a player
  win.history.pushState({}, "", "/search?q=Sam+Smith#results");
  await new Promise((r) => setTimeout(r, 20));
  win.history.pushState({}, "", "/leaders/points?utm_campaign=fall");
  await new Promise((r) => setTimeout(r, 20));
  // Same page, new state only: not a new page view
  win.history.replaceState({ scroll: 1 }, "", "/leaders/points?utm_campaign=fall");
  await new Promise((r) => setTimeout(r, 20));

  // Leaving the page sends the rest (beacon) with a $pageleave
  win.dispatchEvent(new win.Event("pagehide"));
  await waitFor((list) => Object.keys(TOKENS).every((t) => list.some((e) => e.token === t && e.event === "$pageleave")));
  await new Promise((r) => setTimeout(r, 100));

  const all = await events();
  for (const [token, project] of Object.entries(TOKENS)) {
    const mine = all.filter((e) => e.token === token);
    assert.deepEqual(
      mine.map((e) => [e.event, e.properties.$current_url]),
      [
        ["$pageview", "https://www.pcahastats.com/standings?utm_source=newsletter"],
        ["$pageview", "https://www.pcahastats.com/search"],
        ["$pageview", "https://www.pcahastats.com/leaders/points?utm_campaign=fall"],
        ["$pageleave", "https://www.pcahastats.com/leaders/points?utm_campaign=fall"],
      ],
      project,
    );
    for (const e of mine) {
      assert.equal(e.properties.site, "pcahastats", project);
      assert.equal(e.properties.$cookieless_mode, true, project);
      assert.equal(e.properties.$process_person_profile, false, project);
    }
    assert.equal(mine[1].properties.$prev_pageview_pathname, "/standings", project);
  }
  // Only these two projects, nothing else
  assert.deepEqual(new Set(all.map((e) => e.token)), new Set(Object.keys(TOKENS)));

  // Every request: an event send to PostHog US for one project (no /flags, config or scripts)
  for (const { url, text } of sent) {
    const u = new URL(url);
    assert.equal(u.origin, "https://us.i.posthog.com", url);
    assert.equal(u.pathname, "/e/", url);
    const tokens = new Set(eventsIn(text).map((e) => e.token));
    assert.equal(tokens.size, 1, `one project per request: ${url}`);
    // Nothing from the address bar's private parts, in any field
    assert.doesNotMatch(text, /access_token|secret-from-a-link|token=abc|Sam|Smith|results/, url);
  }
  assertNoStorage();
});
