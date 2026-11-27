import {
  getDivisionsForCategory,
  getFilteredStandings,
  getShortTeamNames,
  type HockeyCategory,
} from "@/lib/data";

// Built once per deploy (the nightly data update), served as a static file
export const dynamic = "force-static";

const CATEGORIES: HockeyCategory[] = ["rep", "house", "female"];

/** One team for the "Your teams" list: [id, name, short name, label, link] */
export type IndexTeam = { id: number; name: string; short?: string; label: string; href: string };

/**
 * Every team this season with a link to its page, small enough to load just to
 * show the teams someone starred. A team in several categories' standings is
 * linked to the first one (rep, house, female), like search.
 */
export function GET() {
  const teams = new Map<number, IndexTeam>();
  for (const category of CATEGORIES) {
    for (const div of getDivisionsForCategory(category)) {
      const slug = div.name.toLowerCase();
      const label = `${div.name} ${category[0].toUpperCase()}${category.slice(1)}`;
      const shortNames = getShortTeamNames(div.name);
      for (const data of Object.values(getFilteredStandings(div.name, category))) {
        for (const t of data.teams) {
          if (teams.has(t.teamId)) continue;
          teams.set(t.teamId, {
            id: t.teamId,
            name: t.teamName,
            short: shortNames.get(t.teamId),
            label,
            href: `/standings/${category}/${slug}/team/${t.teamId}`,
          });
        }
      }
    }
  }
  return Response.json({ teams: [...teams.values()] });
}
