import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import {
  findTournamentEvent,
  getTournamentEventGames,
  getTournamentEventPlayers,
  getTournamentEvents,
  withShortNames,
  SEASON,
  seasonBase,
} from "@/lib/data";
import { TournamentDetail } from "@/components/TournamentDetail";
import { shortTeamNames } from "@/lib/team-names";

// Only tournaments that exist in the data; anything else 404s.
// This season's pages are built ahead; past seasons' are built on first visit and kept
export const dynamicParams = true;

export function generateStaticParams() {
  const season = SEASON;
  return getTournamentEvents(season).map((e) => ({ season, id: String(e.id) }));
}

function formatDay(ymd: string): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string; id: string }>;
}): Promise<Metadata> {
  const { season, id } = await params;
  const e = findTournamentEvent(id, season);
  if (!e) return { title: "Tournament Not Found" };
  const title = `${e.name} (${e.divisionName})`;
  const description = `${e.name} (${e.divisionName}): standings, scores and player stats for the ${season} season.`;
  return {
    title: season === SEASON ? title : `${title} ${season}`,
    description,
    alternates: { canonical: `${seasonBase(season)}/tournaments/${e.id}` },
    openGraph: { title: `${title} | PCAHA Stats`, description, images: ["/opengraph-image"] },
  };
}

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ season: string; id: string }>;
}) {
  const { season, id } = await params;
  const event = findTournamentEvent(id, season);
  if (!event) notFound();
  // Each tier/pool used to have its own page; they now all live on the tournament's page
  if (String(event.id) !== id) permanentRedirect(`${seasonBase(season)}/tournaments/${event.id}`);

  const rawGames = getTournamentEventGames(event, season);
  const shortNames = shortTeamNames([
    ...event.groups.flatMap((g) => g.teams),
    ...rawGames.flatMap((g) => [
      { teamId: g.homeTeamId, teamName: g.homeTeamName },
      { teamId: g.awayTeamId, teamName: g.awayTeamName },
    ]),
  ]);
  const games = rawGames.map((g) => withShortNames(g, shortNames));
  const when =
    event.startDate && event.endDate
      ? event.startDate === event.endDate
        ? formatDay(event.startDate)
        : `${formatDay(event.startDate)} – ${formatDay(event.endDate)}`
      : "";

  return (
    <div className="space-y-4">
      <Link
        href={`${seasonBase(season)}/tournaments`}
        className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 hover:underline"
      >
        ← All tournaments
      </Link>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 break-words">{event.name}</h2>
        <p className="text-sm text-gray-500">
          {[event.divisionName, event.categoryNames.join(", "), when].filter(Boolean).join(" · ")}
        </p>
      </div>
      <TournamentDetail
        groups={event.groups.map((g) => ({
          label: g.label,
          note: g.note,
          teams: g.teams.map((team) => ({ ...team, shortName: shortNames.get(team.teamId) })),
        }))}
        players={getTournamentEventPlayers(event, season).map((p) => ({
          participantId: p.participantId,
          teamId: p.teamId,
          name: p.name,
          number: p.number,
          position: p.position,
          gamesPlayed: p.gamesPlayed,
          goals: p.goals,
          assists: p.assists,
          points: p.points,
          pim: p.pim,
        }))}
        games={games}
      />
    </div>
  );
}
