"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export interface TournamentSummary {
  scheduleId: number;
  scheduleName: string;
  divisionName: string;
  teamCount: number;
  /** e.g. "Oct 9–12" or "Final" */
  when: string;
  /** "current" tournaments are listed first */
  phase: "current" | "upcoming" | "finished" | "unknown";
}

/**
 * Shorten tournament names by stripping the "VIAHA Island League" prefix
 * and division prefix for display.
 */
function shortName(name: string): string {
  return (
    name
      .replace(/^VIAHA Island League\s*/i, "")
      .replace(/^(Tier \d+\s+)?U\d+\s+/i, "")
      .trim() || name
  );
}

const PHASE_ORDER = { current: 0, upcoming: 1, unknown: 2, finished: 3 };

/** Tournament list with a division filter; each row links to its own page. */
export function TournamentView({
  tournaments,
  basePath = "/tournaments",
}: {
  tournaments: TournamentSummary[];
  /** Where tournament pages live for this season */
  basePath?: string;
}) {
  const [divFilter, setDivFilter] = useState<string | null>(null);

  const divisions = useMemo(() => {
    const divs = [...new Set(tournaments.map((t) => t.divisionName))];
    return divs.sort(
      (a, b) => parseInt(a.replace("U", "")) - parseInt(b.replace("U", ""))
    );
  }, [tournaments]);

  const shown = tournaments
    .filter((t) => divFilter === null || t.divisionName === divFilter)
    .sort(
      (a, b) =>
        PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase] ||
        parseInt(a.divisionName.replace("U", "")) -
          parseInt(b.divisionName.replace("U", "")) ||
        a.scheduleName.localeCompare(b.scheduleName)
    );

  const chip = (active: boolean) =>
    `px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
      active
        ? "bg-blue-900 text-white"
        : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-900"
    }`;

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-4">
        <button onClick={() => setDivFilter(null)} className={chip(divFilter === null)}>
          All Divisions
        </button>
        {divisions.map((div) => (
          <button key={div} onClick={() => setDivFilter(div)} className={chip(divFilter === div)}>
            {div}
          </button>
        ))}
      </div>

      <ul className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        {shown.map((t) => (
          <li key={t.scheduleId}>
            <Link
              href={`${basePath}/${t.scheduleId}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-blue-50/50"
            >
              <div className="min-w-0">
                <div className="font-medium text-gray-900 text-sm break-words">
                  {shortName(t.scheduleName)}
                </div>
                <div className="text-xs text-gray-500">
                  {t.divisionName} · {t.teamCount} teams · {t.when}
                </div>
              </div>
              {t.phase === "current" && (
                <span className="shrink-0 rounded bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700">
                  On now
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
