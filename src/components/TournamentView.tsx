"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { pacificToday } from "@/lib/tournament-groups";

export interface TournamentSummary {
  id: number;
  name: string;
  divisionName: string;
  /** e.g. "U13 A" */
  categories: string;
  teamCount: number;
  /** Standings tables (tiers / flights / pools) */
  groupCount: number;
  startDate?: string;
  endDate?: string;
  /** e.g. "Oct 9 – Oct 12" */
  when: string;
}

type Phase = "current" | "upcoming" | "finished" | "unknown";

function phaseOf(t: TournamentSummary, today: string): Phase {
  if (!t.startDate || !t.endDate) return "unknown";
  if (today < t.startDate) return "upcoming";
  if (today > t.endDate) return "finished";
  return "current";
}

const PHASE_ORDER: Record<Phase, number> = { current: 0, upcoming: 1, unknown: 2, finished: 3 };

/** Strip the "VIAHA Island League" style prefix for display. */
function shortName(name: string): string {
  return name.replace(/^VIAHA Island League\s*/i, "").trim() || name;
}

const ageNumber = (div: string) => parseInt(div.replace(/\D/g, ""), 10) || 99;

/**
 * Tournaments by age group: on now first, then coming up (soonest first), then
 * finished (most recent first). Each row links to the tournament's own page.
 */
export function TournamentView({
  tournaments,
  basePath = "/tournaments",
  builtOn,
}: {
  tournaments: TournamentSummary[];
  /** Where tournament pages live for this season */
  basePath?: string;
  /** The date the page was built, so the first render matches the server */
  builtOn: string;
}) {
  const [divFilter, setDivFilter] = useState<string | null>(null);
  // Pages are rebuilt twice a day; use the visitor's date so "On now" is never stale.
  // The server render (and hydration) uses the build date.
  const today = useSyncExternalStore(
    () => () => {},
    () => pacificToday(),
    () => builtOn
  );

  const divisions = useMemo(
    () => [...new Set(tournaments.map((t) => t.divisionName))].sort((a, b) => ageNumber(a) - ageNumber(b)),
    [tournaments]
  );

  const sections = useMemo(() => {
    const byPhase = (a: TournamentSummary, b: TournamentSummary) => {
      const pa = phaseOf(a, today);
      const pb = phaseOf(b, today);
      if (pa !== pb) return PHASE_ORDER[pa] - PHASE_ORDER[pb];
      const sa = a.startDate ?? "";
      const sb = b.startDate ?? "";
      // Finished: most recent first; on now / upcoming: soonest first
      return (pa === "finished" ? sb.localeCompare(sa) : sa.localeCompare(sb)) || a.name.localeCompare(b.name);
    };
    return divisions
      .filter((d) => divFilter === null || d === divFilter)
      .map((d) => ({
        division: d,
        tournaments: tournaments.filter((t) => t.divisionName === d).sort(byPhase),
      }));
  }, [divisions, divFilter, tournaments, today]);

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

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.division}>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {section.division}{" "}
              <span className="font-normal normal-case tracking-normal text-gray-400">
                · {section.tournaments.length} tournament{section.tournaments.length === 1 ? "" : "s"}
              </span>
            </h3>
            <ul className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {section.tournaments.map((t) => {
                const phase = phaseOf(t, today);
                return (
                  <li key={t.id}>
                    <Link
                      href={`${basePath}/${t.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-blue-50/50"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 text-sm break-words">{shortName(t.name)}</div>
                        <div className="text-xs text-gray-500">
                          {[
                            t.categories,
                            t.groupCount > 1 ? `${t.groupCount} groups` : null,
                            `${t.teamCount} teams`,
                            t.when,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </div>
                      {phase === "current" && (
                        <span className="shrink-0 rounded bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700">
                          On now
                        </span>
                      )}
                      {phase === "finished" && (
                        <span className="shrink-0 text-xs text-gray-400">Final</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
