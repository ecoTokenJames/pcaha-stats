import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getTeamInfo,
  getTeamPlayers,
  getFilteredStandings,
  getDivisionsForCategory,
  getLeagueAbbrev,
  getScheduleType,
  mergePlayerStats,
  type HockeyCategory,
  type PlayerStat,
} from "@/lib/data";
import { TeamRosterTable } from "@/components/TeamRosterTable";

const VALID_CATEGORIES: HockeyCategory[] = ["rep", "house", "female"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; division: string; teamId: string }>;
}): Promise<Metadata> {
  const { division, teamId: teamIdStr } = await params;
  const divName = division.toUpperCase();
  const teamId = parseInt(teamIdStr);
  const teamInfo = getTeamInfo(divName, teamId);

  if (!teamInfo) {
    return { title: "Team Not Found" };
  }

  const title = teamInfo.teamName;
  const description = `Player stats and roster for ${teamInfo.teamName} in the 2025-26 PCAHA ${divName} season.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | PCAHA Stats`,
      description,
    },
  };
}

export function generateStaticParams() {
  const params: { category: string; division: string; teamId: string }[] = [];
  for (const category of VALID_CATEGORIES) {
    const divisions = getDivisionsForCategory(category);
    for (const div of divisions) {
      const standings = getFilteredStandings(
        div.name,
        category as HockeyCategory
      );
      const seenTeams = new Set<number>();
      for (const data of Object.values(standings)) {
        for (const team of data.teams) {
          if (!seenTeams.has(team.teamId)) {
            seenTeams.add(team.teamId);
            params.push({
              category,
              division: div.name.toLowerCase(),
              teamId: String(team.teamId),
            });
          }
        }
      }
    }
  }
  return params;
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ category: string; division: string; teamId: string }>;
}) {
  const { category, division, teamId: teamIdStr } = await params;
  const divName = division.toUpperCase();
  const teamId = parseInt(teamIdStr);

  if (
    !VALID_CATEGORIES.includes(category as HockeyCategory) ||
    isNaN(teamId)
  ) {
    notFound();
  }

  const teamInfo = getTeamInfo(divName, teamId);
  if (!teamInfo) {
    notFound();
  }

  // Get ALL players for this team, exclude tournaments from overall stats
  const allPlayers = getTeamPlayers(divName, teamId);
  const abbrev = getLeagueAbbrev(teamInfo.scheduleName);
  const leaguePlayers = allPlayers.filter(
    (p) => getScheduleType(p.scheduleName) !== "Tournament"
  );
  const mergedPlayers = mergePlayerStats(leaguePlayers);

  // Separate tournament players and group by tournament name
  const tournamentPlayers = allPlayers.filter(
    (p) => getScheduleType(p.scheduleName) === "Tournament"
  );
  const tournamentsByName = new Map<string, PlayerStat[]>();
  for (const p of tournamentPlayers) {
    const entries = tournamentsByName.get(p.scheduleName) || [];
    entries.push(p);
    tournamentsByName.set(p.scheduleName, entries);
  }
  // Sort each tournament's players by points
  for (const [name, players] of tournamentsByName) {
    tournamentsByName.set(
      name,
      players.sort((a, b) => b.points - a.points || b.goals - a.goals)
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href={`/standings/${category}/${division}`}
        className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 hover:underline"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to {divName} Standings
      </Link>

      {/* Team Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {teamInfo.teamName}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {teamInfo.scheduleName}
            </p>
            {teamInfo.categoryName && (
              <p className="text-xs text-gray-400 mt-0.5">
                {teamInfo.categoryName}
              </p>
            )}
          </div>
          <span className="text-xs font-medium text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
            {abbrev}
          </span>
        </div>
      </div>

      {/* Player Roster — Overall Stats */}
      <TeamRosterTable players={mergedPlayers} />

      {/* Tournament Stats */}
      {tournamentsByName.size > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Tournament Stats
          </h3>
          {[...tournamentsByName.entries()].map(([tournamentName, players]) => (
            <div key={tournamentName}>
              <p className="text-sm font-medium text-gray-600 mb-2">
                {tournamentName}
              </p>
              <TeamRosterTable players={players} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
