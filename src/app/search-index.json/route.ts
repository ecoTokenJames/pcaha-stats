import {
  getDivisionsForCategory,
  getDivisionPlayers,
  getFilteredStandings,
  type HockeyCategory,
} from "@/lib/data";

// Built once per deploy (the nightly data update), served as a static file
export const dynamic = "force-static";

const CATEGORIES: HockeyCategory[] = ["rep", "house", "female"];

export interface SearchTeam {
  id: number;
  name: string;
  /** e.g. "U11 Rep" */
  label: string;
  href: string;
}

/** [name, jersey number, index into teams] (kept compact: there are ~12k) */
export type SearchPlayer = [string, number, number];

/**
 * Every team and player with a link to the team's page. A team in several
 * categories' standings is linked to the first one (rep, house, female).
 */
export function GET() {
  const teamHref = new Map<number, { href: string; label: string; name: string }>();
  for (const category of CATEGORIES) {
    for (const div of getDivisionsForCategory(category)) {
      const slug = div.name.toLowerCase();
      const label = `${div.name} ${category[0].toUpperCase()}${category.slice(1)}`;
      for (const data of Object.values(getFilteredStandings(div.name, category))) {
        for (const t of data.teams) {
          if (!teamHref.has(t.teamId)) {
            teamHref.set(t.teamId, {
              href: `/standings/${category}/${slug}/team/${t.teamId}`,
              label,
              name: t.teamName,
            });
          }
        }
      }
    }
  }

  const teams: SearchTeam[] = [...teamHref].map(([id, t]) => ({
    id,
    name: t.name,
    label: t.label,
    href: t.href,
  }));
  const teamIndex = new Map(teams.map((t, i) => [t.id, i]));

  // One entry per player per team
  const seen = new Set<string>();
  const players: SearchPlayer[] = [];
  const divisions = new Set(
    CATEGORIES.flatMap((c) => getDivisionsForCategory(c).map((d) => d.name))
  );
  for (const division of divisions) {
    for (const p of getDivisionPlayers(division)) {
      const team = teamIndex.get(p.teamId);
      const key = `${p.participantId}-${p.teamId}`;
      if (team === undefined || seen.has(key)) continue;
      seen.add(key);
      players.push([p.name, p.number, team]);
    }
  }

  return Response.json({ teams, players });
}
