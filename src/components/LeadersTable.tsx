"use client";

import { useState, useMemo } from "react";
import type { PlayerStat } from "@/lib/data";

type StatCategory = "points" | "goals" | "assists" | "pim";

const STAT_TABS: { key: StatCategory; label: string }[] = [
  { key: "points", label: "Points" },
  { key: "goals", label: "Goals" },
  { key: "assists", label: "Assists" },
  { key: "pim", label: "PIM" },
];

const PAGE_SIZE = 50;

export interface LeaderPlayer extends PlayerStat {
  groupName: string | null;
}

/**
 * Merge multiple entries for the same player (e.g. playoff + placement) into one.
 */
function mergeByPlayer(players: LeaderPlayer[]): LeaderPlayer[] {
  const grouped = new Map<number, LeaderPlayer[]>();
  for (const p of players) {
    const entries = grouped.get(p.participantId) || [];
    entries.push(p);
    grouped.set(p.participantId, entries);
  }

  const merged: LeaderPlayer[] = [];
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

export function LeadersTable({
  players,
  groups,
}: {
  players: LeaderPlayer[];
  groups: string[];
}) {
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState<string | null>(null);
  const [statCategory, setStatCategory] = useState<StatCategory>("points");
  const [showCount, setShowCount] = useState(PAGE_SIZE);

  // Merge all schedule types (regular season + playoffs + placement) per player, then filter
  const filteredPlayers = useMemo(() => {
    let filtered = mergeByPlayer(players);

    // Apply tier/group filter
    if (tierFilter !== null) {
      filtered = filtered.filter((p) => p.groupName === tierFilter);
    }

    // Apply position filter
    if (positionFilter !== null) {
      filtered = filtered.filter((p) => p.position === positionFilter);
    }

    return filtered;
  }, [players, tierFilter, positionFilter]);

  // Sort players by selected stat category
  const sortedPlayers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      switch (statCategory) {
        case "goals":
          return b.goals - a.goals || b.points - a.points;
        case "assists":
          return b.assists - a.assists || b.points - a.points;
        case "pim":
          return b.pim - a.pim;
        default:
          return b.points - a.points || b.goals - a.goals;
      }
    });
  }, [filteredPlayers, statCategory]);

  const visiblePlayers = sortedPlayers.slice(0, showCount);
  const hasMore = showCount < sortedPlayers.length;

  return (
    <div>
      {/* Tier/Flight Filter */}
      {groups.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          <button
            onClick={() => {
              setTierFilter(null);
              setShowCount(PAGE_SIZE);
            }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tierFilter === null
                ? "bg-blue-700 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-900"
            }`}
          >
            All Tiers
          </button>
          {groups.map((group) => (
            <button
              key={group}
              onClick={() => {
                setTierFilter(group);
                setShowCount(PAGE_SIZE);
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tierFilter === group
                  ? "bg-blue-700 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-900"
              }`}
            >
              {group}
            </button>
          ))}
        </div>
      )}

      {/* Position Filter */}
      <div className="flex gap-1 mb-4">
        {[
          { key: null, label: "All Positions" },
          { key: "F", label: "Forwards" },
          { key: "D", label: "Defence" },
        ].map((opt) => (
          <button
            key={opt.label}
            onClick={() => {
              setPositionFilter(opt.key);
              setShowCount(PAGE_SIZE);
            }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              positionFilter === opt.key
                ? "bg-gray-700 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-400 hover:text-gray-900"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Stat Category Tabs */}
      <div className="flex gap-1 mb-6">
        {STAT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setStatCategory(tab.key);
              setShowCount(PAGE_SIZE);
            }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              statCategory === tab.key
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-400 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Total count */}
      <p className="text-xs text-gray-400 mb-2">
        {sortedPlayers.length} players (min. 3 GP)
      </p>

      {/* Leaders Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-2 py-2 text-center font-medium text-gray-500 w-8">
                  #
                </th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[160px]">
                  Player
                </th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">
                  Team
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
              {visiblePlayers.map((player, i) => (
                <tr
                  key={`${player.participantId}-${i}`}
                  className={`border-b border-gray-50 hover:bg-blue-50/50 transition-colors ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                  }`}
                >
                  <td className="px-2 py-2 text-center text-gray-400 font-medium">
                    {i + 1}
                  </td>
                  <td className="px-2 py-2 text-left whitespace-nowrap">
                    <span className="font-medium text-gray-900">
                      {player.name}
                    </span>
                    {player.number > 0 && (
                      <span className="text-gray-400 text-xs ml-1">
                        #{player.number}
                      </span>
                    )}
                    {player.position && (
                      <span className="text-xs text-gray-400 ml-1">
                        ({player.position})
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-left text-gray-700 text-xs">
                    {player.teamName}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {player.gamesPlayed}
                  </td>
                  <td
                    className={`px-2 py-2 text-center font-medium ${
                      statCategory === "goals" ? "text-blue-900 font-bold" : ""
                    }`}
                  >
                    {player.goals}
                  </td>
                  <td
                    className={`px-2 py-2 text-center font-medium ${
                      statCategory === "assists"
                        ? "text-blue-900 font-bold"
                        : ""
                    }`}
                  >
                    {player.assists}
                  </td>
                  <td
                    className={`px-2 py-2 text-center font-bold ${
                      statCategory === "points" ? "text-blue-900" : ""
                    }`}
                  >
                    {player.points}
                  </td>
                  <td
                    className={`px-2 py-2 text-center ${
                      statCategory === "pim" ? "font-bold text-blue-900" : ""
                    }`}
                  >
                    {player.pim}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Show More Button */}
        {hasMore && (
          <div className="px-4 py-3 border-t border-gray-100 text-center">
            <button
              onClick={() => setShowCount((c) => c + PAGE_SIZE)}
              className="text-sm text-blue-700 hover:text-blue-900 font-medium"
            >
              Show More ({sortedPlayers.length - showCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
