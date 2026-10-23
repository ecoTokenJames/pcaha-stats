/**
 * Sponsor ad links go through /go/<sponsor>/<placement> on our own site, which
 * counts as a page view in Vercel Web Analytics (our only free click counter)
 * and then forwards to the sponsor. Destinations are fixed here, so /go can
 * never be used to redirect anywhere else.
 */

const UTM = "utm_source=pcahastats&utm_medium=sponsor&utm_campaign=pcaha-stats";

export const SPONSORS = {
  levelup: {
    label: "Level Up Hockey",
    url: (placement: string) => `https://levelup.hockey/mobile?${UTM}&utm_content=${placement}`,
    placements: [
      "home",
      "team-page",
      "leaders",
      "footer",
      "top-home",
      "top-standings",
      "top-leaders",
      "top-team",
      "standings-card",
      "leaders-row",
    ],
  },
  "levelup-coach": {
    label: "Level Up Hockey",
    url: (placement: string) =>
      `https://levelup.hockey/coach/signup?${UTM}&utm_content=${placement}`,
    placements: ["team-page-coach"],
  },
  falcons: {
    label: "BC Falcons Hockey",
    url: (placement: string) =>
      `https://www.bcfalcons.com/register?${UTM}&utm_content=${placement}`,
    placements: ["home", "standings", "top-home", "top-standings", "top-leaders", "top-team"],
  },
} as const;

export type Sponsor = keyof typeof SPONSORS;

/** The tracked link to put in an ad: /go/<sponsor>/<placement>. */
export function sponsorHref(sponsor: Sponsor, placement: string): string {
  return `/go/${sponsor}/${placement}`;
}
