import { getDivisionsForCategory, type HockeyCategory } from "@/lib/data";
import { DivisionTabs } from "@/components/DivisionTabs";

const VALID_CATEGORIES: HockeyCategory[] = ["rep", "house", "female"];

export default async function LeadersCategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;

  if (!VALID_CATEGORIES.includes(category as HockeyCategory)) {
    return (
      <div className="text-center py-12 text-gray-500">Invalid category.</div>
    );
  }

  const divisions = getDivisionsForCategory(category as HockeyCategory);

  return (
    <div>
      <DivisionTabs divisions={divisions} basePath={`/leaders/${category}`} />
      {children}
    </div>
  );
}
