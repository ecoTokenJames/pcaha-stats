"use client";

import { usePathname, useRouter } from "next/navigation";
import { switchSeasonHref } from "@/lib/season-path";

/** Season dropdown next to a section title. The site always opens on the current season. */
export function SeasonPicker({
  seasons,
  current,
  season,
}: {
  seasons: string[];
  current: string;
  season: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  if (seasons.length < 2) return null;

  return (
    <label className="inline-flex items-center gap-1.5 text-sm text-gray-600">
      <span className="sr-only">Season</span>
      <select
        value={season}
        onChange={(e) => router.push(switchSeasonHref(pathname, e.target.value, current))}
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {seasons.map((s) => (
          <option key={s} value={s}>
            {s === current ? `${s} (this season)` : s}
          </option>
        ))}
      </select>
    </label>
  );
}
