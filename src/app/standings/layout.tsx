import Link from "next/link";
import { getActiveDivisions } from "@/lib/data";
import { DivisionTabs } from "@/components/DivisionTabs";

export default function StandingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const divisions = getActiveDivisions();
  divisions.sort((a, b) => {
    const numA = parseInt(a.name.replace("U", ""));
    const numB = parseInt(b.name.replace("U", ""));
    return numA - numB;
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Standings</h2>
      <DivisionTabs divisions={divisions} basePath="/standings" />
      {children}
    </div>
  );
}
