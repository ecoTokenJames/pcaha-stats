import type { Metadata } from "next";
import { ALL_SEASONS, getAllTournaments, getSchedulePhase, SEASON, seasonBase } from "@/lib/data";
import { TournamentView } from "@/components/TournamentView";
import { SeasonPicker } from "@/components/SeasonPicker";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  return {
    title: season === SEASON ? "Tournaments" : `Tournaments ${season}`,
    description: `Tournament standings and player stats for PCAHA minor hockey tournaments in the ${season} season.`,
    alternates: { canonical: `${seasonBase(season)}/tournaments` },
  };
}

function formatDay(ymd: string): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function generateStaticParams() {
  return ALL_SEASONS.map((season) => ({ season }));
}

export default async function TournamentsPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  const tournaments = getAllTournaments(season);
  const heading = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-2xl font-bold text-gray-900">Tournaments</h2>
      <SeasonPicker seasons={ALL_SEASONS} current={SEASON} season={season} />
    </div>
  );

  if (tournaments.length === 0) {
    return (
      <div>
        {heading}
        <div className="text-center py-12 text-gray-500">
          No tournament data available.
        </div>
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
      {heading}
      <TournamentView tournaments={summaries} basePath={`${seasonBase(season)}/tournaments`} />
    </div>
  );
}
