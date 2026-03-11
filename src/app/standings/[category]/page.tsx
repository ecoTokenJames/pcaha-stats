import { redirect } from "next/navigation";
import { getDivisionsForCategory, type HockeyCategory } from "@/lib/data";

export default async function CategoryIndex({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const divisions = getDivisionsForCategory(category as HockeyCategory);

  if (divisions.length > 0) {
    redirect(`/standings/${category}/${divisions[0].name.toLowerCase()}`);
  }

  return (
    <div className="text-center py-12 text-gray-500">
      No standings data available for this category.
    </div>
  );
}
