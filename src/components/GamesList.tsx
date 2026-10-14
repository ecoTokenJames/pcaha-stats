"use client";

import { useState } from "react";
import Link from "next/link";
import type { GameView } from "@/lib/data";

const RESULTS_PAGE = 10;
const UPCOMING_SHOWN = 5;

/**
 * Latest results (newest first) and the next few games for one tier/group.
 */
export function GamesList({
  games,
  teamLinkBase,
}: {
  games: GameView[];
  teamLinkBase?: string;
}) {
  const [shown, setShown] = useState(RESULTS_PAGE);

  // games arrive newest first
  const results = games.filter((g) => g.status === "final");
  const awaiting = games.filter((g) => g.status === "awaiting");
  const upcoming = games
    .filter((g) => g.status === "scheduled" || g.status === "postponed")
    .reverse()
    .slice(0, UPCOMING_SHOWN);

  if (results.length === 0 && awaiting.length === 0 && upcoming.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-sm text-gray-500">
        No games scheduled yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {(results.length > 0 || awaiting.length > 0) && (
        <section>
          <h5 className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Latest results
          </h5>
          <ul>
            {awaiting.map((g) => (
              <GameItem key={g.id} game={g} teamLinkBase={teamLinkBase} />
            ))}
            {results.slice(0, shown).map((g) => (
              <GameItem key={g.id} game={g} teamLinkBase={teamLinkBase} />
            ))}
          </ul>
          {shown < results.length && (
            <div className="px-4 py-2">
              <button
                onClick={() => setShown((n) => n + RESULTS_PAGE)}
                className="text-sm font-medium text-blue-700 hover:text-blue-900"
              >
                Show more results ({results.length - shown} more)
              </button>
            </div>
          )}
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h5 className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Upcoming
          </h5>
          <ul>
            {upcoming.map((g) => (
              <GameItem key={g.id} game={g} teamLinkBase={teamLinkBase} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function GameItem({
  game,
  teamLinkBase,
}: {
  game: GameView;
  teamLinkBase?: string;
}) {
  const final = game.status === "final";
  const homeWon = final && game.homeScore! > game.awayScore!;
  const awayWon = final && game.awayScore! > game.homeScore!;

  let note: string | null = null;
  if (game.status === "awaiting") note = "Awaiting score";
  else if (game.status === "postponed") note = "Postponed";
  else if (final && game.decidedBy) note = game.decidedBy;

  return (
    <li className="px-4 py-2.5 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <TeamLine
            name={game.awayTeamName}
            teamId={game.awayTeamId}
            score={game.awayScore}
            won={awayWon}
            final={final}
            teamLinkBase={teamLinkBase}
          />
          <TeamLine
            name={game.homeTeamName}
            teamId={game.homeTeamId}
            score={game.homeScore}
            won={homeWon}
            final={final}
            teamLinkBase={teamLinkBase}
          />
        </div>
        {note && (
          <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
            {note}
          </span>
        )}
      </div>
      <div className="mt-1 text-xs text-gray-400">
        {[game.when, game.arena].filter(Boolean).join(" · ")}
      </div>
    </li>
  );
}

function TeamLine({
  name,
  teamId,
  score,
  won,
  final,
  teamLinkBase,
}: {
  name: string;
  teamId: number;
  score: number | null;
  won: boolean;
  final: boolean;
  teamLinkBase?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={`truncate ${won ? "font-semibold text-gray-900" : "text-gray-700"}`}
      >
        {teamLinkBase ? (
          <Link
            href={`${teamLinkBase}/${teamId}`}
            className="hover:text-blue-700 hover:underline"
          >
            {name}
          </Link>
        ) : (
          name
        )}
      </span>
      {final && (
        <span
          className={`tabular-nums ${won ? "font-bold text-gray-900" : "text-gray-500"}`}
        >
          {score}
        </span>
      )}
    </div>
  );
}
