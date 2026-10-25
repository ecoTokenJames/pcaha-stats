import { notFound } from "next/navigation";
import { ALL_SEASONS, SEASON } from "@/lib/data";
import { PastSeasonBanner } from "@/components/PastSeasonBanner";

// The current season's pages are served at /standings, /leaders and /tournaments
// (rewritten here in next.config.ts); past seasons at /seasons/<season>/...
// Each page lists the params it builds ahead; unknown seasons 404 here.

export default async function SeasonLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  if (!ALL_SEASONS.includes(season)) notFound();

  return (
    <>
      {season !== SEASON && <PastSeasonBanner season={season} current={SEASON} />}
      {children}
    </>
  );
}
