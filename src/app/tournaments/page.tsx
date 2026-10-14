import type { Metadata } from "next";
import { getAllTournaments, getSchedulePhase, SEASON } from "@/lib/data";
import { TournamentView } from "@/components/TournamentView";

export const metadata: Metadata = {
  title: "Tournaments",
  description:
    `Tournament standings and player stats for PCAHA minor hockey tournaments in the ${SEASON} season.`,
  alternates: { canonical: "/tournaments" },
};

function formatDay(ymd: string): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function TournamentsPage() {
  const tournaments = getAllTournaments();

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No tournament data available.
      </div>
    );
  }

  // Just the list; each tournament's standings, games and players are on its own page
  const summaries = tournaments.map((t) => ({
    scheduleId: t.scheduleId,
    scheduleName: t.scheduleName,
    divisionName: t.divisionName,
    teamCount: new Set(t.teams.map((team) => team.teamId)).size,
    when:
      t.startDate && t.endDate
        ? t.startDate === t.endDate
          ? formatDay(t.startDate)
          : `${formatDay(t.startDate)} – ${formatDay(t.endDate)}`
        : "",
    phase: getSchedulePhase(t),
  }));

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Tournaments</h2>
      <TournamentView tournaments={summaries} />
    </div>
  );
}
