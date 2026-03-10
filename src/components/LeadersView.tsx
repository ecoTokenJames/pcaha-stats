"use client";

import { useState } from "react";
import type { Leaders, DivisionMeta, PlayerStat } from "@/lib/data";

type Category = "topScorers" | "topGoals" | "topAssists" | "topPIM";

const CATEGORIES: { key: Category; label: string; statKey: string }[] = [
  { key: "topScorers", label: "Points", statKey: "points" },
  { key: "topGoals", label: "Goals", statKey: "goals" },
  { key: "topAssists", label: "Assists", statKey: "assists" },
  { key: "topPIM", label: "PIM", statKey: "pim" },
];

export function LeadersView({
  leaders,
  divisions,
}: {
  leaders: Leaders;
  divisions: DivisionMeta[];
}) {
  const [selectedDivision, setSelectedDivision] = useState(divisions[0]?.name);
  const [selectedCategory, setSelectedCategory] =
    useState<Category>("topScorers");

  const divLeaders = leaders[selectedDivision];
  const players = divLeaders?.[selectedCategory] || [];
  const category = CATEGORIES.find((c) => c.key === selectedCategory)!;

  return (
    <div>
      {/* Division Tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        {divisions.map((div) => (
          <button
            key={div.id}
            onClick={() => setSelectedDivision(div.name)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              selectedDivision === div.name
                ? "bg-blue-900 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-900"
            }`}
          >
            {div.name}
          </button>
        ))}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              selectedCategory === cat.key
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-400 hover:text-gray-900"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Leaders Table */}
      {players.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No player data available for {selectedDivision}.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-2 py-2 text-center font-medium text-gray-500 w-8">
                    #
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">
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
                {players.map((player: PlayerStat, i: number) => (
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
                    </td>
                    <td className="px-2 py-2 text-left text-gray-700 text-xs">
                      {player.teamName}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {player.gamesPlayed}
                    </td>
                    <td
                      className={`px-2 py-2 text-center font-medium ${
                        category.statKey === "goals" ? "text-blue-900 font-bold" : ""
                      }`}
                    >
                      {player.goals}
                    </td>
                    <td
                      className={`px-2 py-2 text-center font-medium ${
                        category.statKey === "assists" ? "text-blue-900 font-bold" : ""
                      }`}
                    >
                      {player.assists}
                    </td>
                    <td
                      className={`px-2 py-2 text-center font-bold ${
                        category.statKey === "points"
                          ? "text-blue-900"
                          : ""
                      }`}
                    >
                      {player.points}
                    </td>
                    <td
                      className={`px-2 py-2 text-center ${
                        category.statKey === "pim"
                          ? "font-bold text-blue-900"
                          : ""
                      }`}
                    >
                      {player.pim}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
