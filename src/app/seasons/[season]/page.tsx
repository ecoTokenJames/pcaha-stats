import { ALL_SEASONS } from "@/lib/data";
import { redirect } from "next/navigation";
import { seasonBase } from "@/lib/data";

export function generateStaticParams() {
  return ALL_SEASONS.map((season) => ({ season }));
}

export default async function SeasonIndex({ params }: { params: Promise<{ season: string }> }) {
  const { season } = await params;
  redirect(`${seasonBase(season)}/standings`);
}
