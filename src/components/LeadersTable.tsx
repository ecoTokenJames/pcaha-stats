"use client";

import { useState, useMemo } from "react";
import { levelUpLink, SponsorTag } from "./LevelUpAd";

type StatCategory = "points" | "goals" | "assists" | "pim";

const STAT_TABS: { key: StatCategory; label: string }[] = [
  { key: "points", label: "Points" },
  { key: "goals", label: "Goals" },
  { key: "assists", label: "Assists" },
  { key: "pim", label: "PIM" },
];

const PAGE_SIZE = 50;

/** One player's totals, already added up across their non-tournament games. */
export interface LeaderPlayer {
  id: number;
  name: string;
  number: number;
  position: string;
  teamName: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  pim: number;
  /** League the player's team plays in, e.g. "U11A" or "FVE U11C" */
  league: string | null;
  /** Tier/flight/group in the team's current round */
  groupName: string | null;
}

export interface LeagueOption {
  name: string;
  groups: string[];
}

export function LeadersTable({
  players,
  leagues,
}: {
  players: LeaderPlayer[];
  leagues: LeagueOption[];
}) {
  // Open on a tier that has players: the first tier (in order) with anyone in it
  const firstTierWithPlayers = (l: LeagueOption | undefined) =>
    l?.groups.find((g) =>
      players.some((p) => p.league === l.name && p.groupName === g)
    ) ?? null;

  // Always scoped to one league, and to one tier unless "All tiers" is picked
  const [league, setLeague] = useState<string | null>(leagues[0]?.name ?? null);
  const groups = leagues.find((l) => l.name === league)?.groups ?? [];
  const [tierFilter, setTierFilter] = useState<string | null>(
    firstTierWithPlayers(leagues[0])
  );
  const [positionFilter, setPositionFilter] = useState<string | null>(null);
  const [statCategory, setStatCategory] = useState<StatCategory>("points");
  const [showCount, setShowCount] = useState(PAGE_SIZE);

  const sortedPlayers = useMemo(() => {
    const filtered = players.filter(
      (p) =>
        (league === null || p.league === league) &&
        (tierFilter === null || p.groupName === tierFilter) &&
        (positionFilter === null || p.position === positionFilter)
    );
    return filtered.sort((a, b) => {
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
  }, [players, league, tierFilter, positionFilter, statCategory]);

  const visiblePlayers = sortedPlayers.slice(0, showCount);
  const hasMore = showCount < sortedPlayers.length;
  const selection = [league, tierFilter ?? (groups.length ? "all tiers" : null)]
    .filter(Boolean)
    .join(" · ");

  const chip = (active: boolean, activeClass: string) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      active
        ? activeClass
        : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-900"
    }`;

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 mb-4">
        {/* League */}
        {leagues.length > 0 && (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
              League
            </div>
            <div className="flex flex-wrap gap-1">
              {leagues.map((l) => (
                <button
                  key={l.name}
                  onClick={() => {
                    setLeague(l.name);
                    setTierFilter(firstTierWithPlayers(l));
                    setShowCount(PAGE_SIZE);
                  }}
                  className={chip(league === l.name, "bg-blue-900 text-white font-semibold")}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tier */}
        {groups.length > 0 && (
          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
              Tier
            </span>
            <select
              value={tierFilter ?? ""}
              onChange={(e) => {
                setTierFilter(e.target.value || null);
                setShowCount(PAGE_SIZE);
              }}
              className="min-w-[11rem] rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All tiers</option>
              {groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Position */}
      <div className="flex flex-wrap gap-1 mb-3">
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
            className={chip(positionFilter === opt.key, "bg-gray-700 text-white")}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Stat */}
      <div className="flex gap-1 mb-4">
        {STAT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setStatCategory(tab.key);
              setShowCount(PAGE_SIZE);
            }}
            className={chip(statCategory === tab.key, "bg-gray-900 text-white")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 mb-2">
        {sortedPlayers.length === 0
          ? `No players have played in ${selection || "this group"} yet.`
          : `${sortedPlayers.length} players in ${selection}`}
      </p>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-2 py-2 text-center font-medium text-gray-500 w-8">#</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Player</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Team</th>
                <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">GP</th>
                <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">G</th>
                <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">A</th>
                <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">PTS</th>
                <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">PIM</th>
              </tr>
            </thead>
            <tbody>
              {visiblePlayers.map((player, i) => (
                <tr
                  key={player.id}
                  className={`border-b border-gray-50 hover:bg-blue-50/50 transition-colors ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                  }`}
                >
                  <td className="px-2 py-2 text-center text-gray-400 font-medium">{i + 1}</td>
                  <td className="px-2 py-2 text-left whitespace-nowrap">
                    <span className="font-medium text-gray-900">{player.name}</span>
                    {player.number > 0 && (
                      <span className="text-gray-400 text-xs ml-1">#{player.number}</span>
                    )}
                    {player.position && (
                      <span className="text-gray-400 text-xs ml-1">({player.position})</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-left text-gray-700 text-xs">{player.teamName}</td>
                  <td className="px-2 py-2 text-center">{player.gamesPlayed}</td>
                  <td className={`px-2 py-2 text-center font-medium ${statCategory === "goals" ? "text-blue-900 font-bold" : ""}`}>
                    {player.goals}
                  </td>
                  <td className={`px-2 py-2 text-center font-medium ${statCategory === "assists" ? "text-blue-900 font-bold" : ""}`}>
                    {player.assists}
                  </td>
                  <td className={`px-2 py-2 text-center font-bold ${statCategory === "points" ? "text-blue-900" : ""}`}>
                    {player.points}
                  </td>
                  <td className={`px-2 py-2 text-center ${statCategory === "pim" ? "font-bold text-blue-900" : ""}`}>
                    {player.pim}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hasMore && (
          <div className="px-4 py-3 border-t border-gray-100 text-center">
            <button
              onClick={() => setShowCount((c) => c + PAGE_SIZE)}
              className="text-sm font-medium text-blue-700 hover:text-blue-900"
            >
              Show More ({sortedPlayers.length - showCount} remaining)
            </button>
          </div>
        )}
      </div>

      {/* Sponsor line below the leaders table */}
      {sortedPlayers.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700">
          <SponsorTag />
          <span>
            <span className="font-semibold text-gray-900">Want to be on this list?</span>{" "}
            Players climb with Level Up&apos;s at-home drills.{" "}
            <a
              href={levelUpLink("leaders-row")}
              target="_blank"
              rel="sponsored noopener"
              className="font-semibold underline"
              style={{ color: "#FF3D00" }}
            >
              Try it free →
            </a>
          </span>
        </p>
      )}
    </div>
  );
}
