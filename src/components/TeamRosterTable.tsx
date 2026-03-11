"use client";

import { useState, useMemo } from "react";
import type { PlayerStat } from "@/lib/data";

type ScheduleFilter = "League" | "Playoffs";

const SCHEDULE_TABS: { key: ScheduleFilter; label: string }[] = [
  { key: "League", label: "Regular Season" },
  { key: "Playoffs", label: "Playoffs" },
];

export interface RosterPlayer extends PlayerStat {
  scheduleType: string;
}

/**
 * Merge multiple entries for the same player (e.g. playoff + placement) into one.
 */
function mergeByPlayer(players: RosterPlayer[]): RosterPlayer[] {
  const grouped = new Map<number, RosterPlayer[]>();
  for (const p of players) {
    const entries = grouped.get(p.participantId) || [];
    entries.push(p);
    grouped.set(p.participantId, entries);
  }

  const merged: RosterPlayer[] = [];
  for (const entries of grouped.values()) {
    const primary = entries.reduce((a, b) =>
      a.gamesPlayed >= b.gamesPlayed ? a : b
    );
    merged.push({
      ...primary,
      gamesPlayed: entries.reduce((sum, e) => sum + e.gamesPlayed, 0),
      goals: entries.reduce((sum, e) => sum + e.goals, 0),
      assists: entries.reduce((sum, e) => sum + e.assists, 0),
      points: entries.reduce((sum, e) => sum + e.points, 0),
      pim: entries.reduce((sum, e) => sum + e.pim, 0),
      ppGoals: entries.reduce((sum, e) => sum + e.ppGoals, 0),
      shGoals: entries.reduce((sum, e) => sum + e.shGoals, 0),
      gwGoals: entries.reduce((sum, e) => sum + e.gwGoals, 0),
    });
  }

  return merged;
}

export function TeamRosterTable({ players }: { players: RosterPlayer[] }) {
  const [scheduleFilter, setScheduleFilter] =
    useState<ScheduleFilter>("League");

  const hasPlayoffs = useMemo(
    () => players.some((p) => p.scheduleType !== "League"),
    [players]
  );

  const filteredPlayers = useMemo(() => {
    let filtered: RosterPlayer[];
    if (scheduleFilter === "League") {
      filtered = players.filter((p) => p.scheduleType === "League");
    } else {
      filtered = players.filter((p) => p.scheduleType !== "League");
      filtered = mergeByPlayer(filtered);
    }
    return filtered.sort((a, b) => b.points - a.points || b.goals - a.goals);
  }, [players, scheduleFilter]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 text-sm">
          Player Stats
          <span className="text-xs font-normal text-gray-400 ml-2">
            ({filteredPlayers.length} players)
          </span>
        </h4>

        {/* Schedule Type Toggle */}
        {hasPlayoffs && (
          <div className="flex gap-1">
            {SCHEDULE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setScheduleFilter(tab.key)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  scheduleFilter === tab.key
                    ? "bg-blue-900 text-white"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredPlayers.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No player stats recorded for this team
          {scheduleFilter === "Playoffs" ? " in playoffs" : ""} yet.
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
              {filteredPlayers.map((player, i) => (
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
                      <span
                        className="text-xs text-orange-500 ml-1"
                        title="Affiliate Player"
                      >
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
                  <td className="px-2 py-2 text-center">{player.assists}</td>
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
  );
}
