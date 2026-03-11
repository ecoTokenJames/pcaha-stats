import { redirect } from "next/navigation";
import { getDivisionsForCategory } from "@/lib/data";

export default function LeadersIndex() {
  const repDivisions = getDivisionsForCategory("rep");
  if (repDivisions.length > 0) {
    redirect(`/leaders/rep/${repDivisions[0].name.toLowerCase()}`);
  }
  const houseDivisions = getDivisionsForCategory("house");
  if (houseDivisions.length > 0) {
    redirect(`/leaders/house/${houseDivisions[0].name.toLowerCase()}`);
  }
  return (
    <div className="text-center py-12 text-gray-500">
      No player data available.
    </div>
  );
}
