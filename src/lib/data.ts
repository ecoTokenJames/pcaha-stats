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

// ==================== Category Types ====================

export type HockeyCategory = "rep" | "house" | "female";

// ==================== Category Classification ====================

/**
 * Classify a schedule's categoryName into rep or house.
 * AA and A = rep, C = house.
 */
export function classifyScheduleCategory(categoryName: string): "rep" | "house" {
  const cat = categoryName.trim().toUpperCase();
  if (cat.endsWith(" C")) return "house";
  return "rep"; // AA and A are both rep
}

/**
 * Check if a team name indicates a female/girls hockey team.
 */
export function isTeamFemale(teamName: string): boolean {
  const upper = teamName.toUpperCase();
  return upper.includes("FEMALE") || upper.includes("GIRLS");
}

/**
 * Check if a schedule is a female league.
 * If the majority of teams are female-named, the entire league is female.
 * This correctly handles mixed VIAHA leagues (few female teams in a male league)
 * while still classifying all-female leagues that have a couple non-female-named teams.
 */
function isScheduleFemale(teams: TeamStanding[]): boolean {
  if (teams.length === 0) return false;
  const femaleCount = teams.filter((t) => isTeamFemale(t.teamName)).length;
  return femaleCount / teams.length > 0.5;
}

/**
 * Get divisions that have data for a given hockey category.
 */
export function getDivisionsForCategory(category: HockeyCategory): DivisionMeta[] {
  const standings = getAllStandings();
  const divNames = new Set<string>();

  for (const s of Object.values(standings)) {
    const schedCat = classifyScheduleCategory(s.categoryName);
    const schedIsFemale = isScheduleFemale(s.teams);

    if (category === "female") {
      if (schedIsFemale) {
        divNames.add(s.divisionName);
      }
    } else {
      if (schedCat === category && !schedIsFemale) {
        divNames.add(s.divisionName);
      }
    }
  }

  const sorted = Array.from(divNames).sort((a, b) => {
    const numA = parseInt(a.replace("U", ""));
    const numB = parseInt(b.replace("U", ""));
    return numA - numB;
  });

  return sorted.map((name) => ({ id: name, name }));
}

/**
 * Get standings for a division filtered by hockey category.
 * Female: includes entire schedules where majority of teams are female-named.
 * Rep/House: filters by categoryName, excludes female-majority schedules.
 */
export function getFilteredStandings(
  division: string,
  category: HockeyCategory
): Record<string, ScheduleStandings> {
  const allStandings = getDivisionStandings(division);
  const filtered: Record<string, ScheduleStandings> = {};

  for (const [schedId, data] of Object.entries(allStandings)) {
    const schedCat = classifyScheduleCategory(data.categoryName);
    const schedIsFemale = isScheduleFemale(data.teams);

    if (category === "female") {
      if (schedIsFemale) {
        // Include ALL teams in a female schedule (even non-female-named ones)
        filtered[schedId] = data;
      }
    } else {
      if (schedCat === category && !schedIsFemale) {
        filtered[schedId] = data;
      }
    }
  }

  return filtered;
}

export type ScheduleTypeFilter = "League" | "Playoffs";

/**
 * Get players for a division filtered by hockey category and optionally by schedule type.
 * Uses schedule-level female detection: players in a female-majority schedule
 * are all classified as female regardless of individual team name.
 *
 * scheduleType: "League" = regular season only, "Playoffs" = playoffs + placement, undefined = all
 */
export function getFilteredPlayers(
  division: string,
  category: HockeyCategory,
  scheduleType?: ScheduleTypeFilter
): PlayerStat[] {
  const allPlayers = getDivisionPlayers(division);
  const standings = getDivisionStandings(division);

  // Build a set of schedule IDs that are female leagues
  const femaleScheduleIds = new Set<number>();
  for (const data of Object.values(standings)) {
    if (isScheduleFemale(data.teams)) {
      femaleScheduleIds.add(data.scheduleId);
    }
  }

  return allPlayers.filter((player) => {
    const schedCat = classifyScheduleCategory(player.categoryName);
    const inFemaleSchedule = femaleScheduleIds.has(player.scheduleId);

    // Category filter
    if (category === "female" && !inFemaleSchedule) return false;
    if (category !== "female" && (schedCat !== category || inFemaleSchedule)) return false;

    // Schedule type filter
    if (scheduleType) {
      const type = getScheduleType(player.scheduleName);
      if (scheduleType === "League") return type === "League";
      if (scheduleType === "Playoffs") return type === "Playoffs" || type === "Placement";
    }

    return true;
  });
}

/**
 * Get all players for a specific team, optionally filtered by schedule type.
 */
export function getTeamPlayers(
  division: string,
  teamId: number,
  scheduleType?: ScheduleTypeFilter
): PlayerStat[] {
  const allPlayers = getDivisionPlayers(division);
  return allPlayers
    .filter((p) => {
      if (p.teamId !== teamId) return false;
      if (scheduleType) {
        const type = getScheduleType(p.scheduleName);
        if (scheduleType === "League") return type === "League";
        if (scheduleType === "Playoffs") return type === "Playoffs" || type === "Placement";
      }
      return true;
    })
    .sort((a, b) => b.points - a.points || b.goals - a.goals);
}

/**
 * Merge multiple player entries (from different schedules) into one per player.
 * Sums GP, G, A, PTS, PIM, PPG, SHG. Takes name/number/team from entry with most GP.
 */
export function mergePlayerStats(players: PlayerStat[]): PlayerStat[] {
  const grouped = new Map<number, PlayerStat[]>();
  for (const p of players) {
    const entries = grouped.get(p.participantId) || [];
    entries.push(p);
    grouped.set(p.participantId, entries);
  }

  const merged: PlayerStat[] = [];
  for (const entries of grouped.values()) {
    // Use the entry with most GP for identity fields
    const primary = entries.reduce((a, b) => (a.gamesPlayed >= b.gamesPlayed ? a : b));
    merged.push({
      ...primary,
      gamesPlayed: entries.reduce((sum, e) => sum + e.gamesPlayed, 0),
      goals: entries.reduce((sum, e) => sum + e.goals, 0),
      assists: entries.reduce((sum, e) => sum + e.assists, 0),
      points: entries.reduce((sum, e) => sum + e.points, 0),
      pim: entries.reduce((sum, e) => sum + e.pim, 0),
      ppGoals: entries.reduce((sum, e) => sum + e.ppGoals, 0),
      shGoals: entries.reduce((sum, e) => sum + e.shGoals, 0),
      gwGoals: entries.reduce((sum, e) => sum + e.gwGoals, 0),
    });
  }

  return merged.sort((a, b) => b.points - a.points || b.goals - a.goals);
}

/**
 * Get team info (name, schedule, category) from standings.
 */
export function getTeamInfo(
  division: string,
  teamId: number
): { teamName: string; scheduleName: string; categoryName: string; scheduleId: number } | null {
  const standings = getDivisionStandings(division);
  for (const data of Object.values(standings)) {
    const team = data.teams.find((t) => t.teamId === teamId);
    if (team) {
      return {
        teamName: team.teamName,
        scheduleName: data.scheduleName,
        categoryName: data.categoryName,
        scheduleId: data.scheduleId,
      };
    }
  }
  return null;
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

// ==================== Tier / Group Helpers ====================

/**
 * Normalize a group name by stripping conference prefixes (FVC/GVC).
 * "FVC Flight 1" → "Flight 1", "GVC Tier 2" → "Tier 2"
 */
export function normalizeGroupName(groupName: string): string {
  return groupName.replace(/^(fvc|gvc)\s+/i, "").trim();
}

/**
 * Sort group names logically:
 * - "Inter-Conference" first
 * - Numbered patterns (Flight N, Tier N, Group N) by number
 * - Non-numbered alphabetically
 */
function sortGroupNames(groups: string[]): string[] {
  return groups.sort((a, b) => {
    const aIsInter = a.toLowerCase().includes("inter-conference");
    const bIsInter = b.toLowerCase().includes("inter-conference");
    if (aIsInter && !bIsInter) return -1;
    if (!aIsInter && bIsInter) return 1;

    const parseGroup = (name: string) => {
      const match = name
        .toLowerCase()
        .match(/^(flight|tier|group|division|presidents series)\s*(\d+)/);
      return match ? parseInt(match[2]) : 999;
    };

    const aNum = parseGroup(a);
    const bNum = parseGroup(b);
    if (aNum !== bNum) return aNum - bNum;

    return a.localeCompare(b);
  });
}

/**
 * Build a lookup from teamId → normalized groupName using League-type standings.
 */
export function getTeamGroupLookup(
  division: string,
  category: HockeyCategory
): Map<number, string | null> {
  const standings = getFilteredStandings(division, category);
  const lookup = new Map<number, string | null>();

  for (const data of Object.values(standings)) {
    if (getScheduleType(data.scheduleName) !== "League") continue;

    for (const team of data.teams) {
      if (!lookup.has(team.teamId)) {
        lookup.set(
          team.teamId,
          team.groupName ? normalizeGroupName(team.groupName) : null
        );
      }
    }
  }

  return lookup;
}

/**
 * Get sorted unique group names available for a division+category.
 */
export function getAvailableGroups(
  division: string,
  category: HockeyCategory
): string[] {
  const lookup = getTeamGroupLookup(division, category);
  const groups = new Set<string>();

  for (const groupName of lookup.values()) {
    if (groupName !== null) {
      groups.add(groupName);
    }
  }

  return sortGroupNames([...groups]);
}
