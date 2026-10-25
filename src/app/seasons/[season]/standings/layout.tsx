import { CategoryTabs } from "@/components/CategoryTabs";
import { SeasonPicker } from "@/components/SeasonPicker";
import { ALL_SEASONS, SEASON, seasonBase } from "@/lib/data";

export default async function StandingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold text-gray-900">Standings</h2>
        <SeasonPicker seasons={ALL_SEASONS} current={SEASON} season={season} />
      </div>
      <CategoryTabs basePath={`${seasonBase(season)}/standings`} current={SEASON} />
      {children}
    </div>
  );
}
