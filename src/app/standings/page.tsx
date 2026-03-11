import { redirect } from "next/navigation";
import { getDivisionsForCategory } from "@/lib/data";

export default function StandingsIndex() {
  const repDivisions = getDivisionsForCategory("rep");
  if (repDivisions.length > 0) {
    redirect(`/standings/rep/${repDivisions[0].name.toLowerCase()}`);
  }
  const houseDivisions = getDivisionsForCategory("house");
  if (houseDivisions.length > 0) {
    redirect(`/standings/house/${houseDivisions[0].name.toLowerCase()}`);
  }
  return (
    <div className="text-center py-12 text-gray-500">
      No standings data available.
    </div>
  );
}
