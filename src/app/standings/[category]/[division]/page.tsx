import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getFilteredStandings,
  getDivisionsForCategory,
  getScheduleType,
  getLeagueAbbrev,
  getSchedulePhase,
  type ScheduleStandings,
  type HockeyCategory,
  SEASON,
} from "@/lib/data";
import { StandingsTable } from "@/components/StandingsTable";

const VALID_CATEGORIES: HockeyCategory[] = ["rep", "house", "female"];

const CATEGORY_LABELS: Record<string, string> = {
  rep: "Rep",
  house: "House",
  female: "Female",
};

const SECTION_LABELS: Record<string, string> = {
  Placement: "Tiering (Placement)",
};

function formatDate(ymd: string): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function phaseLabel(s: ScheduleStandings): string | null {
  switch (getSchedulePhase(s)) {
    case "current":
      return `In progress · until ${formatDate(s.endDate!)}`;
    case "upcoming":
      return `Starts ${formatDate(s.startDate!)}`;
    case "finished":
      return "Final";
    default:
      return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; division: string }>;
}): Promise<Metadata> {
  const { category, division } = await params;
  const divName = division.toUpperCase();
  const catLabel = CATEGORY_LABELS[category] || category;
  const title = `${divName} ${catLabel} Standings`;
  const description = `${divName} ${catLabel} hockey standings for the ${SEASON} PCAHA season. View team records, points, goals, and rankings.`;

  return {
    title,
    description,
    alternates: { canonical: `/standings/${category}/${division}` },
    openGraph: {
      title: `${title} | PCAHA Stats`,
      description,
      images: ["/opengraph-image"],
    },
  };
}

// Only the category/division combos that have data; anything else 404s
export const dynamicParams = false;

export function generateStaticParams() {
  const params: { category: string; division: string }[] = [];
  for (const category of VALID_CATEGORIES) {
    const divisions = getDivisionsForCategory(category);
    for (const div of divisions) {
      params.push({ category, division: div.name.toLowerCase() });
    }
  }
  return params;
}

export default async function DivisionStandingsPage({
  params,
}: {
  params: Promise<{ category: string; division: string }>;
}) {
  const { category, division } = await params;
  const divName = division.toUpperCase();

  if (!VALID_CATEGORIES.includes(category as HockeyCategory)) {
    notFound();
  }

  const standings = getFilteredStandings(divName, category as HockeyCategory);

  if (Object.keys(standings).length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No standings data for {divName} {category}.
      </div>
    );
  }

  // Group schedules by type (League, Playoffs, Placement, Tournament)
  const grouped: Record<string, ScheduleStandings[]> = {};
  for (const data of Object.values(standings)) {
    const type = getScheduleType(data);
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(data);
  }

  // Whatever is being played right now goes first (e.g. tiering in the fall,
  // playoffs in the spring), then what's coming up, then what's finished.
  const PHASE_RANK = { current: 0, upcoming: 1, unknown: 1, finished: 2 };
  const scheduleRank = (s: ScheduleStandings) =>
    PHASE_RANK[getSchedulePhase(s)];
  const sectionRank = (type: string) =>
    Math.min(...grouped[type].map(scheduleRank));
  // Among sections that haven't started, the one starting soonest goes first
  const sectionStart = (type: string) =>
    grouped[type].map((s) => s.startDate ?? "").sort()[0] ?? "";
  const typeOrder = ["League", "Playoffs", "Placement", "Tournament"];
  const sortedTypes = Object.keys(grouped).sort(
    (a, b) =>
      sectionRank(a) - sectionRank(b) ||
      (sectionRank(a) === PHASE_RANK.upcoming
        ? sectionStart(a).localeCompare(sectionStart(b))
        : 0) ||
      typeOrder.indexOf(a) - typeOrder.indexOf(b)
  );

  const teamLinkBase = `/standings/${category}/${division}/team`;

  return (
    <div className="space-y-8">
      {sortedTypes.map((type) => (
        <div key={type}>
          {sortedTypes.length > 1 && (
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              {SECTION_LABELS[type] ?? type}
              <span className="text-xs font-normal text-gray-400">
                ({grouped[type].length})
              </span>
            </h3>
          )}

          <div className="space-y-6">
            {grouped[type]
              .sort(
                (a, b) =>
                  scheduleRank(a) - scheduleRank(b) ||
                  a.scheduleName.localeCompare(b.scheduleName)
              )
              .map((data) => {
                const { scheduleId, scheduleName } = data;
                const abbrev = getLeagueAbbrev(scheduleName);
                const status = phaseLabel(data);

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
                        <span className="text-xs text-gray-500">
                          {[data.categoryName, status]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                        {abbrev}
                      </span>
                    </div>
                    <StandingsTable
                      teams={data.teams}
                      teamLinkBase={teamLinkBase}
                    />
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
