import { redirect } from "next/navigation";
import { getDivisionsForCategory, type HockeyCategory } from "@/lib/data";

export default async function LeadersCategoryIndex({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const divisions = getDivisionsForCategory(category as HockeyCategory);

  if (divisions.length > 0) {
    redirect(`/leaders/${category}/${divisions[0].name.toLowerCase()}`);
  }

  return (
    <div className="text-center py-12 text-gray-500">
      No player data available for this category.
    </div>
  );
}
