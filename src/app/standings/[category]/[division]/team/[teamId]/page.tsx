import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getTeamInfo,
  getTeamPlayers,
  getFilteredStandings,
  getDivisionsForCategory,
  getLeagueAbbrev,
  getTeamGamesByType,
  mergePlayerStats,
  type HockeyCategory,
  SEASON,
} from "@/lib/data";
import { TeamRosterTable } from "@/components/TeamRosterTable";

const VALID_CATEGORIES: HockeyCategory[] = ["rep", "house", "female"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; division: string; teamId: string }>;
}): Promise<Metadata> {
  const { category, division, teamId: teamIdStr } = await params;
  const divName = division.toUpperCase();
  const teamId = parseInt(teamIdStr);
  const teamInfo = getTeamInfo(divName, teamId);

  if (!teamInfo) {
    return { title: "Team Not Found" };
  }

  const title = teamInfo.teamName;
  const description = `Player stats and roster for ${teamInfo.teamName} in the ${SEASON} PCAHA ${divName} season.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/standings/${category}/${division}/team/${teamId}`,
    },
    openGraph: {
      title: `${title} | PCAHA Stats`,
      description,
      images: ["/opengraph-image"],
    },
  };
}

export const dynamicParams = false;

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

  // Season totals: every game the team played — league, tiering, playoffs, tournaments
  const allPlayers = getTeamPlayers(divName, teamId);
  const abbrev = getLeagueAbbrev(teamInfo.scheduleName);
  const mergedPlayers = mergePlayerStats(allPlayers);
  const gamesByType = getTeamGamesByType(divName, teamId);
  const totalGames = Object.values(gamesByType).reduce((a, b) => a + b, 0);
  const breakdown = (
    [
      ["League", "league"],
      ["Placement", "tiering"],
      ["Playoffs", "playoff"],
      ["Tournament", "tournament"],
    ] as const
  )
    .filter(([type]) => gamesByType[type] > 0)
    .map(([type, label]) => `${gamesByType[type]} ${label}`)
    .join(", ");

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

      {/* What the totals include */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p>
          <span className="font-semibold">Season totals.</span> Player stats
          add up every game this team has played in {SEASON}: league,
          tiering, playoffs and tournaments.
          {totalGames > 0 && (
            <>
              {" "}
              That&apos;s {totalGames} game{totalGames === 1 ? "" : "s"} so far
              ({breakdown}).
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-blue-800/80">
          GP is the team&apos;s games played. Spordle doesn&apos;t publish who
          dressed for each game, so a player who missed games still shows the
          team total. Goals, assists and PIM are exact.
        </p>
      </div>

      {/* Player Roster — season totals across all schedules */}
      <TeamRosterTable players={mergedPlayers} />
    </div>
  );
}
