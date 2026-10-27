"use client";

import { useMemo } from "react";
import type { GameView, PlayerStat, TeamStanding } from "@/lib/data";
import { GamesList } from "./GamesList";
import { TeamName } from "./TeamName";

/** Just the player fields this page shows */
export type TournamentPlayer = Pick<
  PlayerStat,
  | "participantId"
  | "teamId"
  | "name"
  | "number"
  | "position"
  | "gamesPlayed"
  | "goals"
  | "assists"
  | "points"
  | "pim"
>;

export interface TournamentData {
  scheduleId: number;
  scheduleName: string;
  divisionName: string;
  categoryName: string;
  teams: TeamStanding[];
  players: TournamentPlayer[];
}

/** One tournament: standings, games and player stats by team. */
export function TournamentDetail({
  tournament,
  games,
}: {
  tournament: TournamentData;
  games: GameView[];
}) {
  // Group players by team, best scorers first
  const teamPlayers = useMemo(() => {
    const grouped = new Map<number, TournamentPlayer[]>();
    for (const p of tournament.players) {
      const list = grouped.get(p.teamId) || [];
      list.push(p);
      grouped.set(p.teamId, list);
    }
    for (const players of grouped.values()) {
      players.sort((a, b) => b.points - a.points || b.goals - a.goals);
    }
    return grouped;
  }, [tournament]);

  return (
    <div className="space-y-6">
      {/* Tournament Standings */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-3 sm:px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">
            Standings
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 break-words">
            {tournament.scheduleName}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-1 sm:px-2 py-2 text-center font-medium text-gray-500 w-5 sm:w-8">
                  #
                </th>
                <th className="px-1 sm:px-2 py-2 text-left font-medium text-gray-500">
                  Team
                </th>
                <th className="px-0.5 sm:px-2 py-2 text-center font-medium text-gray-500 w-6 sm:w-10">
                  GP
                </th>
                <th className="px-0.5 sm:px-2 py-2 text-center font-medium text-gray-500 w-5 sm:w-10">
                  W
                </th>
                <th className="px-0.5 sm:px-2 py-2 text-center font-medium text-gray-500 w-5 sm:w-10">
                  L
                </th>
                <th className="px-0.5 sm:px-2 py-2 text-center font-medium text-gray-500 w-5 sm:w-10">
                  T
                </th>
                <th className="px-0.5 sm:px-2 py-2 text-center font-medium text-gray-500 w-6 sm:w-10">
                  PTS
                </th>
                <th className="px-0.5 sm:px-2 py-2 text-center font-medium text-gray-500 w-6 sm:w-10">
                  GF
                </th>
                <th className="px-0.5 sm:px-2 py-2 text-center font-medium text-gray-500 w-6 sm:w-10">
                  GA
                </th>
              </tr>
            </thead>
            <tbody>
              {tournament.teams.map((team, i) => (
                <tr
                  key={team.teamId}
                  className={`border-b border-gray-50 ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                  }`}
                >
                  <td className="px-1 sm:px-2 py-1.5 sm:py-2 text-center text-gray-500 font-medium">
                    {i + 1}
                  </td>
                  <td className="px-1 sm:px-2 py-1.5 sm:py-2 text-left font-medium text-gray-900 text-xs">
                    <TeamName name={team.teamName} short={team.shortName} />
                  </td>
                  <td className="px-0.5 sm:px-2 py-1.5 sm:py-2 text-center">
                    {team.gamesPlayed}
                  </td>
                  <td className="px-0.5 sm:px-2 py-1.5 sm:py-2 text-center text-green-700 font-medium">
                    {team.wins}
                  </td>
                  <td className="px-0.5 sm:px-2 py-1.5 sm:py-2 text-center text-red-600 font-medium">
                    {team.losses}
                  </td>
                  <td className="px-0.5 sm:px-2 py-1.5 sm:py-2 text-center">
                    {team.ties}
                  </td>
                  <td className="px-0.5 sm:px-2 py-1.5 sm:py-2 text-center font-bold text-blue-900">
                    {team.points}
                  </td>
                  <td className="px-0.5 sm:px-2 py-1.5 sm:py-2 text-center">
                    {team.goalsFor}
                  </td>
                  <td className="px-0.5 sm:px-2 py-1.5 sm:py-2 text-center">
                    {team.goalsAgainst}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Games */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-3 sm:px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Games</h3>
        </div>
        <GamesList games={games} emptyText="No games for this tournament yet." />
      </div>

      {/* Player Stats by Team */}
      <h3 className="text-lg font-semibold text-gray-900">
        Player Stats by Team
      </h3>
      {tournament.teams.map((team) => {
        const players = teamPlayers.get(team.teamId);
        if (!players || players.length === 0) return null;
        return (
          <div
            key={team.teamId}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            <div className="px-3 sm:px-4 py-3 border-b border-gray-100">
              <h4 className="font-semibold text-gray-900 text-sm break-words">
                {team.teamName}
              </h4>
              <p className="text-xs text-gray-500">
                {players.length} players
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-1 sm:px-2 py-2 text-center font-medium text-gray-500 w-6 sm:w-8">
                      #
                    </th>
                    <th className="px-1 sm:px-2 py-2 text-left font-medium text-gray-500">
                      Player
                    </th>
                    <th className="px-0.5 sm:px-2 py-2 text-center font-medium text-gray-500 w-6 sm:w-10">
                      GP
                    </th>
                    <th className="px-0.5 sm:px-2 py-2 text-center font-medium text-gray-500 w-5 sm:w-10">
                      G
                    </th>
                    <th className="px-0.5 sm:px-2 py-2 text-center font-medium text-gray-500 w-5 sm:w-10">
                      A
                    </th>
                    <th className="px-0.5 sm:px-2 py-2 text-center font-medium text-gray-500 w-6 sm:w-10">
                      PTS
                    </th>
                    <th className="px-0.5 sm:px-2 py-2 text-center font-medium text-gray-500 w-6 sm:w-10">
                      PIM
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, i) => (
                    <tr
                      key={`${player.participantId}-${i}`}
                      className={`border-b border-gray-50 ${
                        i % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                      }`}
                    >
                      <td className="px-1 sm:px-2 py-1.5 sm:py-2 text-center text-gray-500">
                        {player.number > 0 ? player.number : "—"}
                      </td>
                      <td className="px-1 sm:px-2 py-1.5 sm:py-2 text-left">
                        <span className="font-medium text-gray-900">
                          {player.name}
                        </span>
                        {player.position && (
                          <span className="text-[11px] sm:text-xs text-gray-500 ml-0.5">
                            ({player.position})
                          </span>
                        )}
                      </td>
                      <td className="px-0.5 sm:px-2 py-1.5 sm:py-2 text-center">
                        {player.gamesPlayed}
                      </td>
                      <td className="px-0.5 sm:px-2 py-1.5 sm:py-2 text-center font-medium text-green-700">
                        {player.goals}
                      </td>
                      <td className="px-0.5 sm:px-2 py-1.5 sm:py-2 text-center font-medium">
                        {player.assists}
                      </td>
                      <td className="px-0.5 sm:px-2 py-1.5 sm:py-2 text-center font-bold text-blue-900">
                        {player.points}
                      </td>
                      <td className="px-0.5 sm:px-2 py-1.5 sm:py-2 text-center">
                        {player.pim}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
