"use client";

import { useState, useMemo } from "react";
import type { PlayerStat, TeamStanding } from "@/lib/data";

interface TournamentData {
  scheduleId: number;
  scheduleName: string;
  divisionName: string;
  categoryName: string;
  teams: TeamStanding[];
  players: PlayerStat[];
}

/**
 * Shorten tournament names by stripping the "VIAHA Island League" prefix
 * and division prefix for display.
 */
function shortName(name: string): string {
  return name
    .replace(/^VIAHA Island League\s*/i, "")
    .replace(/^(Tier \d+\s+)?U\d+\s*/i, "")
    .trim();
}

export function TournamentView({
  tournaments,
}: {
  tournaments: TournamentData[];
}) {
  const [selectedId, setSelectedId] = useState<number>(
    tournaments[0]?.scheduleId ?? 0
  );

  const selected = useMemo(
    () => tournaments.find((t) => t.scheduleId === selectedId) ?? null,
    [tournaments, selectedId]
  );

  // Group players by teamId for the selected tournament
  const teamPlayers = useMemo(() => {
    if (!selected) return new Map<number, PlayerStat[]>();
    const grouped = new Map<number, PlayerStat[]>();
    for (const p of selected.players) {
      const list = grouped.get(p.teamId) || [];
      list.push(p);
      grouped.set(p.teamId, list);
    }
    // Sort each team's players by points
    for (const [teamId, players] of grouped) {
      grouped.set(
        teamId,
        players.sort((a, b) => b.points - a.points || b.goals - a.goals)
      );
    }
    return grouped;
  }, [selected]);

  // Get available divisions for filtering
  const divisions = useMemo(() => {
    const divs = [...new Set(tournaments.map((t) => t.divisionName))];
    return divs.sort((a, b) => {
      const numA = parseInt(a.replace("U", ""));
      const numB = parseInt(b.replace("U", ""));
      return numA - numB;
    });
  }, [tournaments]);

  const [divFilter, setDivFilter] = useState<string | null>(null);

  const filteredTournaments = useMemo(() => {
    if (divFilter === null) return tournaments;
    return tournaments.filter((t) => t.divisionName === divFilter);
  }, [tournaments, divFilter]);

  return (
    <div>
      {/* Division Filter */}
      <div className="flex flex-wrap gap-1 mb-4">
        <button
          onClick={() => setDivFilter(null)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            divFilter === null
              ? "bg-blue-900 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-900"
          }`}
        >
          All Divisions
        </button>
        {divisions.map((div) => (
          <button
            key={div}
            onClick={() => setDivFilter(div)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              divFilter === div
                ? "bg-blue-900 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-900"
            }`}
          >
            {div}
          </button>
        ))}
      </div>

      {/* Tournament Selector */}
      <div className="mb-6">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {filteredTournaments.map((t) => (
            <option key={t.scheduleId} value={t.scheduleId}>
              {t.divisionName} — {shortName(t.scheduleName)} ({t.teams.length}{" "}
              teams)
            </option>
          ))}
        </select>
      </div>

      {/* Selected Tournament Content */}
      {selected && (
        <div className="space-y-6">
          {/* Tournament Standings */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">
                Standings
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {selected.scheduleName}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-2 py-2 text-center font-medium text-gray-500 w-8">
                      #
                    </th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500">
                      Team
                    </th>
                    <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                      GP
                    </th>
                    <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                      W
                    </th>
                    <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                      L
                    </th>
                    <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                      T
                    </th>
                    <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                      PTS
                    </th>
                    <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                      GF
                    </th>
                    <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                      GA
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selected.teams.map((team, i) => (
                    <tr
                      key={team.teamId}
                      className={`border-b border-gray-50 ${
                        i % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                      }`}
                    >
                      <td className="px-2 py-2 text-center text-gray-400 font-medium">
                        {i + 1}
                      </td>
                      <td className="px-2 py-2 text-left font-medium text-gray-900 text-xs">
                        {team.teamName}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {team.gamesPlayed}
                      </td>
                      <td className="px-2 py-2 text-center text-green-700 font-medium">
                        {team.wins}
                      </td>
                      <td className="px-2 py-2 text-center text-red-600 font-medium">
                        {team.losses}
                      </td>
                      <td className="px-2 py-2 text-center">{team.ties}</td>
                      <td className="px-2 py-2 text-center font-bold text-blue-900">
                        {team.points}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {team.goalsFor}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {team.goalsAgainst}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Player Stats by Team */}
          <h3 className="text-lg font-semibold text-gray-900">
            Player Stats by Team
          </h3>
          {selected.teams.map((team) => {
            const players = teamPlayers.get(team.teamId);
            if (!players || players.length === 0) return null;
            return (
              <div
                key={team.teamId}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-gray-100">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {team.teamName}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {players.length} players
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-2 py-2 text-center font-medium text-gray-500 w-8">
                          #
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-gray-500">
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
                          <td className="px-2 py-2 text-center text-gray-400">
                            {player.number > 0 ? player.number : "—"}
                          </td>
                          <td className="px-2 py-2 text-left whitespace-nowrap">
                            <span className="font-medium text-gray-900">
                              {player.name}
                            </span>
                            {player.position && (
                              <span className="text-xs text-gray-400 ml-1">
                                ({player.position})
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {player.gamesPlayed}
                          </td>
                          <td className="px-2 py-2 text-center font-medium text-green-700">
                            {player.goals}
                          </td>
                          <td className="px-2 py-2 text-center font-medium">
                            {player.assists}
                          </td>
                          <td className="px-2 py-2 text-center font-bold text-blue-900">
                            {player.points}
                          </td>
                          <td className="px-2 py-2 text-center">
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
      )}
    </div>
  );
}
