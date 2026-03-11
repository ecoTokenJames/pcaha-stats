import { notFound } from "next/navigation";
import {
  getFilteredPlayers,
  getDivisionsForCategory,
  type HockeyCategory,
} from "@/lib/data";
import { LeadersTable } from "@/components/LeadersTable";

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

  const players = getFilteredPlayers(divName, category as HockeyCategory);

  // Filter to players with at least 3 games played
  const qualifiedPlayers = players.filter((p) => p.gamesPlayed >= 3);

  if (qualifiedPlayers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No player stats available for {divName} {category}.
      </div>
    );
  }

  return <LeadersTable players={qualifiedPlayers} />;
}
