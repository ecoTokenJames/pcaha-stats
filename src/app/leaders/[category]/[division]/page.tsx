import { notFound } from "next/navigation";
import {
  getFilteredPlayers,
  getDivisionsForCategory,
  getScheduleType,
  type HockeyCategory,
} from "@/lib/data";
import { LeadersTable, type LeaderPlayer } from "@/components/LeadersTable";

const VALID_CATEGORIES: HockeyCategory[] = ["rep", "house", "female"];

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

export default async function LeadersDivisionPage({
  params,
}: {
  params: Promise<{ category: string; division: string }>;
}) {
  const { category, division } = await params;
  const divName = division.toUpperCase();

  if (!VALID_CATEGORIES.includes(category as HockeyCategory)) {
    notFound();
  }

  // Get ALL players (both regular season and playoffs)
  const players = getFilteredPlayers(divName, category as HockeyCategory);

  // Add scheduleType field and filter to min 3 GP
  const qualifiedPlayers: LeaderPlayer[] = players
    .filter((p) => p.gamesPlayed >= 3)
    .map((p) => ({
      ...p,
      scheduleType: getScheduleType(p.scheduleName),
    }));

  if (qualifiedPlayers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No player stats available for {divName} {category}.
      </div>
    );
  }

  return <LeadersTable players={qualifiedPlayers} />;
}
