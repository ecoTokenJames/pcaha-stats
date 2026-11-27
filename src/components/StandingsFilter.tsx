"use client";

import { createContext, useContext, useState } from "react";

export interface LeagueTiers {
  /** e.g. "FVW U11C", "U13A", "PCEHL U13 AA" */
  name: string;
  /** Tier/flight/group names in this league's tables */
  tiers: string[];
}

interface Filter {
  league: string | null;
  tier: string | null;
}

const FilterContext = createContext<Filter | null>(null);

/** The league/tier picked at the top of a standings page (null = no filter) */
export function useStandingsFilter(): Filter | null {
  return useContext(FilterContext);
}

function shows(filter: Filter | null, league: string, tiers: string[]): boolean {
  if (!filter) return true;
  if (filter.league && filter.league !== league) return false;
  if (filter.tier && !tiers.includes(filter.tier)) return false;
  return true;
}

/**
 * League buttons and a Tier menu at the top of a standings page, like the ones on
 * Leaders, so a family can narrow a long page down to their own league and tier.
 * Everything shows until a league is picked.
 */
export function StandingsFilter({
  leagues,
  children,
}: {
  leagues: LeagueTiers[];
  children: React.ReactNode;
}) {
  const single = leagues.length === 1 ? leagues[0].name : null;
  const [league, setLeague] = useState<string | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const current = leagues.find((l) => l.name === (league ?? single));
  const tiers = current?.tiers ?? [];

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      active
        ? "bg-blue-900 text-white font-semibold"
        : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-900"
    }`;

  const showLeagues = leagues.length > 1;
  const showTiers = tiers.length > 1;

  return (
    <FilterContext.Provider value={{ league, tier }}>
      {(showLeagues || showTiers) && (
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          {showLeagues && (
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">League</div>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => {
                    setLeague(null);
                    setTier(null);
                  }}
                  className={chip(league === null)}
                >
                  All leagues
                </button>
                {leagues.map((l) => (
                  <button
                    key={l.name}
                    onClick={() => {
                      setLeague(l.name);
                      setTier(null);
                    }}
                    className={chip(league === l.name)}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {showTiers && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Tier</span>
              <select
                value={tier ?? ""}
                onChange={(e) => setTier(e.target.value || null)}
                className="min-w-[11rem] rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All tiers</option>
                {tiers.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
      {children}
    </FilterContext.Provider>
  );
}

/** One league table: hidden when another league or a tier it doesn't have is picked */
export function FilteredLeague({
  name,
  tiers,
  children,
}: {
  /** The table's league */
  name: string;
  tiers: string[];
  children: React.ReactNode;
}) {
  return shows(useStandingsFilter(), name, tiers) ? <>{children}</> : null;
}

/** A section (League, Tiering, Playoffs…): hidden when none of its tables match */
export function FilteredSection({
  tables,
  children,
}: {
  tables: LeagueTiers[];
  children: React.ReactNode;
}) {
  const filter = useStandingsFilter();
  return tables.some((t) => shows(filter, t.name, t.tiers)) ? <>{children}</> : null;
}
