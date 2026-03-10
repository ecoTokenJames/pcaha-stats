import { redirect } from "next/navigation";
import { getActiveDivisions } from "@/lib/data";

export default function StandingsIndex() {
  const divisions = getActiveDivisions();
  divisions.sort((a, b) => {
    const numA = parseInt(a.name.replace("U", ""));
    const numB = parseInt(b.name.replace("U", ""));
    return numA - numB;
  });

  if (divisions.length > 0) {
    redirect(`/standings/${divisions[0].name.toLowerCase()}`);
  }

  return (
    <div className="text-center py-12 text-gray-500">
      No standings data available yet.
    </div>
  );
}
