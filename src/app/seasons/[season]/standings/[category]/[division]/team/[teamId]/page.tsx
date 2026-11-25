import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getTeamInfo,
  getTeamPlayers,
  getFilteredStandings,
  getDivisionsForCategory,
  getLeagueAbbrev,
  getTeamGamesByType,
  getTeamGames,
  getShortTeamNames,
  withShortNames,
  mergePlayerStats,
  type HockeyCategory,
  SEASON,
  seasonBase,
} from "@/lib/data";
import { TeamRosterTable } from "@/components/TeamRosterTable";
import { GamesList } from "@/components/GamesList";
import { LevelUpCard } from "@/components/LevelUpAd";
import { SponsorStrip } from "@/components/SponsorStrip";
import { DismissibleNote } from "@/components/DismissibleNote";

const VALID_CATEGORIES: HockeyCategory[] = ["rep", "house", "female"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string; category: string; division: string; teamId: string }>;
}): Promise<Metadata> {
  const { season, category, division, teamId: teamIdStr } = await params;
  const divName = division.toUpperCase();
  const teamId = parseInt(teamIdStr);
  const teamInfo = getTeamInfo(divName, teamId, season);

  if (!teamInfo) {
    return { title: "Team Not Found" };
  }

  const title = season === SEASON ? teamInfo.teamName : `${teamInfo.teamName} (${season})`;
  const description = `Player stats and roster for ${teamInfo.teamName} in the ${season} PCAHA ${divName} season.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${seasonBase(season)}/standings/${category}/${division}/team/${teamId}`,
    },
    openGraph: {
      title: `${title} | PCAHA Stats`,
      description,
      images: ["/opengraph-image"],
    },
  };
}

// This season's pages are built ahead; past seasons' are built on first visit and kept
export const dynamicParams = true;

export function generateStaticParams() {
  const season = SEASON;
  const out: { season: string; category: string; division: string; teamId: string }[] = [];
  for (const category of VALID_CATEGORIES) {
    const divisions = getDivisionsForCategory(category, season);
    for (const div of divisions) {
      const standings = getFilteredStandings(
        div.name,
        category as HockeyCategory,
        season
      );
      const seenTeams = new Set<number>();
      for (const data of Object.values(standings)) {
        for (const team of data.teams) {
          if (!seenTeams.has(team.teamId)) {
            seenTeams.add(team.teamId);
            out.push({
              season,
              category,
              division: div.name.toLowerCase(),
              teamId: String(team.teamId),
            });
          }
        }
      }
    }
  }
  return out;
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ season: string; category: string; division: string; teamId: string }>;
}) {
  const { season, category, division, teamId: teamIdStr } = await params;
  const base = seasonBase(season);
  const divName = division.toUpperCase();
  const teamId = parseInt(teamIdStr);

  if (
    !VALID_CATEGORIES.includes(category as HockeyCategory) ||
    isNaN(teamId)
  ) {
    notFound();
  }

  const teamInfo = getTeamInfo(divName, teamId, season);
  const inCategory = Object.values(
    getFilteredStandings(divName, category as HockeyCategory, season)
  ).some((s) => s.teams.some((t) => t.teamId === teamId));
  if (!teamInfo || !inCategory) {
    notFound();
  }

  // Season totals: every game the team played — league, tiering, playoffs, tournaments
  const allPlayers = getTeamPlayers(divName, teamId, undefined, season);
  const abbrev = getLeagueAbbrev(teamInfo.scheduleName);
  const mergedPlayers = mergePlayerStats(allPlayers);
  const gamesByType = getTeamGamesByType(divName, teamId, season);
  const shortNames = getShortTeamNames(divName, season);
  const teamGames = getTeamGames(divName, teamId, season).map((g) => withShortNames(g, shortNames));
  // Opponents get a link only if they have a page in this category
  const linkableTeamIds = [
    ...new Set(
      Object.values(getFilteredStandings(divName, category as HockeyCategory, season))
        .flatMap((s) => s.teams.map((t) => t.teamId))
    ),
  ];
  const totalGames = Object.values(gamesByType).reduce((a, b) => a + b, 0);
  const breakdown = (
    [
      ["League", "league"],
      ["Placement", "tiering"],
      ["Playoffs", "playoff"],
      ["Tournament", "tournament"],
    ] as const
  )
    .filter(([type]) => gamesByType[type] > 0)
    .map(([type, label]) => `${gamesByType[type]} ${label}`)
    .join(", ");

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href={`${base}/standings/${category}/${division}`}
        className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 hover:underline"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to {divName} Standings
      </Link>

      <SponsorStrip page="team" division={divName} />

      {/* Team Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {teamInfo.teamName}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {teamInfo.scheduleName}
            </p>
            {teamInfo.categoryName && (
              <p className="text-xs text-gray-500 mt-0.5">
                {teamInfo.categoryName}
              </p>
            )}
          </div>
          <span className="text-xs font-medium text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
            {abbrev}
          </span>
        </div>
      </div>

      {/* What the totals include */}
      <DismissibleNote id="team-season-totals">
        <p>
          <span className="font-semibold">Season totals.</span> Player stats
          add up every game this team played in {season}: league,
          tiering, playoffs and tournaments.
          {totalGames > 0 && (
            <>
              {" "}
              That&apos;s {totalGames} game{totalGames === 1 ? "" : "s"}
              {season === SEASON ? " so far" : ""} ({breakdown}).
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-blue-800/80">
          All stats are based on game sheets.
        </p>
      </DismissibleNote>

      {/* Player Roster — season totals across all schedules */}
      <TeamRosterTable players={mergedPlayers} />

      {/* Sponsor: right where parents are looking at their player's numbers */}
      <LevelUpCard teamName={teamInfo.teamName} />

      {/* Every game this team is in: league, tiering, playoffs, tournaments */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h4 className="font-semibold text-gray-900 text-sm">
            Games
            <span className="text-xs font-normal text-gray-500 ml-2">
              ({teamGames.filter((g) => g.status === "final").length} played)
            </span>
          </h4>
        </div>
        <GamesList
          games={teamGames}
          teamLinkBase={`${base}/standings/${category}/${division}/team`}
          linkableTeamIds={linkableTeamIds}
          showContext
          emptyText="No games for this team yet."
        />
      </div>
    </div>
  );
}
