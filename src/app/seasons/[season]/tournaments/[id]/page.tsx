import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getAllTournaments,
  getDivisionGames,
  getTournamentPlayers,
  toGameView,
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
  return getAllTournaments(season).map((t) => ({ season, id: String(t.scheduleId) }));
}

function findTournament(id: string, season: string) {
  return getAllTournaments(season).find((t) => String(t.scheduleId) === id);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string; id: string }>;
}): Promise<Metadata> {
  const { season, id } = await params;
  const t = findTournament(id, season);
  if (!t) return { title: "Tournament Not Found" };
  const description = `${t.scheduleName} (${t.divisionName}): standings, scores and player stats for the ${season} season.`;
  return {
    title: season === SEASON ? t.scheduleName : `${t.scheduleName} (${season})`,
    description,
    alternates: { canonical: `${seasonBase(season)}/tournaments/${id}` },
    openGraph: { title: `${t.scheduleName} | PCAHA Stats`, description, images: ["/opengraph-image"] },
  };
}

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ season: string; id: string }>;
}) {
  const { season, id } = await params;
  const t = findTournament(id, season);
  if (!t) notFound();

  const rawGames = getDivisionGames(t.divisionName, season)[id] ?? [];
  const shortNames = shortTeamNames([
    ...t.teams,
    ...rawGames.flatMap((g) => [
      { teamId: g.homeTeamId, teamName: g.homeTeamName },
      { teamId: g.awayTeamId, teamName: g.awayTeamName },
    ]),
  ]);
  const games = rawGames.map((g) => withShortNames(toGameView(g), shortNames));

  return (
    <div className="space-y-4">
      <Link
        href={`${seasonBase(season)}/tournaments`}
        className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 hover:underline"
      >
        ← All tournaments
      </Link>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 break-words">{t.scheduleName}</h2>
        <p className="text-sm text-gray-500">{t.divisionName}</p>
      </div>
      <TournamentDetail
        tournament={{
          ...t,
          teams: t.teams.map((team) => ({ ...team, shortName: shortNames.get(team.teamId) })),
          players: getTournamentPlayers(t.scheduleId, season).map((p) => ({
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
          })),
        }}
        games={games}
      />
    </div>
  );
}
