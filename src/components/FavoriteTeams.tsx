"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { getFavorites } from "@/lib/favorites";
import { TeamStar } from "./FavoriteStar";
import type { IndexTeam } from "@/app/teams-index.json/route";

const CHANGE_EVENT = "pcaha-favorites-change";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Starred team ids, as a string so the snapshot stays the same between reads */
const starredSnapshot = () => getFavorites().teams.join(",");

let teamsPromise: Promise<IndexTeam[]> | null = null;
function loadTeams(): Promise<IndexTeam[]> {
  teamsPromise ??= fetch("/teams-index.json")
    .then((r) => (r.ok ? r.json() : { teams: [] }))
    .then((d: { teams: IndexTeam[] }) => d.teams)
    .catch(() => {
      teamsPromise = null;
      return [];
    });
  return teamsPromise;
}

/**
 * The teams someone starred (saved in this browser), as quick links. On the home
 * page it explains how to add teams when there are none yet; elsewhere it shows
 * nothing until a team is starred.
 */
export function FavoriteTeams({ showHint = false }: { showHint?: boolean }) {
  const ids = useSyncExternalStore(subscribe, starredSnapshot, () => "");
  const [teams, setTeams] = useState<IndexTeam[] | null>(null);

  useEffect(() => {
    if (!ids) return;
    let live = true;
    loadTeams().then((all) => {
      if (live) setTeams(all);
    });
    return () => {
      live = false;
    };
  }, [ids]);

  const starred = ids
    ? ids
        .split(",")
        .map(Number)
        .map((id) => teams?.find((t) => t.id === id))
        .filter((t): t is IndexTeam => Boolean(t))
    : [];

  if (!ids) {
    return showHint ? (
      <p className="mb-4 text-sm text-gray-500">
        Tip: tap the ☆ next to any team in the standings to keep it in a{" "}
        <span className="font-medium text-gray-700">Your teams</span> list here.
      </p>
    ) : null;
  }
  // Starred teams from another season (or still loading) aren't listed
  if (starred.length === 0) return null;

  return (
    <section aria-label="Your teams" className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        <span className="text-yellow-400" aria-hidden="true">★</span> Your teams
      </h3>
      <ul className="flex flex-wrap gap-2">
        {starred.map((t) => (
          <li
            key={t.id}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 py-1 pl-2.5 pr-2 text-sm"
          >
            <Link href={t.href} className="font-medium text-blue-900 hover:underline" title={t.name}>
              {t.short ?? t.name}
            </Link>
            <span className="text-xs text-gray-500">{t.label}</span>
            <TeamStar teamId={t.id} />
          </li>
        ))}
      </ul>
    </section>
  );
}
