"use client";

import { useMemo } from "react";
import type { GameView, PlayerStat, TeamStanding } from "@/lib/data";
import { GamesList } from "./GamesList";
import { TeamName } from "./TeamName";
import { showsSportsmanship, SPORTSMANSHIP_TITLE } from "@/lib/sportsmanship";

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

export interface TournamentGroupView {
  /** e.g. "Gold Tier", "Pool A"; "" when the tournament is one table */
  label: string;
  note?: string;
  /** Empty for a "Playoffs" section (games between pools) */
  teams: TeamStanding[];
  /** This table's games, newest first */
  games: GameView[];
}

/**
 * One tournament: for each tier / flight / pool, its standings with the games
 * played and coming up in it underneath; then player stats.
 */
export function TournamentDetail({
  groups,
  players,
}: {
  groups: TournamentGroupView[];
  players: TournamentPlayer[];
}) {
  // Group players by team, best scorers first
  const teamPlayers = useMemo(() => {
    const grouped = new Map<number, TournamentPlayer[]>();
    for (const p of players) {
      const list = grouped.get(p.teamId) || [];
      list.push(p);
      grouped.set(p.teamId, list);
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => b.points - a.points || b.goals - a.goals);
    }
    return grouped;
  }, [players]);

  // Each team once, in standings order (a team can be in a pool and a playoff flight)
  const teams = useMemo(() => {
    const byId = new Map<number, TeamStanding>();
    for (const t of groups.flatMap((g) => g.teams)) if (!byId.has(t.teamId)) byId.set(t.teamId, t);
    return [...byId.values()];
  }, [groups]);

  return (
    <div className="space-y-6">
      {groups.length > 2 && (
        <nav aria-label="Standings tables" className="flex flex-wrap gap-1">
          {groups.map((g, i) => (
            <a
              key={i}
              href={`#group-${i + 1}`}
              className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:border-blue-300 hover:text-blue-900"
            >
              {g.label}
            </a>
          ))}
        </nav>
      )}

      {groups.map((group, g) => (
        <div
          key={g}
          id={`group-${g + 1}`}
          className="scroll-mt-4 bg-white rounded-lg border border-gray-200 overflow-hidden"
        >
          <div className="px-3 sm:px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm break-words">
              {group.label || "Standings & games"}
            </h3>
          </div>
          {group.teams.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-1 sm:px-2 py-2 text-center font-medium text-gray-500 w-5 sm:w-8">#</th>
                    <th className="px-1 sm:px-2 py-2 text-left font-medium text-gray-500">Team</th>
                    <th className="px-0.5 sm:px-2 py-2 text-center font-medium text-gray-500 w-6 sm:w-10">GP</th>
                    <th className="px-0.5 sm:px-2 py-2 text-center font-medium text-gray-500 w-5 sm:w-10">W</th>
                    <th className="px-0.5 sm:px-2 py-2 text-center font-medium text-gray-500 w-5 sm:w-10">L</th>
                    <th className="px-0.5 sm:px-2 py-2 text-center font-medium text-gray-500 w-5 sm:w-10">T</th>
                    <th className="px-0.5 sm:px-2 py-2 text-center font-medium text-gray-500 w-6 sm:w-10">PTS</th>
                  {showsSportsmanship(group.teams) && (
                    <th
                      title={SPORTSMANSHIP_TITLE}
                      className="px-0.5 sm:px-2 py-2 text-center font-medium text-gray-500 w-6 sm:w-10"
                    >
                      SP
                    </th>
                  )}
                    <th className="px-0.5 sm:px-2 py-2 text-center font-medium text-gray-500 w-6 sm:w-10">GF</th>
                    <th className="px-0.5 sm:px-2 py-2 text-center font-medium text-gray-500 w-6 sm:w-10">GA</th>
                  </tr>
                </thead>
                <tbody>
                  {group.teams.map((team, i) => (
                    <tr
                      key={team.teamId}
                      className={`border-b border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
                    >
                      <td className="px-1 sm:px-2 py-1.5 sm:py-2 text-center text-gray-500 font-medium">
                        {team.gamesPlayed > 0 ? i + 1 : "–"}
                      </td>
                      <td className="px-1 sm:px-2 py-1.5 sm:py-2 text-left font-medium text-gray-900 text-xs">
                        <TeamName name={team.teamName} short={team.shortName} />
                      </td>
                      <td className="px-0.5 sm:px-2 py-1.5 sm:py-2 text-center">{team.gamesPlayed}</td>
                      <td className="px-0.5 sm:px-2 py-1.5 sm:py-2 text-center text-green-700 font-medium">{team.wins}</td>
                      <td className="px-0.5 sm:px-2 py-1.5 sm:py-2 text-center text-red-600 font-medium">{team.losses}</td>
                      <td className="px-0.5 sm:px-2 py-1.5 sm:py-2 text-center">{team.ties}</td>
                      <td className="px-0.5 sm:px-2 py-1.5 sm:py-2 text-center font-bold text-blue-900">{team.points}</td>
                    {showsSportsmanship(group.teams) && (
                      <td className="px-0.5 sm:px-2 py-1.5 sm:py-2 text-center">{team.sportsmanshipPoints}</td>
                    )}
                      <td className="px-0.5 sm:px-2 py-1.5 sm:py-2 text-center">{team.goalsFor}</td>
                      <td className="px-0.5 sm:px-2 py-1.5 sm:py-2 text-center">{team.goalsAgainst}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(group.note || showsSportsmanship(group.teams)) && (
            <p className="px-3 sm:px-4 py-2 text-xs text-gray-500">
              {[showsSportsmanship(group.teams) && "SP = sportsmanship points.", group.note]
                .filter(Boolean)
                .join(" ")}
            </p>
          )}
          {/* This table's games: results, then what's coming up */}
          <div className="border-t border-gray-100">
            <GamesList
              games={group.games}
              resultsPerPage={30}
              upcomingShown={30}
              emptyText="No games in this group yet."
            />
          </div>
        </div>
      ))}

      {/* Player Stats by Team */}
      <h3 className="text-lg font-semibold text-gray-900">
        Player Stats by Team
      </h3>
      {teams.map((team) => {
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
