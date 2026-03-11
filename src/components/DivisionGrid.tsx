"use client";

import Link from "next/link";
import { DivisionStar } from "./FavoriteStar";

interface DivisionCardData {
  id: string;
  name: string;
  totalSchedules: number;
  totalTeams: number;
}

export function DivisionGrid({ divisions }: { divisions: DivisionCardData[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {divisions.map((div) => (
        <Link
          key={div.id}
          href={`/standings/rep/${div.name.toLowerCase()}`}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all group relative"
        >
          <div className="flex items-start justify-between">
            <div className="text-xl font-bold text-blue-900 group-hover:text-blue-700">
              {div.name}
            </div>
            <DivisionStar divName={div.name} />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {div.totalSchedules} leagues &middot; {div.totalTeams} teams
          </div>
        </Link>
      ))}
    </div>
  );
}
