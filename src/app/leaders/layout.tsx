import { CategoryTabs } from "@/components/CategoryTabs";

export default function LeadersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">League Leaders</h2>
      <CategoryTabs basePath="/leaders" />
      {children}
    </div>
  );
}
