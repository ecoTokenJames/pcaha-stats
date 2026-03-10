import { getLeaders, getActiveDivisions } from "@/lib/data";
import { LeadersView } from "@/components/LeadersView";

export default function LeadersPage() {
  const leaders = getLeaders();
  const divisions = getActiveDivisions();
  divisions.sort((a, b) => {
    const numA = parseInt(a.name.replace("U", ""));
    const numB = parseInt(b.name.replace("U", ""));
    return numA - numB;
  });

  // Only show divisions that have leader data
  const divisionsWithLeaders = divisions.filter((d) => leaders[d.name]);

  if (divisionsWithLeaders.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          League Leaders
        </h2>
        <div className="text-center py-12 text-gray-500">
          No player stats available yet. Run a full scrape to generate leader
          data.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">League Leaders</h2>
      <LeadersView leaders={leaders} divisions={divisionsWithLeaders} />
    </div>
  );
}
