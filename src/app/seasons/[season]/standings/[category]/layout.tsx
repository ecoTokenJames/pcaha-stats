import { notFound } from "next/navigation";
import { getDivisionsForCategory, SEASON, seasonBase, type HockeyCategory } from "@/lib/data";
import { DivisionTabs } from "@/components/DivisionTabs";

const VALID_CATEGORIES: HockeyCategory[] = ["rep", "house", "female"];

export default async function CategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ season: string; category: string }>;
}) {
  const { season, category } = await params;

  if (!VALID_CATEGORIES.includes(category as HockeyCategory)) {
    notFound();
  }

  const divisions = getDivisionsForCategory(category as HockeyCategory, season);

  return (
    <div>
      <DivisionTabs divisions={divisions} basePath={`${seasonBase(season)}/standings/${category}`} current={SEASON} />
      {children}
    </div>
  );
}
