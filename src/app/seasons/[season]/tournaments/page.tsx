import type { Metadata } from "next";
import { ALL_SEASONS, getTournamentEvents, SEASON, seasonBase } from "@/lib/data";
import { pacificToday } from "@/lib/tournament-groups";
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
  const events = getTournamentEvents(season);
  const heading = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-2xl font-bold text-gray-900">Tournaments</h2>
      <SeasonPicker seasons={ALL_SEASONS} current={SEASON} season={season} />
    </div>
  );

  if (events.length === 0) {
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
  const summaries = events.map((e) => ({
    id: e.id,
    name: e.name,
    divisionName: e.divisionName,
    categories: e.categoryNames.join(", "),
    teamCount: e.teamCount,
    groupCount: e.groups.length,
    startDate: e.startDate,
    endDate: e.endDate,
    when:
      e.startDate && e.endDate
        ? e.startDate === e.endDate
          ? formatDay(e.startDate)
          : `${formatDay(e.startDate)} – ${formatDay(e.endDate)}`
        : "",
  }));

  return (
    <div>
      {heading}
      <TournamentView
        tournaments={summaries}
        basePath={`${seasonBase(season)}/tournaments`}
        builtOn={pacificToday()}
      />
    </div>
  );
}
