import { notFound } from "next/navigation";
import {
  getDivisionStandings,
  getActiveDivisions,
  getScheduleType,
  getLeagueAbbrev,
} from "@/lib/data";
import { StandingsTable } from "@/components/StandingsTable";

export function generateStaticParams() {
  const divisions = getActiveDivisions();
  return divisions.map((d) => ({ division: d.name.toLowerCase() }));
}

export default async function DivisionStandingsPage({
  params,
}: {
  params: Promise<{ division: string }>;
}) {
  const { division } = await params;
  const divName = division.toUpperCase();
  const standings = getDivisionStandings(divName);

  if (Object.keys(standings).length === 0) {
    notFound();
  }

  // Group schedules by type (League, Playoffs, Placement, Tournament)
  const grouped: Record<
    string,
    { scheduleId: string; scheduleName: string; categoryName: string }[]
  > = {};
  for (const [schedId, data] of Object.entries(standings)) {
    const type = getScheduleType(data.scheduleName);
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push({
      scheduleId: schedId,
      scheduleName: data.scheduleName,
      categoryName: data.categoryName,
    });
  }

  // Sort order: League first, then Playoffs, Placement, Tournament
  const typeOrder = ["League", "Playoffs", "Placement", "Tournament"];
  const sortedTypes = Object.keys(grouped).sort(
    (a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b)
  );

  return (
    <div className="space-y-8">
      {sortedTypes.map((type) => (
        <div key={type}>
          {sortedTypes.length > 1 && (
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              {type}
              <span className="text-xs font-normal text-gray-400">
                ({grouped[type].length})
              </span>
            </h3>
          )}

          <div className="space-y-6">
            {grouped[type]
              .sort((a, b) => a.scheduleName.localeCompare(b.scheduleName))
              .map(({ scheduleId, scheduleName }) => {
                const data = standings[parseInt(scheduleId)];
                if (!data) return null;
                const abbrev = getLeagueAbbrev(scheduleName);

                return (
                  <div
                    key={scheduleId}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {scheduleName}
                        </h4>
                        {data.categoryName && (
                          <span className="text-xs text-gray-500">
                            {data.categoryName}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                        {abbrev}
                      </span>
                    </div>
                    <StandingsTable teams={data.teams} />
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
