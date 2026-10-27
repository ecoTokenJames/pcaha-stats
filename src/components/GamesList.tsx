"use client";

import { useState } from "react";
import Link from "next/link";
import type { GameView } from "@/lib/data";
import { TeamName } from "./TeamName";

const RESULTS_PAGE = 10;
const UPCOMING_SHOWN = 5;

/**
 * Latest results (newest first) and the next few games for one tier/group.
 */
export function GamesList({
  games,
  teamLinkBase,
  linkableTeamIds,
  showContext = false,
  emptyText = "No games scheduled yet.",
}: {
  games: GameView[];
  teamLinkBase?: string;
  /** Only link teams that have a page here; links everyone when omitted */
  linkableTeamIds?: number[];
  /** Show which schedule/tier each game was in (team page) */
  showContext?: boolean;
  emptyText?: string;
}) {
  const [page, setPage] = useState(0);
  const linkable = linkableTeamIds ? new Set(linkableTeamIds) : null;
  const linkFor = (teamId: number) =>
    teamLinkBase && (!linkable || linkable.has(teamId))
      ? `${teamLinkBase}/${teamId}`
      : undefined;

  // games arrive newest first
  const results = games.filter((g) => g.status === "final");
  const awaiting = games.filter((g) => g.status === "awaiting");
  const upcoming = games
    .filter((g) => g.status === "scheduled" || g.status === "postponed")
    .reverse()
    .slice(0, UPCOMING_SHOWN);
  const pageCount = Math.ceil(results.length / RESULTS_PAGE);
  const currentPage = Math.min(page, Math.max(pageCount - 1, 0));

  if (results.length === 0 && awaiting.length === 0 && upcoming.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-sm text-gray-500">
        {emptyText}
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
              <GameItem key={g.id} game={g} linkFor={linkFor} showContext={showContext} />
            ))}
            {results
              .slice(currentPage * RESULTS_PAGE, (currentPage + 1) * RESULTS_PAGE)
              .map((g) => (
                <GameItem key={g.id} game={g} linkFor={linkFor} showContext={showContext} />
              ))}
          </ul>
          {pageCount > 1 && (
            <nav
              aria-label="Results pages"
              className="flex items-center justify-between px-4 py-2 text-sm"
            >
              <button
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 0}
                className="font-medium text-blue-700 hover:text-blue-900 disabled:text-gray-300"
              >
                ← Newer
              </button>
              <span className="text-xs text-gray-500">
                Page {currentPage + 1} of {pageCount}
              </span>
              <button
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= pageCount - 1}
                className="font-medium text-blue-700 hover:text-blue-900 disabled:text-gray-300"
              >
                Older →
              </button>
            </nav>
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
              <GameItem key={g.id} game={g} linkFor={linkFor} showContext={showContext} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function GameItem({
  game,
  linkFor,
  showContext,
}: {
  game: GameView;
  linkFor: (teamId: number) => string | undefined;
  showContext: boolean;
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
        <div className="min-w-0 flex-1">
          <TeamLine
            name={game.awayTeamName}
            short={game.awayShort}
            score={game.awayScore}
            won={awayWon}
            final={final}
            href={linkFor(game.awayTeamId)}
          />
          <TeamLine
            name={game.homeTeamName}
            short={game.homeShort}
            score={game.homeScore}
            won={homeWon}
            final={final}
            href={linkFor(game.homeTeamId)}
          />
        </div>
        {note && (
          <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
            {note}
          </span>
        )}
      </div>
      <div className="mt-1 text-xs text-gray-500">
        {[
          game.when,
          game.arena,
          showContext &&
            [game.scheduleName, game.groupName].filter(Boolean).join(" – "),
        ]
          .filter(Boolean)
          .join(" · ")}
      </div>
    </li>
  );
}

function TeamLine({
  name,
  short,
  score,
  won,
  final,
  href,
}: {
  name: string;
  short?: string;
  score: number | null;
  won: boolean;
  final: boolean;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={`truncate ${won ? "font-semibold text-gray-900" : "text-gray-700"}`}
      >
        {href ? (
          <Link
            href={href}
            className="inline-block py-1 hover:text-blue-700 hover:underline"
          >
            <TeamName name={name} short={short} />
          </Link>
        ) : (
          <TeamName name={name} short={short} />
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
