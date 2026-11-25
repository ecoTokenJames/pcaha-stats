/**
 * Level Up Hockey's PostHog project (the same one the Level Up app reports to),
 * so ad clicks from pcahastats sit next to app installs and sign-ups.
 * The project token only allows sending events, and the Level Up app already
 * ships it publicly, so it isn't a secret.
 */
export const LEVELUP_POSTHOG = {
  host: "https://us.i.posthog.com",
  token: "phc_Dn56xkFVKAQvQFVehoqxvY5CiucGFoFD4qjRxTmY5Ge5",
} as const;

/** Sponsors whose clicks go to Level Up's PostHog (Falcons clicks are not Level Up's data). */
export const LEVELUP_SPONSORS = new Set(["levelup", "levelup-coach", "levelup-store"]);

export const AD_CLICK_EVENT = "pcahastats_ad_click";
