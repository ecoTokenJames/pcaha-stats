import type { Metadata } from "next";
import { getAllTournaments, getTournamentPlayers } from "@/lib/data";
import { TournamentView } from "@/components/TournamentView";

export const metadata: Metadata = {
  title: "Tournaments",
  description:
    "Tournament standings and player stats for PCAHA minor hockey tournaments in the 2025-26 season.",
};

export default function TournamentsPage() {
  const tournaments = getAllTournaments();

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No tournament data available.
      </div>
    );
  }

  // Pre-load player stats for each tournament
  const tournamentData = tournaments.map((t) => ({
    ...t,
    players: getTournamentPlayers(t.scheduleId),
  }));

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Tournaments</h2>
      <TournamentView tournaments={tournamentData} />
    </div>
  );
}
