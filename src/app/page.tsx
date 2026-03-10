import { getActiveDivisions, getAllStandings, getScrapeInfo } from "@/lib/data";
import { DivisionGrid } from "@/components/DivisionGrid";

export default function Home() {
  const divisions = getActiveDivisions();
  const standings = getAllStandings();
  const scrapeInfo = getScrapeInfo();

  // Calculate stats per division
  const divisionStats = divisions.map((div) => {
    const divSchedules = Object.values(standings).filter(
      (s) => s.divisionName === div.name
    );
    const totalTeams = divSchedules.reduce(
      (sum, s) => sum + s.teams.length,
      0
    );
    const totalSchedules = divSchedules.length;
    return { ...div, totalTeams, totalSchedules };
  });

  // Sort divisions by age (U9, U10, ... U18)
  divisionStats.sort((a, b) => {
    const numA = parseInt(a.name.replace("U", ""));
    const numB = parseInt(b.name.replace("U", ""));
    return numA - numB;
  });

  const totalTeams = Object.values(standings).reduce(
    (sum, s) => sum + s.teams.length,
    0
  );
  const totalSchedules = Object.keys(standings).length;

  return (
    <div>
      {/* Hero */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          2025-26 Season Dashboard
        </h2>
        <p className="text-gray-600">
          Standings and stats for all PCAHA hockey divisions, updated daily.
        </p>

        {/* Quick stats */}
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <div className="text-2xl font-bold text-blue-900">
              {divisions.length}
            </div>
            <div className="text-xs text-gray-500">Divisions</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <div className="text-2xl font-bold text-blue-900">
              {totalSchedules}
            </div>
            <div className="text-xs text-gray-500">Leagues</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <div className="text-2xl font-bold text-blue-900">
              {totalTeams}
            </div>
            <div className="text-xs text-gray-500">Teams</div>
          </div>
          {scrapeInfo && (
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
              <div className="text-sm font-medium text-gray-900">
                {new Date(scrapeInfo.timestamp).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
              <div className="text-xs text-gray-500">Last Updated</div>
            </div>
          )}
        </div>
      </div>

      {/* Division Grid */}
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Select a Division
      </h3>
      <DivisionGrid divisions={divisionStats} />
    </div>
  );
}
