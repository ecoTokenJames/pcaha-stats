import { ALL_SEASONS } from "@/lib/data";
import { redirect } from "next/navigation";
import { getDivisionsForCategory, seasonBase } from "@/lib/data";

export function generateStaticParams() {
  return ALL_SEASONS.map((season) => ({ season }));
}

export default async function LeadersIndex({ params }: { params: Promise<{ season: string }> }) {
  const { season } = await params;
  const base = `${seasonBase(season)}/leaders`;
  const repDivisions = getDivisionsForCategory("rep", season);
  if (repDivisions.length > 0) {
    redirect(`${base}/rep/${repDivisions[0].name.toLowerCase()}`);
  }
  const houseDivisions = getDivisionsForCategory("house", season);
  if (houseDivisions.length > 0) {
    redirect(`${base}/house/${houseDivisions[0].name.toLowerCase()}`);
  }
  return (
    <div className="text-center py-12 text-gray-500">
      No player data available.
    </div>
  );
}
