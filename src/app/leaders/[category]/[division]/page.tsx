import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getFilteredPlayers,
  getDivisionsForCategory,
  getScheduleType,
  getTeamGroupLookup,
  getAvailableGroups,
  type HockeyCategory,
} from "@/lib/data";
import { LeadersTable, type LeaderPlayer } from "@/components/LeadersTable";

const VALID_CATEGORIES: HockeyCategory[] = ["rep", "house", "female"];

const CATEGORY_LABELS: Record<string, string> = {
  rep: "Rep",
  house: "House",
  female: "Female",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; division: string }>;
}): Promise<Metadata> {
  const { category, division } = await params;
  const divName = division.toUpperCase();
  const catLabel = CATEGORY_LABELS[category] || category;
  const title = `${divName} ${catLabel} Scoring Leaders`;
  const description = `Top scorers and scoring leaders for ${divName} ${catLabel} hockey in the 2025-26 PCAHA season. View points, goals, assists, and penalty minutes.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | PCAHA Stats`,
      description,
    },
  };
}

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

  // Build team → group lookup from League standings for tier filtering
  const groupLookup = getTeamGroupLookup(divName, category as HockeyCategory);
  const availableGroups = getAvailableGroups(divName, category as HockeyCategory);

  // Add scheduleType + groupName fields and filter to min 3 GP
  const qualifiedPlayers: LeaderPlayer[] = players
    .filter((p) => p.gamesPlayed >= 3)
    .map((p) => ({
      ...p,
      scheduleType: getScheduleType(p.scheduleName),
      groupName: groupLookup.get(p.teamId) ?? null,
    }));

  // Check if any tournament data exists for this division
  const hasTournaments = qualifiedPlayers.some(
    (p) => p.scheduleType === "Tournament"
  );

  if (qualifiedPlayers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No player stats available for {divName} {category}.
      </div>
    );
  }

  return (
    <LeadersTable
      players={qualifiedPlayers}
      groups={availableGroups}
      hasTournaments={hasTournaments}
    />
  );
}
