// Tests for src/lib/posthog.ts (loading rules, config, URL scrubber). Run: npm test
import "./resolve-ts.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const {
  JAMES_SITES_POSTHOG_TOKEN,
  KEPT_QUERY_PARAMS,
  POSTHOG_CONFIG,
  POSTHOG_HOSTS,
  POSTHOG_PROJECTS,
  POSTHOG_SITE,
  scrubEvent,
  scrubUrl,
  shouldLoadPostHog,
  startPostHog,
} = await import("../src/lib/posthog.ts");
const { LEVELUP_POSTHOG } = await import("../src/lib/levelup-posthog.ts");

// startPostHog adds a pass-through to window.history before the second instance; Node has no window
globalThis.window = { history: { pushState() {}, replaceState() {} } };

/** A stand-in for posthog-js that records what it's asked to do */
function fakePostHog() {
  const calls = { load: 0, init: [], register: [] };
  const posthog = {
    init(token, config, name) {
      calls.init.push({ token, config, name });
      return { register: (props) => calls.register.push({ name, props }) };
    },
  };
  const load = async () => {
    calls.load++;
    return posthog;
  };
  return { calls, load };
}

const NOT_ALLOWED = [
  "localhost",
  "127.0.0.1",
  "[::1]",
  "pcaha-stats.vercel.app",
  "pcaha-stats-git-feat-posthog-cookieless-ecotokenjames.vercel.app",
  "preview.pcahastats.com",
  "pcahastats.com.example.com",
  "evilpcahastats.com",
  "levelup.hockey",
  "",
];

test("PostHog loads only on pcahastats.com and www.pcahastats.com", () => {
  assert.deepEqual(POSTHOG_HOSTS, ["pcahastats.com", "www.pcahastats.com"]);
  assert.equal(shouldLoadPostHog("pcahastats.com"), true);
  assert.equal(shouldLoadPostHog("www.pcahastats.com"), true);
  for (const host of NOT_ALLOWED) assert.equal(shouldLoadPostHog(host), false, host);
});

test("anywhere else (localhost, previews, other domains) posthog-js isn't even loaded", async () => {
  for (const host of NOT_ALLOWED) {
    const { calls, load } = fakePostHog();
    assert.equal(await startPostHog(host, load), false, host);
    assert.equal(calls.load, 0, host);
    assert.equal(calls.init.length, 0, host);
  }
});

test("on the real site: Level Up as the default instance, James' Sites as a named one, same cookieless config", async () => {
  for (const host of ["pcahastats.com", "www.pcahastats.com"]) {
    const { calls, load } = fakePostHog();
    assert.equal(await startPostHog(host, load), true);
    assert.equal(calls.load, 1);
    assert.deepEqual(
      calls.init.map(({ token, name }) => ({ token, name })),
      [
        { token: LEVELUP_POSTHOG.token, name: undefined },
        { token: JAMES_SITES_POSTHOG_TOKEN, name: "jamesSites" },
      ],
    );
    for (const { config } of calls.init) {
      assert.equal(config.cookieless_mode, "always");
      assert.equal(config.disable_session_recording, true);
      assert.equal(config.autocapture, false);
      assert.equal(config.rageclick, false);
      assert.equal(config.advanced_disable_flags, true);
      assert.equal(config.capture_heatmaps, false);
      assert.equal(config.capture_dead_clicks, false);
      assert.equal(config.capture_performance, false);
      assert.equal(config.disable_surveys, true);
      assert.equal(config.capture_exceptions, false);
      assert.equal(config.api_host, "https://us.i.posthog.com");
      assert.equal(config.ui_host, "https://us.posthog.com");
      assert.equal(config.before_send, scrubEvent);
      assert.deepEqual(config, POSTHOG_CONFIG);
    }
    // Each instance gets its own copy (posthog-js writes into the object it's given)
    assert.notEqual(calls.init[0].config, calls.init[1].config);
    assert.notEqual(calls.init[0].config, POSTHOG_CONFIG);
    assert.deepEqual(calls.register, [
      { name: undefined, props: { site: "pcahastats" } },
      { name: "jamesSites", props: { site: "pcahastats" } },
    ]);
  }
  assert.equal(POSTHOG_SITE, "pcahastats");
});

test("the Level Up token is the one the server-side ad clicks use, not a copy", () => {
  assert.equal(POSTHOG_PROJECTS[0].token, LEVELUP_POSTHOG.token);
  assert.equal(LEVELUP_POSTHOG.token, "phc_Dn56xkFVKAQvQFVehoqxvY5CiucGFoFD4qjRxTmY5Ge5");
  assert.equal(JAMES_SITES_POSTHOG_TOKEN, "phc_uRxLc5D4ibKwDL4EWoBgZDo5WnvcB7bskhjaDTwFjfrK");
});

test("defaults is a date the installed posthog-js knows, late enough for history_change page views", () => {
  const requireFromPostHog = createRequire(fileURLToPath(import.meta.resolve("posthog-js")));
  const { CONFIG_DEFAULTS_DATES } = requireFromPostHog("@posthog/types");
  assert.ok(CONFIG_DEFAULTS_DATES.includes(POSTHOG_CONFIG.defaults), POSTHOG_CONFIG.defaults);
  assert.equal(POSTHOG_CONFIG.defaults, [...CONFIG_DEFAULTS_DATES].sort().at(-1));
  assert.ok(POSTHOG_CONFIG.defaults >= "2025-05-24");
});

// ---------------------------------------------------------------------------------------------
// URL scrubber

const page = (properties) => ({ uuid: "u1", event: "$pageview", properties });

test("drops the #hash", () => {
  assert.equal(scrubUrl("https://www.pcahastats.com/standings#top"), "https://www.pcahastats.com/standings");
  assert.equal(scrubUrl("https://www.pcahastats.com/#"), "https://www.pcahastats.com/");
});

test("keeps only the campaign parameters", () => {
  assert.equal(
    scrubUrl("https://www.pcahastats.com/leaders?token=abc&utm_source=x"),
    "https://www.pcahastats.com/leaders?utm_source=x",
  );
  const kept = [...KEPT_QUERY_PARAMS].map((k, i) => `${k}=${i}`).join("&");
  assert.equal(scrubUrl(`https://www.pcahastats.com/?a=1&${kept}&b=2`), `https://www.pcahastats.com/?${kept}`);
  // Encoded names are read the way the browser reads them
  assert.equal(scrubUrl("https://www.pcahastats.com/?utm%5Fsource=x&to%6Ben=1"), "https://www.pcahastats.com/?utm%5Fsource=x");
});

test("search words (player names) never leave the browser", () => {
  assert.equal(scrubUrl("https://www.pcahastats.com/search?q=Sam+Smith"), "https://www.pcahastats.com/search");
  assert.equal(
    scrubUrl("https://www.pcahastats.com/search?utm_medium=social&q=Sam%20Smith"),
    "https://www.pcahastats.com/search?utm_medium=social",
  );
});

test("Supabase-style #access_token links lose the token", () => {
  const url =
    "https://www.pcahastats.com/?ref=app#access_token=eyJhbGciOi.payload.sig&expires_in=3600&refresh_token=r1&type=magiclink";
  assert.equal(scrubUrl(url), "https://www.pcahastats.com/?ref=app");
  const out = scrubEvent(page({ $current_url: url, $referrer: url }));
  assert.doesNotMatch(JSON.stringify(out), /access_token|refresh_token|eyJ/);
});

test("removes user:pass@", () => {
  assert.equal(
    scrubUrl("https://kid:secret@www.pcahastats.com/standings?invite=XYZ"),
    "https://www.pcahastats.com/standings",
  );
});

test("an unparseable URL property is removed, the event is kept", () => {
  const out = scrubEvent(page({ $current_url: "not a url ?token=abc", $referrer: "::", $pathname: "/standings" }));
  assert.equal(out.event, "$pageview");
  assert.ok(!("$current_url" in out.properties));
  assert.ok(!("$referrer" in out.properties));
  assert.equal(out.properties.$pathname, "/standings");
});

test("keeps PostHog's $direct referrer and leaves other properties alone", () => {
  const event = page({
    $current_url: "https://www.pcahastats.com/standings?token=abc",
    $referrer: "$direct",
    $initial_referrer: "$direct",
    site: "pcahastats",
    title: "Standings | PCAHA Stats",
  });
  const out = scrubEvent(event);
  assert.deepEqual(out.properties, {
    $current_url: "https://www.pcahastats.com/standings",
    $referrer: "$direct",
    $initial_referrer: "$direct",
    site: "pcahastats",
    title: "Standings | PCAHA Stats",
  });
  // The original isn't changed
  assert.equal(event.properties.$current_url, "https://www.pcahastats.com/standings?token=abc");
  assert.equal(scrubEvent(null), null);
});

test("scrubs every page-address property PostHog sends", () => {
  const dirty = "https://u:p@www.pcahastats.com/x?token=abc&utm_campaign=c#access_token=t";
  const clean = "https://www.pcahastats.com/x?utm_campaign=c";
  const keys = [
    "$current_url",
    "$referrer",
    "$initial_current_url",
    "$initial_referrer",
    "$prev_pageview_url",
    "$session_entry_url",
    "$session_entry_referrer",
  ];
  const out = scrubEvent(page(Object.fromEntries(keys.map((k) => [k, dirty]))));
  for (const k of keys) assert.equal(out.properties[k], clean, k);
});

test("scrubs u and r in $initial_person_info", () => {
  const out = scrubEvent(
    page({
      $initial_person_info: {
        u: "https://www.pcahastats.com/search?q=Sam#access_token=t",
        r: "https://www.google.com/url?q=pcaha&token=1&gclid=g",
      },
    }),
  );
  assert.deepEqual(out.properties.$initial_person_info, {
    u: "https://www.pcahastats.com/search",
    r: "https://www.google.com/url?gclid=g",
  });
});

test("scrubs any URL inside $set and $set_once", () => {
  const out = scrubEvent({
    ...page({}),
    $set: { $current_url: "https://www.pcahastats.com/?token=1", anything: "https://x.example/?key=2#h", n: 3 },
    $set_once: {
      $initial_current_url: "https://www.pcahastats.com/standings?invite=abc&utm_source=s",
      $initial_referrer: "$direct",
      $initial_person_info: { u: "https://www.pcahastats.com/#access_token=t", r: "$direct" },
    },
  });
  assert.deepEqual(out.$set, { $current_url: "https://www.pcahastats.com/", anything: "https://x.example/", n: 3 });
  assert.deepEqual(out.$set_once, {
    $initial_current_url: "https://www.pcahastats.com/standings?utm_source=s",
    $initial_referrer: "$direct",
    $initial_person_info: { u: "https://www.pcahastats.com/", r: "$direct" },
  });
});
