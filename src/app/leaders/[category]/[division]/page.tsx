import { notFound } from "next/navigation";
import Link from "next/link";
import { SponsorStrip } from "@/components/SponsorStrip";
import { DismissibleNote } from "@/components/DismissibleNote";
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

  // One row per player (season totals without tournaments), only what the table shows
  const leaders: LeaderPlayer[] = mergePlayerStats(leaguePlayers)
    .filter((p) => p.gamesPlayed > 0)
    .map((p) => ({
      id: p.participantId,
      name: p.name,
      number: p.number,
      position: p.position,
      teamName: p.teamName,
      gamesPlayed: p.gamesPlayed,
      goals: p.goals,
      assists: p.assists,
      points: p.points,
      pim: p.pim,
      league: teamDivisions.get(p.teamId)?.league ?? null,
      groupName: teamDivisions.get(p.teamId)?.group ?? null,
    }));

  // Leagues with game sheets (biggest first) and the tiers in each. Leagues where
  // nobody has a goal, assist or penalty (e.g. VIAHA: Spordle only shares their
  // standings) are left out rather than shown as an empty list.
  const hasStats = new Set(
    leaders.filter((p) => p.goals + p.assists + p.pim > 0).map((p) => p.league)
  );
  const leagueTeams = new Map<string, { teams: number; groups: Set<string> }>();
  for (const { league, group } of teamDivisions.values()) {
    if (!hasStats.has(league)) continue;
    const entry = leagueTeams.get(league) ?? { teams: 0, groups: new Set() };
    entry.teams++;
    if (group) entry.groups.add(group);
    leagueTeams.set(league, entry);
  }
  const leagues = [...leagueTeams]
    .sort((a, b) => b[1].teams - a[1].teams || a[0].localeCompare(b[0]))
    .map(([name, { groups }]) => ({ name, groups: sortGroups([...groups]) }));

  return (
    <div>
      <SponsorStrip page="leaders" division={divName} levelUpLead="Want to top this list?" />
      <DismissibleNote id="leaders-tournaments" className="mb-4">
        <p>
        <span className="font-semibold">Leaders count league, tiering and playoff games.</span>{" "}
        Tournament games aren&apos;t included; see{" "}
        <Link href="/tournaments" className="underline hover:text-blue-700">
          Tournaments
        </Link>{" "}
        for those. Team pages show full season totals including tournaments.
        </p>
      </DismissibleNote>
      {leagues.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No {divName} {category} games with player stats yet. Leaders will
          appear here as the season gets going.
        </div>
      ) : (
        <>
        <LeadersTable
          players={leaders.filter((p) => p.league && leagueTeams.has(p.league))}
          leagues={leagues}
        />
        </>
      )}
    </div>
  );
}
