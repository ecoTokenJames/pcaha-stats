import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getFilteredPlayers,
  getDivisionsForCategory,
  getScheduleType,
  getTeamDivisions,
  sortGroups,
  mergePlayerStats,
  type HockeyCategory,
  SEASON,
} from "@/lib/data";
import { LeadersTable, type LeaderPlayer } from "@/components/LeadersTable";

const VALID_CATEGORIES: HockeyCategory[] = ["rep", "house", "female"];

const CATEGORY_LABELS: Record<string, string> = {
  rep: "Rep",
  house: "House",
  female: "Female",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; division: string }>;
}): Promise<Metadata> {
  const { category, division } = await params;
  const divName = division.toUpperCase();
  const catLabel = CATEGORY_LABELS[category] || category;
  const title = `${divName} ${catLabel} Scoring Leaders`;
  const description = `Top scorers and scoring leaders for ${divName} ${catLabel} hockey in the ${SEASON} PCAHA season. View points, goals, assists, and penalty minutes.`;

  return {
    title,
    description,
    alternates: { canonical: `/leaders/${category}/${division}` },
    openGraph: {
      title: `${title} | PCAHA Stats`,
      description,
      images: ["/opengraph-image"],
    },
  };
}

// Only the category/division combos that have data; anything else 404s
export const dynamicParams = false;

export function generateStaticParams() {
  const params: { category: string; division: string }[] = [];
  for (const category of VALID_CATEGORIES) {
    const divisions = getDivisionsForCategory(category);
    for (const div of divisions) {
      params.push({ category, division: div.name.toLowerCase() });
    }
  }
  return params;
}

export default async function LeadersDivisionPage({
  params,
}: {
  params: Promise<{ category: string; division: string }>;
}) {
  const { category, division } = await params;
  const divName = division.toUpperCase();

  if (!VALID_CATEGORIES.includes(category as HockeyCategory)) {
    notFound();
  }

  // Get all players, exclude tournaments (tournaments have their own section)
  const players = getFilteredPlayers(divName, category as HockeyCategory);
  const leaguePlayers = players.filter(
    (p) => getScheduleType(p) !== "Tournament"
  );

  // Each team's league and current tier, so leaders are split by division
  const teamDivisions = getTeamDivisions(divName, category as HockeyCategory);

  // 3 GP minimum is applied after merging, in LeadersTable
  const qualifiedPlayers: LeaderPlayer[] = leaguePlayers.map((p) => ({
    ...p,
    league: teamDivisions.get(p.teamId)?.league ?? null,
    groupName: teamDivisions.get(p.teamId)?.group ?? null,
  }));

  // Leagues (biggest first) and the tiers in each
  const leagueTeams = new Map<string, { teams: number; groups: Set<string> }>();
  for (const { league, group } of teamDivisions.values()) {
    const entry = leagueTeams.get(league) ?? { teams: 0, groups: new Set() };
    entry.teams++;
    if (group) entry.groups.add(group);
    leagueTeams.set(league, entry);
  }
  const leagues = [...leagueTeams]
    .sort((a, b) => b[1].teams - a[1].teams || a[0].localeCompare(b[0]))
    .map(([name, { groups }]) => ({ name, groups: sortGroups([...groups]) }));

  if (!mergePlayerStats(leaguePlayers).some((p) => p.gamesPlayed >= 3)) {
    return (
      <div className="text-center py-12 text-gray-500">
        No {divName} {category} players have 3+ games yet — leaders will
        appear here as the season gets going.
      </div>
    );
  }

  return <LeadersTable players={qualifiedPlayers} leagues={leagues} />;
}
