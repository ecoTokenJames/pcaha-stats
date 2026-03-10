import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function readJson<T>(filePath: string): T | null {
  try {
    const fullPath = path.join(DATA_DIR, filePath);
    const content = fs.readFileSync(fullPath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

// ==================== Types ====================

export interface TeamStanding {
  rank: number;
  teamId: number;
  teamName: string;
  teamShortName: string | null;
  teamLogoUrl: string | null;
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  otWins: number;
  otLosses: number;
  points: number;
  pointsPct: number;
  goalsFor: number;
  goalsAgainst: number;
  diff: number;
  gfPerGame: number;
  gaPerGame: number;
  pim: number;
  pimPerGame: number;
  groupName: string | null;
}

export interface ScheduleStandings {
  scheduleId: number;
  scheduleName: string;
  divisionName: string;
  categoryName: string;
  teams: TeamStanding[];
}

export interface PlayerStat {
  participantId: number;
  name: string;
  number: number;
  teamId: number;
  teamName: string;
  divisionName: string;
  scheduleName: string;
  scheduleId: number;
  categoryName: string;
  goals: number;
  assists: number;
  points: number;
  pim: number;
  ppGoals: number;
  shGoals: number;
  gwGoals: number;
  gamesPlayed: number;
  isAffiliate: boolean;
}

export interface DivisionMeta {
  id: string;
  name: string;
}

export interface ScheduleMeta {
  id: number;
  name: string;
  divisionName: string;
  categoryName: string;
}

export interface Leaders {
  [division: string]: {
    topScorers: PlayerStat[];
    topGoals: PlayerStat[];
    topAssists: PlayerStat[];
    topPIM: PlayerStat[];
  };
}

export interface ScrapeInfo {
  timestamp: string;
  season: string;
  divisionsScraped: string[];
  schedulesProcessed: number;
  standingsTeams: number;
  elapsedSeconds: number;
}

// ==================== Data Loaders ====================

export function getDivisions(): DivisionMeta[] {
  return readJson<DivisionMeta[]>("meta/divisions.json") || [];
}

export function getSchedules(): ScheduleMeta[] {
  return readJson<ScheduleMeta[]>("meta/schedules.json") || [];
}

export function getAllStandings(): Record<string, ScheduleStandings> {
  return readJson<Record<string, ScheduleStandings>>("standings/all-standings.json") || {};
}

export function getDivisionStandings(division: string): Record<string, ScheduleStandings> {
  return readJson<Record<string, ScheduleStandings>>(`standings/${division.toLowerCase()}.json`) || {};
}

export function getAllPlayers(): PlayerStat[] {
  return readJson<PlayerStat[]>("players/all-players.json") || [];
}

export function getDivisionPlayers(division: string): PlayerStat[] {
  return readJson<PlayerStat[]>(`players/${division.toLowerCase()}.json`) || [];
}

export function getLeaders(): Leaders {
  return readJson<Leaders>("players/leaders.json") || {};
}

export function getScrapeInfo(): ScrapeInfo | null {
  return readJson<ScrapeInfo>("meta/last-scrape.json");
}

// ==================== Helpers ====================

/**
 * Get all divisions that have standings data
 */
export function getActiveDivisions(): DivisionMeta[] {
  const divisions = getDivisions();
  const standings = getAllStandings();

  const divisionsWithData = new Set<string>();
  for (const s of Object.values(standings)) {
    divisionsWithData.add(s.divisionName);
  }

  return divisions.filter((d) => divisionsWithData.has(d.name));
}

/**
 * Group schedules by division, then by type (League vs Playoffs)
 */
export function getSchedulesByDivision(): Record<string, ScheduleMeta[]> {
  const schedules = getSchedules();
  const grouped: Record<string, ScheduleMeta[]> = {};

  for (const s of schedules) {
    if (!grouped[s.divisionName]) grouped[s.divisionName] = [];
    grouped[s.divisionName].push(s);
  }

  return grouped;
}

/**
 * Categorize a schedule name into League, Playoffs, Placement, or Tournament
 */
export function getScheduleType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("playoff")) return "Playoffs";
  if (lower.includes("placement")) return "Placement";
  if (lower.includes("tournament") || lower.includes("classic") || lower.includes("cup") || lower.includes("memorial")) return "Tournament";
  return "League";
}

/**
 * Get the league abbreviation from a schedule name
 */
export function getLeagueAbbrev(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("fve ") || lower.includes("fraser valley east")) return "FVE";
  if (lower.includes("fvw ") || lower.includes("fraser valley west")) return "FVW";
  if (lower.includes("fvn ") || lower.includes("fraser valley north")) return "FVN";
  if (lower.includes("lg ") || lower.includes("lions gate")) return "LG";
  if (lower.includes("pl ") || lower.includes("pacific")) return "PL";
  if (lower.includes("viaha")) return "VIAHA";
  if (lower.includes("pcehl") || lower.includes("bcehl")) return "BCEHL";
  if (lower.startsWith("u") && lower.includes("a ")) return "PCAHA-A";
  if (lower.startsWith("u") && lower.includes("c ")) return "PCAHA-C";
  return "PCAHA";
}
