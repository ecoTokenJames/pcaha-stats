"use client";

import { useState } from "react";
import type { TeamStanding } from "@/lib/data";
import { TeamStar } from "./FavoriteStar";

type SortKey = keyof TeamStanding;

export function StandingsTable({ teams }: { teams: TeamStanding[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);

  // Group teams by groupName if groups exist
  const hasGroups = teams.some((t) => t.groupName);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      // Default to descending for numeric stats, ascending for rank
      setSortAsc(key === "rank" || key === "teamName");
    }
  };

  const sortedTeams = [...teams].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortAsc ? cmp : -cmp;
  });

  // Split into groups if needed
  const groups: { name: string | null; teams: TeamStanding[] }[] = [];
  if (hasGroups) {
    const groupMap = new Map<string, TeamStanding[]>();
    for (const t of sortedTeams) {
      const g = t.groupName || "Other";
      if (!groupMap.has(g)) groupMap.set(g, []);
      groupMap.get(g)!.push(t);
    }
    for (const [name, gTeams] of groupMap) {
      groups.push({ name, teams: gTeams });
    }
  } else {
    groups.push({ name: null, teams: sortedTeams });
  }

  const columns: { key: SortKey; label: string; title: string; className?: string }[] = [
    { key: "rank", label: "#", title: "Rank" },
    { key: "teamName", label: "Team", title: "Team Name", className: "text-left" },
    { key: "gamesPlayed", label: "GP", title: "Games Played" },
    { key: "wins", label: "W", title: "Wins" },
    { key: "losses", label: "L", title: "Losses" },
    { key: "ties", label: "T", title: "Ties" },
    { key: "otWins", label: "OTW", title: "Overtime Wins" },
    { key: "otLosses", label: "OTL", title: "Overtime Losses" },
    { key: "points", label: "PTS", title: "Points" },
    { key: "goalsFor", label: "GF", title: "Goals For" },
    { key: "goalsAgainst", label: "GA", title: "Goals Against" },
    { key: "diff", label: "DIFF", title: "Goal Differential" },
  ];

  return (
    <div className="overflow-x-auto">
      {groups.map((group, gi) => (
        <div key={gi}>
          {group.name && (
            <div className="px-4 py-1.5 bg-gray-50 text-xs font-semibold text-gray-600 border-b border-gray-100">
              {group.name}
            </div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    title={col.title}
                    onClick={() => handleSort(col.key)}
                    className={`px-2 py-2 font-medium text-gray-500 cursor-pointer hover:text-gray-900 select-none ${
                      col.className || "text-center"
                    } ${col.key === "teamName" ? "min-w-[160px]" : ""}`}
                  >
                    <span className="inline-flex items-center gap-0.5">
                      {col.label}
                      {sortKey === col.key && (
                        <span className="text-blue-600 text-xs">
                          {sortAsc ? "▲" : "▼"}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.teams.map((team, i) => (
                <tr
                  key={`${gi}-${i}`}
                  className={`border-b border-gray-50 hover:bg-blue-50/50 transition-colors ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                  }`}
                >
                  <td className="px-2 py-2 text-center text-gray-400 font-medium">
                    {team.rank}
                  </td>
                  <td className="px-2 py-2 text-left font-medium text-gray-900 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <TeamStar teamId={team.teamId} />
                      {team.teamName}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center">{team.gamesPlayed}</td>
                  <td className="px-2 py-2 text-center font-medium text-green-700">
                    {team.wins}
                  </td>
                  <td className="px-2 py-2 text-center font-medium text-red-700">
                    {team.losses}
                  </td>
                  <td className="px-2 py-2 text-center">{team.ties}</td>
                  <td className="px-2 py-2 text-center">{team.otWins}</td>
                  <td className="px-2 py-2 text-center">{team.otLosses}</td>
                  <td className="px-2 py-2 text-center font-bold text-blue-900">
                    {team.points}
                  </td>
                  <td className="px-2 py-2 text-center">{team.goalsFor}</td>
                  <td className="px-2 py-2 text-center">{team.goalsAgainst}</td>
                  <td
                    className={`px-2 py-2 text-center font-medium ${
                      team.diff > 0
                        ? "text-green-700"
                        : team.diff < 0
                          ? "text-red-700"
                          : "text-gray-400"
                    }`}
                  >
                    {team.diff > 0 ? `+${team.diff}` : team.diff}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
