import { CategoryTabs } from "@/components/CategoryTabs";
import { SeasonPicker } from "@/components/SeasonPicker";
import { ALL_SEASONS, SEASON, seasonBase } from "@/lib/data";

export default async function LeadersLayout({
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
        <h2 className="text-2xl font-bold text-gray-900">League Leaders</h2>
        <SeasonPicker seasons={ALL_SEASONS} current={SEASON} season={season} />
      </div>
      <CategoryTabs basePath={`${seasonBase(season)}/leaders`} current={SEASON} />
      {children}
    </div>
  );
}
