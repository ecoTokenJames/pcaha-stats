/**
 * Cookieless PostHog page views (James, 2026-11-26).
 *
 * Every page view goes to two PostHog projects: Level Up Hockey's (the default instance, next to
 * the ad clicks in ./levelup-posthog) and James' Sites (a second, named instance). No cookies, no
 * local storage, no screen recordings, no clicks, no identify. URLs are scrubbed before anything
 * leaves the browser. Started from src/instrumentation-client.ts.
 *
 * The visitors are minor-hockey players and parents, so only page views and page leaves are sent.
 */
import type { CaptureResult, PostHog, PostHogConfig, Properties } from "posthog-js";
import { LEVELUP_POSTHOG } from "./levelup-posthog";

/** James' Sites PostHog project (770783) token. Public and write-only (it can only send events). */
export const JAMES_SITES_POSTHOG_TOKEN = "phc_uRxLc5D4ibKwDL4EWoBgZDo5WnvcB7bskhjaDTwFjfrK";

/**
 * The projects every page view goes to. The Level Up token is the one the server-side ad clicks
 * already use. `name` is the posthog-js instance name (none = the default instance).
 */
export const POSTHOG_PROJECTS: readonly { token: string; name?: string }[] = [
  { token: LEVELUP_POSTHOG.token },
  { token: JAMES_SITES_POSTHOG_TOKEN, name: "jamesSites" },
];

/**
 * Exact hostnames PostHog may load on. Anywhere else (localhost, Vercel previews, *.vercel.app)
 * nothing loads and nothing is sent.
 */
export const POSTHOG_HOSTS: readonly string[] = ["pcahastats.com", "www.pcahastats.com"];

/** Tells this site apart from the other sites in the same projects. */
export const POSTHOG_SITE = "pcahastats";

/** The same config for both instances. */
export const POSTHOG_CONFIG = {
  api_host: "https://us.i.posthog.com",
  ui_host: "https://us.posthog.com",
  // Latest date in the installed posthog-js. Turns on capture_pageview: "history_change", so
  // client-side page changes count as page views.
  defaults: "2026-08-30",
  cookieless_mode: "always", // no cookies, no localStorage, no banner needed
  disable_session_recording: true, // no screen recordings
  disable_surveys: true,
  capture_exceptions: false,
  // Kids and parents use this site: page views and page leaves only, no clicks
  autocapture: false,
  rageclick: false,
  // No feature flags or remote config. Without this, posthog-js sends the raw first-page URL
  // (query string included) to /flags, which never goes through before_send.
  advanced_disable_flags: true,
  // Off here so a toggle in a project's settings can't switch them on for this site.
  capture_heatmaps: false,
  capture_dead_clicks: false,
  capture_performance: false,
  before_send: scrubEvent,
} satisfies Partial<PostHogConfig>;

export function shouldLoadPostHog(hostname: string): boolean {
  return POSTHOG_HOSTS.includes(hostname);
}

type PostHogLoader = () => Promise<Pick<PostHog, "init">>;

// The named export: same object as the default one, and also what Node (the tests) sees
const loadPostHogJs: PostHogLoader = async () => (await import("posthog-js")).posthog;

/**
 * posthog-js (1.455) counts client-side page changes by wrapping history.pushState/replaceState,
 * but skips the wrap when the method is already a PostHog wrapper. So the second instance would
 * miss every page change after the first one. A plain pass-through on top lets it add its own.
 */
function letNextInstanceWrapHistory() {
  const { history } = window;
  for (const method of ["pushState", "replaceState"] as const) {
    const inner = history[method];
    if (!(inner as { __posthog_wrapped__?: boolean }).__posthog_wrapped__) continue;
    history[method] = function (this: History, ...args: Parameters<History["pushState"]>) {
      return inner.apply(this, args);
    };
  }
}

/**
 * Loads and starts PostHog on the real site only. posthog-js is imported after the hostname
 * check, so anywhere else no PostHog code is fetched and nothing is sent.
 */
export async function startPostHog(
  hostname: string = window.location.hostname,
  load: PostHogLoader = loadPostHogJs,
): Promise<boolean> {
  if (!shouldLoadPostHog(hostname)) return false;
  const posthog = await load();
  for (const { token, name } of POSTHOG_PROJECTS) {
    if (name) letNextInstanceWrapHistory();
    // A fresh copy each: posthog-js writes into the config object it is given
    const instance = posthog.init(token, { ...POSTHOG_CONFIG }, name);
    instance.register({ site: POSTHOG_SITE });
  }
  return true;
}

// ---------------------------------------------------------------------------------------------
// URL scrubbing: search words (player names in /search?q=), sign-in links, codes and keys can
// sit in a URL's #hash, query string or user:pass@ part. Only these query parameters (campaign
// tags) are ever sent.

export const KEPT_QUERY_PARAMS: ReadonlySet<string> = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
  "gclid",
  "fbclid",
]);

/** Event, person and session properties that hold a page address. */
const URL_PROPERTIES = [
  "$current_url",
  "$referrer",
  "$initial_current_url",
  "$initial_referrer",
  "$prev_pageview_url",
  "$session_entry_url",
  "$session_entry_referrer",
] as const;

/** PostHog's referrer value for "no referrer". Not a URL, kept as is. */
const DIRECT = "$direct";

/** Anything written like `scheme://…` is treated as an address. */
const LOOKS_LIKE_URL = /^[a-z][a-z0-9+.-]*:\/\//i;

function parse(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function paramName(pair: string): string {
  const name = pair.split("=", 1)[0].replace(/\+/g, " ");
  try {
    return decodeURIComponent(name);
  } catch {
    return "";
  }
}

/** Removes `user:pass@` from `scheme://user:pass@host`. */
function stripUserInfo(value: string): string {
  const match = /^([a-z][a-z0-9+.-]*:\/\/)([^/?#\\]*)/i.exec(value);
  if (!match) return value;
  const at = match[2].lastIndexOf("@");
  if (at === -1) return value;
  return match[1] + match[2].slice(at + 1) + value.slice(match[0].length);
}

/**
 * Drops the #hash, any `user:pass@` and every query parameter except KEPT_QUERY_PARAMS, keeping
 * the rest of the address exactly as written. Returns null when the address can't be parsed, or
 * if anything that should have gone is somehow still there.
 */
export function scrubUrl(value: string): string | null {
  if (!parse(value)) return null;
  const hashAt = value.indexOf("#");
  const withoutHash = stripUserInfo(hashAt === -1 ? value : value.slice(0, hashAt));
  const queryAt = withoutHash.indexOf("?");
  let scrubbed = withoutHash;
  if (queryAt !== -1) {
    const kept = withoutHash
      .slice(queryAt + 1)
      .split("&")
      .filter((pair) => KEPT_QUERY_PARAMS.has(paramName(pair)));
    scrubbed = withoutHash.slice(0, queryAt) + (kept.length > 0 ? `?${kept.join("&")}` : "");
  }

  // Double-check with the browser's own parser
  const check = parse(scrubbed);
  if (!check || check.username || check.password || check.hash) return null;
  for (const key of check.searchParams.keys()) if (!KEPT_QUERY_PARAMS.has(key)) return null;
  return scrubbed;
}

/** Scrubs `obj[key]` in place: cleaned, or removed when it isn't a parseable address. */
function scrubKey(obj: Properties, key: string) {
  const value = obj[key];
  if (typeof value !== "string" || value === DIRECT) return;
  const clean = scrubUrl(value);
  if (clean === null) delete obj[key];
  else obj[key] = clean;
}

/** `$initial_person_info` is PostHog's stored first visit: `u` is the page, `r` the referrer. */
function scrubPersonInfo(info: unknown): unknown {
  if (!info || typeof info !== "object") return info;
  const copy: Properties = { ...info };
  scrubKey(copy, "u");
  scrubKey(copy, "r");
  return copy;
}

function scrubProperties(properties: Properties, everyUrl = false): Properties {
  const copy: Properties = { ...properties };
  for (const key of URL_PROPERTIES) scrubKey(copy, key);
  if (everyUrl) {
    for (const [key, value] of Object.entries(copy)) {
      if (typeof value === "string" && LOOKS_LIKE_URL.test(value)) scrubKey(copy, key);
    }
  }
  if ("$initial_person_info" in copy) copy.$initial_person_info = scrubPersonInfo(copy.$initial_person_info);
  return copy;
}

/**
 * PostHog `before_send` hook. Returns a scrubbed copy of the event and never drops it; a URL
 * property that can't be parsed is removed instead. In `$set` / `$set_once` every value that
 * looks like an address is scrubbed, whatever its name.
 */
export function scrubEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  const scrubbed: CaptureResult = { ...event };
  if (event.properties) scrubbed.properties = scrubProperties(event.properties);
  if (event.$set) scrubbed.$set = scrubProperties(event.$set, true);
  if (event.$set_once) scrubbed.$set_once = scrubProperties(event.$set_once, true);
  return scrubbed;
}
