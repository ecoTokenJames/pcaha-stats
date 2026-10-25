"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DivisionMeta } from "@/lib/data";
import { stripCurrentSeason } from "@/lib/season-path";

export function DivisionTabs({
  divisions,
  basePath,
  current,
}: {
  divisions: DivisionMeta[];
  basePath: string;
  /** Current season, so its internal /seasons/<current> path matches the public one */
  current: string;
}) {
  const pathname = stripCurrentSeason(usePathname(), current);

  return (
    <div className="flex flex-wrap gap-1 mb-6">
      {divisions.map((div) => {
        const href = `${basePath}/${div.name.toLowerCase()}`;
        const isActive = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={div.id}
            href={href}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? "bg-blue-900 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-900"
            }`}
          >
            {div.name}
          </Link>
        );
      })}
    </div>
  );
}
