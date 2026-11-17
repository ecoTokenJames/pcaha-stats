import type { TeamStanding } from "./data";

/**
 * Show an SP (sportsmanship points) column only for tables where Spordle gives the
 * number for every team and the league or tournament actually awards them.
 * Standings saved before we kept this number have none, so they show no column.
 */
export function showsSportsmanship(teams: Pick<TeamStanding, "sportsmanshipPoints">[]): boolean {
  return (
    teams.length > 0 &&
    teams.every((t) => typeof t.sportsmanshipPoints === "number") &&
    teams.some((t) => (t.sportsmanshipPoints ?? 0) > 0)
  );
}

export const SPORTSMANSHIP_TITLE = "Sportsmanship points";
