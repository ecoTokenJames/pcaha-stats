"use client";

import { useState } from "react";
import Link from "next/link";
import type { GameView, TeamStanding } from "@/lib/data";
import { GamesList } from "./GamesList";
import { TeamStar } from "./FavoriteStar";

type SortKey = keyof TeamStanding;

export function StandingsTable({
  teams,
  teamLinkBase,
  games = [],
}: {
  teams: TeamStanding[];
  teamLinkBase?: string;
  games?: GameView[];
}) {
  // Standings or Games, per tier/group (keyed by group name)
  const [views, setViews] = useState<Record<string, "standings" | "games">>({});
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

  // Split into groups if needed, sorted by tier level (highest first)
  const groups: { name: string | null; teams: TeamStanding[] }[] = [];
  if (hasGroups) {
    const groupMap = new Map<string, TeamStanding[]>();
    for (const t of sortedTeams) {
      const g = t.groupName || "Other";
      if (!groupMap.has(g)) groupMap.set(g, []);
      groupMap.get(g)!.push(t);
    }
    const unsorted = Array.from(groupMap.entries()).map(([name, gTeams]) => ({
      name,
      teams: gTeams,
    }));

    // Sort groups: Inter-Conference first, then by conference prefix + flight number
    unsorted.sort((a, b) => {
      const aName = a.name || "";
      const bName = b.name || "";

      // Inter-Conference is always first (highest level)
      const aIsInter = aName.toLowerCase().includes("inter-conference");
      const bIsInter = bName.toLowerCase().includes("inter-conference");
      if (aIsInter && !bIsInter) return -1;
      if (!aIsInter && bIsInter) return 1;

      // Extract conference prefix (FVC, GVC) and flight/tier number
      const parseGroup = (name: string) => {
        const lower = name.toLowerCase();
        // Match patterns like "FVC Flight 3", "GVC Flight 1", "Tier 2", "Flight 5"
        const match = lower.match(
          /^(fvc|gvc)?\s*(flight|tier|group)\s*(\d+)/
        );
        if (match) {
          return {
            conference: match[1] || "",
            number: parseInt(match[3]),
          };
        }
        return { conference: "", number: 999 };
      };

      const aParsed = parseGroup(aName);
      const bParsed = parseGroup(bName);

      // Sort by conference first (FVC before GVC), then by number
      if (aParsed.conference !== bParsed.conference) {
        return aParsed.conference.localeCompare(bParsed.conference);
      }
      if (aParsed.number !== bParsed.number) {
        return aParsed.number - bParsed.number;
      }

      return aName.localeCompare(bName);
    });

    groups.push(...unsorted);
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

  // Which group each game belongs to: Spordle's group, else the home/away team's
  const teamGroup = new Map<number, string>();
  for (const t of teams) teamGroup.set(t.teamId, t.groupName || "Other");
  const gamesFor = (groupName: string | null) =>
    groupName === null
      ? games
      : games.filter(
          (g) =>
            (g.groupName ??
              teamGroup.get(g.homeTeamId) ??
              teamGroup.get(g.awayTeamId)) === groupName
        );

  return (
    <div>
      {groups.map((group, gi) => {
        const key = group.name ?? "";
        const view = views[key] ?? "standings";
        const groupGames = gamesFor(group.name);
        const showToggle = games.length > 0;
        return (
        <div key={gi}>
          {(group.name || showToggle) && (
            <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-600">
                {group.name}
              </span>
              {showToggle && (
                <div
                  role="tablist"
                  aria-label={`${group.name ?? "Schedule"} view`}
                  className="inline-flex rounded-md bg-white border border-gray-200 p-0.5 text-xs font-medium"
                >
                  {(["standings", "games"] as const).map((v) => (
                    <button
                      key={v}
                      role="tab"
                      aria-selected={view === v}
                      onClick={() => setViews((prev) => ({ ...prev, [key]: v }))}
                      className={`px-2.5 py-1 rounded ${
                        view === v
                          ? "bg-blue-900 text-white"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {v === "standings"
                        ? "Standings"
                        : `Games (${groupGames.filter((g) => g.status === "final").length})`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {view === "games" ? (
            <GamesList games={groupGames} teamLinkBase={teamLinkBase} />
          ) : (
          <div className="overflow-x-auto">
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
                    {team.gamesPlayed > 0 ? team.rank : "–"}
                  </td>
                  <td className="px-2 py-2 text-left font-medium text-gray-900 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <TeamStar teamId={team.teamId} />
                      {teamLinkBase ? (
                        <Link
                          href={`${teamLinkBase}/${team.teamId}`}
                          className="hover:text-blue-700 hover:underline"
                        >
                          {team.teamName}
                        </Link>
                      ) : (
                        team.teamName
                      )}
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
          )}
        </div>
        );
      })}
    </div>
  );
}
