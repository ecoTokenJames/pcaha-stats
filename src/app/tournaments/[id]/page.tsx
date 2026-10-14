import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getAllTournaments,
  getDivisionGames,
  getTournamentPlayers,
  toGameView,
  SEASON,
} from "@/lib/data";
import { TournamentDetail } from "@/components/TournamentDetail";

// Only tournaments that exist in the data; anything else 404s
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllTournaments().map((t) => ({ id: String(t.scheduleId) }));
}

function findTournament(id: string) {
  return getAllTournaments().find((t) => String(t.scheduleId) === id);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const t = findTournament(id);
  if (!t) return { title: "Tournament Not Found" };
  const description = `${t.scheduleName} (${t.divisionName}): standings, scores and player stats for the ${SEASON} season.`;
  return {
    title: t.scheduleName,
    description,
    alternates: { canonical: `/tournaments/${id}` },
    openGraph: { title: `${t.scheduleName} | PCAHA Stats`, description, images: ["/opengraph-image"] },
  };
}

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = findTournament(id);
  if (!t) notFound();

  const games = (getDivisionGames(t.divisionName)[id] ?? []).map(toGameView);

  return (
    <div className="space-y-4">
      <Link
        href="/tournaments"
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
          players: getTournamentPlayers(t.scheduleId).map((p) => ({
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
