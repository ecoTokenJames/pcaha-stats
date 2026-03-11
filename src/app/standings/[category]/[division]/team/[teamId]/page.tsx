import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getTeamInfo,
  getTeamPlayers,
  getFilteredStandings,
  getDivisionsForCategory,
  getLeagueAbbrev,
  type HockeyCategory,
} from "@/lib/data";

const VALID_CATEGORIES: HockeyCategory[] = ["rep", "house", "female"];

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

  const players = getTeamPlayers(divName, teamId);
  const abbrev = getLeagueAbbrev(teamInfo.scheduleName);

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

      {/* Player Roster */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h4 className="font-semibold text-gray-900 text-sm">
            Player Stats
            <span className="text-xs font-normal text-gray-400 ml-2">
              ({players.length} players)
            </span>
          </h4>
        </div>

        {players.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No player stats recorded for this team yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                    #
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[160px]">
                    Player
                  </th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                    GP
                  </th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                    G
                  </th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                    A
                  </th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                    PTS
                  </th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                    PIM
                  </th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                    PPG
                  </th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                    SHG
                  </th>
                </tr>
              </thead>
              <tbody>
                {players.map((player, i) => (
                  <tr
                    key={`${player.participantId}-${i}`}
                    className={`border-b border-gray-50 hover:bg-blue-50/50 transition-colors ${
                      i % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                    }`}
                  >
                    <td className="px-2 py-2 text-center text-gray-400">
                      {player.number > 0 ? player.number : "-"}
                    </td>
                    <td className="px-2 py-2 text-left whitespace-nowrap">
                      <span className="font-medium text-gray-900">
                        {player.name}
                      </span>
                      {player.isAffiliate && (
                        <span className="text-xs text-orange-500 ml-1" title="Affiliate Player">
                          AP
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {player.gamesPlayed}
                    </td>
                    <td className="px-2 py-2 text-center font-medium text-green-700">
                      {player.goals}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {player.assists}
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-blue-900">
                      {player.points}
                    </td>
                    <td className="px-2 py-2 text-center">{player.pim}</td>
                    <td className="px-2 py-2 text-center text-gray-500">
                      {player.ppGoals}
                    </td>
                    <td className="px-2 py-2 text-center text-gray-500">
                      {player.shGoals}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
