"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { SearchPlayer, SearchTeam } from "@/app/search-index.json/route";

const MAX_RESULTS = 25;

/** Lowercase, strip accents and punctuation so "St. Mary's" matches "st marys". */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9#\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Every word in the query appears somewhere in the text. */
function matches(text: string, words: string[]): boolean {
  return words.every((w) => text.includes(w));
}

export function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [index, setIndex] = useState<{
    teams: SearchTeam[];
    players: SearchPlayer[];
  } | null>(null);
  const [failed, setFailed] = useState(false);

  // Load the index once, when the page opens
  useEffect(() => {
    fetch("/search-index.json")
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => setFailed(true));
  }, []);

  const words = useMemo(() => normalize(query).split(" ").filter(Boolean), [query]);

  const results = useMemo(() => {
    if (!index || words.length === 0) return { teams: [], players: [] };
    const teams = index.teams
      .filter((t) => matches(normalize(`${t.name} ${t.label}`), words))
      .slice(0, MAX_RESULTS);
    const players = [];
    for (const [name, number, teamIdx] of index.players) {
      const team = index.teams[teamIdx];
      if (matches(normalize(`${name} #${number} ${team.name} ${team.label}`), words)) {
        players.push({ name, number, team });
        if (players.length >= MAX_RESULTS) break;
      }
    }
    return { teams, players };
  }, [index, words]);

  return (
    <div>
      <input
        type="search"
        autoFocus
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          // Keep the query in the URL so a search can be shared or reloaded
          const q = e.target.value.trim();
          router.replace(q ? `/search?q=${encodeURIComponent(q)}` : "/search", {
            scroll: false,
          });
        }}
        placeholder="Team or player name, e.g. Burnaby U11 A1 or Smith"
        aria-label="Search teams and players"
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {failed && (
        <p className="mt-4 text-sm text-red-700">Search couldn&apos;t load. Please refresh the page.</p>
      )}
      {!index && !failed && words.length > 0 && (
        <p className="mt-4 text-sm text-gray-500">Loading…</p>
      )}

      {index && words.length > 0 && (
        <div className="mt-6 space-y-6">
          <ResultSection
            title="Teams"
            count={results.teams.length}
            empty="No teams match."
          >
            {results.teams.map((t) => (
              <li key={t.id}>
                <Link href={t.href} className="block px-4 py-2.5 hover:bg-blue-50/50">
                  <div className="font-medium text-gray-900 text-sm">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.label}</div>
                </Link>
              </li>
            ))}
          </ResultSection>

          <ResultSection
            title="Players"
            count={results.players.length}
            empty="No players match."
          >
            {results.players.map((p, i) => (
              <li key={`${p.team.id}-${p.name}-${i}`}>
                <Link href={p.team.href} className="block px-4 py-2.5 hover:bg-blue-50/50">
                  <div className="font-medium text-gray-900 text-sm">
                    {p.name}
                    {p.number > 0 && (
                      <span className="ml-1 text-xs font-normal text-gray-500">#{p.number}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {p.team.name} · {p.team.label}
                  </div>
                </Link>
              </li>
            ))}
          </ResultSection>
        </div>
      )}
    </div>
  );
}

function ResultSection({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-gray-900">
        {title}
        {count >= MAX_RESULTS && (
          <span className="ml-2 text-xs font-normal text-gray-500">
            showing first {MAX_RESULTS}, add more words to narrow it down
          </span>
        )}
      </h3>
      {count === 0 ? (
        <p className="text-sm text-gray-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {children}
        </ul>
      )}
    </section>
  );
}
