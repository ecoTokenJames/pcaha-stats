import fs from "fs";
import path from "path";
import zlib from "zlib";
import { shortTeamNames } from "./team-names";

const DATA_DIR = path.join(process.cwd(), "data");
/** Finished seasons, packaged by scraper/package-season.js: data/seasons/<season>/**.json.gz */
const SEASONS_DIR = path.join(DATA_DIR, "seasons");

/** Past seasons never change, so each file is parsed once per process. */
const pastCache = new Map<string, unknown>();

/**
 * Reads a data file. Without a season (or for the current one) it's the nightly
 * data in data/; for a past season it's that season's packaged copy.
 */
function readJson<T>(filePath: string, season?: string): T | null {
  try {
    if (season && season !== SEASON) {
      const fullPath = path.join(SEASONS_DIR, season, `${filePath}.gz`);
      if (!pastCache.has(fullPath)) {
        pastCache.set(fullPath, JSON.parse(zlib.gunzipSync(fs.readFileSync(fullPath)).toString("utf-8")));
      }
      return pastCache.get(fullPath) as T;
    }
    const content = fs.readFileSync(path.join(DATA_DIR, filePath), "utf-8");
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
  /** Short name for phones ("Langley A1"); set by the page, not in the data files */
  shortName?: string;
}

export interface ScheduleStandings {
  scheduleId: number;
  scheduleName: string;
  divisionName: string;
  categoryName: string;
  scheduleType?: string;
  startDate?: string;
  endDate?: string;
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
  scheduleType?: string;
  goals: number;
  assists: number;
  points: number;
  pim: number;
  ppGoals: number;
  shGoals: number;
  gwGoals: number;
  gamesPlayed: number;
  isAffiliate: boolean;
  position: string;
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

export function getDivisions(season?: string): DivisionMeta[] {
  return readJson<DivisionMeta[]>("meta/divisions.json", season) || [];
}

export function getSchedules(season?: string): ScheduleMeta[] {
  return readJson<ScheduleMeta[]>("meta/schedules.json", season) || [];
}

export function getAllStandings(season?: string): Record<string, ScheduleStandings> {
  return readJson<Record<string, ScheduleStandings>>("standings/all-standings.json", season) || {};
}

export function getDivisionStandings(division: string, season?: string): Record<string, ScheduleStandings> {
  return readJson<Record<string, ScheduleStandings>>(`standings/${division.toLowerCase()}.json`, season) || {};
}

export function getAllPlayers(season?: string): PlayerStat[] {
  if (season && season !== SEASON) {
    // Past seasons ship per-division files only
    return getDivisions(season).flatMap((d) => getDivisionPlayers(d.name, season));
  }
  return readJson<PlayerStat[]>("players/all-players.json") || [];
}

/** Players removed on request; past seasons were packaged earlier, so apply the list on read. */
let hiddenIds: Set<number> | null = null;
function hiddenPlayerIds(): Set<number> {
  if (!hiddenIds) {
    try {
      const file = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), "scraper", "hidden-players.json"), "utf-8")
      ) as { hidden?: Array<number | { participantId: number }> };
      hiddenIds = new Set(
        (file.hidden ?? []).map((h) => Number(typeof h === "object" ? h.participantId : h))
      );
    } catch {
      hiddenIds = new Set();
    }
  }
  return hiddenIds;
}

const withheldCache = new Map<string, PlayerStat[]>();

export function getDivisionPlayers(division: string, season?: string): PlayerStat[] {
  const file = `players/${division.toLowerCase()}.json`;
  if (!season || season === SEASON) return readJson<PlayerStat[]>(file) || [];
  const key = `${season}/${file}`;
  if (!withheldCache.has(key)) {
    const hidden = hiddenPlayerIds();
    withheldCache.set(
      key,
      (readJson<PlayerStat[]>(file, season) || []).map((p) =>
        hidden.has(p.participantId) ? { ...p, name: "Name withheld" } : p
      )
    );
  }
  return withheldCache.get(key)!;
}

export function getLeaders(): Leaders {
  return readJson<Leaders>("players/leaders.json") || {};
}

export interface GameRow {
  id: number;
  number: string | null;
  date: string | null;
  startTime: string | null;
  groupId: number | null;
  groupName: string | null;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  decidedBy: "OT" | "SO" | null;
  status: "final" | "scheduled" | "awaiting" | "cancelled" | "postponed";
  arena: string | null;
}

/** A game ready to render: start time already formatted in Pacific time. */
export interface GameView extends GameRow {
  when: string;
  /** Short team names for phones */
  homeShort?: string;
  awayShort?: string;
  /** Set on the team page, where games come from several schedules */
  scheduleName?: string;
}

/** Games for each schedule in a division, newest first. */
export function getDivisionGames(division: string, season?: string): Record<string, GameRow[]> {
  return readJson<Record<string, GameRow[]>>(`games/${division.toLowerCase()}.json`, season) || {};
}

/**
 * Every game a team is in this season across all its schedules in the division
 * (league, tiering, playoffs, tournaments), newest first, tagged with the schedule.
 */
export function getTeamGames(division: string, teamId: number, season?: string): GameView[] {
  const standings = getDivisionStandings(division, season);
  const seen = new Set<number>();
  const games: GameView[] = [];
  for (const [scheduleId, list] of Object.entries(getDivisionGames(division, season))) {
    for (const g of list) {
      if (g.homeTeamId !== teamId && g.awayTeamId !== teamId) continue;
      if (seen.has(g.id)) continue;
      seen.add(g.id);
      games.push({
        ...toGameView(g),
        scheduleName: standings[scheduleId]?.scheduleName,
      });
    }
  }
  return games.sort((a, b) => (b.startTime ?? "").localeCompare(a.startTime ?? ""));
}

const shortNameCache = new Map<string, Map<number, string>>();

/** Short names for every team in a division (games and leaders span its schedules). */
export function getShortTeamNames(division: string, season?: string): Map<number, string> {
  const key = `${season ?? SEASON}/${division}`;
  if (!shortNameCache.has(key)) {
    const teams = Object.values(getDivisionStandings(division, season)).flatMap((s) => s.teams);
    const games = Object.values(getDivisionGames(division, season)).flat();
    shortNameCache.set(
      key,
      shortTeamNames([
        ...teams,
        ...games.flatMap((g) => [
          { teamId: g.homeTeamId, teamName: g.homeTeamName },
          { teamId: g.awayTeamId, teamName: g.awayTeamName },
        ]),
      ])
    );
  }
  return shortNameCache.get(key)!;
}

/** Adds phone-size team names to a game */
export function withShortNames(game: GameView, names: Map<number, string>): GameView {
  return { ...game, homeShort: names.get(game.homeTeamId), awayShort: names.get(game.awayTeamId) };
}

export function toGameView(game: GameRow): GameView {
  const when = game.startTime
    ? new Date(game.startTime).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Vancouver",
      })
    : game.date ?? "";
  return { ...game, when };
}

/** [gameId, scheduleId, goals, assists, pim] for each game a player had a goal, assist or penalty in. */
export type GameLogRow = [number, number, number, number, number];

/** Game-by-game player logs for a division (participantId -> rows). */
export function getDivisionGameLogs(division: string): Record<string, GameLogRow[]> {
  return readJson<Record<string, GameLogRow[]>>(`gamelogs/${division.toLowerCase()}.json`) || {};
}

/** One past season for a player (built by scraper/build-history.js). */
export interface PlayerSeasonHistory {
  season: string;
  /** Latest name on file ("Name withheld" if removed on request) */
  name: string;
  number: number;
  division: string;
  teamName: string;
  teamId: number;
  /** League, Placement, Playoffs or Tournament */
  type: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  pim: number;
}

/** Past seasons (2023-24 onward) by participantId. */
let playerHistory: Record<string, PlayerSeasonHistory[]> | null = null;

/** history/players.json as packed by build-history.js */
interface PackedHistory {
  types: string[];
  /** [season, teamId, teamName, division] */
  teams: Array<[string, number, string, string]>;
  /** participantId -> [latestName, [[teamIdx, number, typeIdx, gp, g, a, pim], ...]] */
  players: Record<string, [string, Array<[number, number, number, number, number, number, number]>]>;
}

export function getPlayerHistory(): Record<string, PlayerSeasonHistory[]> {
  // Large and fixed between deploys: unpack once per server instance
  if (!playerHistory) {
    const packed = readJson<PackedHistory>("history/players.json");
    playerHistory = {};
    if (packed) {
      for (const [pid, [name, rows]] of Object.entries(packed.players)) {
        playerHistory[pid] = rows.map(([t, number, type, gamesPlayed, goals, assists, pim]) => {
          const [season, teamId, teamName, division] = packed.teams[t];
          return {
            season,
            name,
            number,
            division,
            teamName,
            teamId,
            type: packed.types[type],
            gamesPlayed,
            goals,
            assists,
            points: goals + assists,
            pim,
          };
        });
      }
    }
  }
  return playerHistory;
}

export function getScrapeInfo(): ScrapeInfo | null {
  return readJson<ScrapeInfo>("meta/last-scrape.json");
}

/** Season label (e.g. "2026-27") taken from the most recent scrape. */
export const SEASON: string = (() => {
  try {
    const info = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, "meta", "last-scrape.json"), "utf-8")
    ) as ScrapeInfo;
    return info.season ?? "";
  } catch {
    return "";
  }
})();

/** Finished seasons that can be browsed, newest first (the current season isn't included). */
export const PAST_SEASONS: string[] = (() => {
  try {
    return fs
      .readdirSync(SEASONS_DIR)
      .filter((d) => /^\d{4}-\d{2}$/.test(d) && d !== SEASON)
      .sort()
      .reverse();
  } catch {
    return [];
  }
})();

/** Every season with pages, current first. */
export const ALL_SEASONS: string[] = [SEASON, ...PAST_SEASONS];

/** URL prefix for a season's pages: "" for the current season, /seasons/<season> for past ones. */
export function seasonBase(season: string): string {
  return season === SEASON ? "" : `/seasons/${season}`;
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
export function getDivisionsForCategory(category: HockeyCategory, season?: string): DivisionMeta[] {
  const standings = getAllStandings(season);
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
  category: HockeyCategory,
  season?: string
): Record<string, ScheduleStandings> {
  const allStandings = getDivisionStandings(division, season);
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
  scheduleType?: ScheduleTypeFilter,
  season?: string
): PlayerStat[] {
  const allPlayers = getDivisionPlayers(division, season);
  const standings = getDivisionStandings(division, season);

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
      const type = getScheduleType(player);
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
  scheduleType?: ScheduleTypeFilter,
  season?: string
): PlayerStat[] {
  const allPlayers = getDivisionPlayers(division, season);
  return allPlayers
    .filter((p) => {
      if (p.teamId !== teamId) return false;
      if (scheduleType) {
        const type = getScheduleType(p);
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
  teamId: number,
  season?: string
): { teamName: string; scheduleName: string; categoryName: string; scheduleId: number } | null {
  const typeRank = ["League", "Playoffs", "Placement", "Tournament"];
  const matches = Object.values(getDivisionStandings(division, season))
    .map((data) => ({ data, team: data.teams.find((t) => t.teamId === teamId) }))
    .filter((m) => m.team)
    .sort(
      (a, b) =>
        typeRank.indexOf(getScheduleType(a.data)) -
        typeRank.indexOf(getScheduleType(b.data))
    );
  if (matches.length === 0) return null;
  const { data, team } = matches[0];
  return {
    teamName: team!.teamName,
    scheduleName: data.scheduleName,
    categoryName: data.categoryName,
    scheduleId: data.scheduleId,
  };
}

/**
 * Games a team has played this season, split by schedule type
 * (League, Placement, Playoffs, Tournament), from the standings.
 */
export function getTeamGamesByType(
  division: string,
  teamId: number,
  season?: string
): Record<ScheduleType, number> {
  const games: Record<ScheduleType, number> = {
    League: 0,
    Placement: 0,
    Playoffs: 0,
    Tournament: 0,
  };
  for (const data of Object.values(getDivisionStandings(division, season))) {
    // A team can appear in several groups of one schedule (playoff rounds)
    for (const team of data.teams) {
      if (team.teamId === teamId) games[getScheduleType(data)] += team.gamesPlayed;
    }
  }
  return games;
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

export type ScheduleType = "League" | "Playoffs" | "Placement" | "Tournament";

/**
 * League, Playoffs, Placement or Tournament. Uses Spordle's schedule type when the
 * scrape recorded it, and falls back to guessing from the name for older data.
 */
export function getScheduleType(s: {
  scheduleName: string;
  scheduleType?: string;
}): ScheduleType {
  if (
    s.scheduleType === "League" ||
    s.scheduleType === "Playoffs" ||
    s.scheduleType === "Placement" ||
    s.scheduleType === "Tournament"
  ) {
    return s.scheduleType;
  }
  const lower = s.scheduleName.toLowerCase();
  if (lower.includes("playoff")) return "Playoffs";
  if (lower.includes("placement") || lower.includes("balancing")) return "Placement";
  if (lower.includes("tournament") || lower.includes("classic") || lower.includes("cup") || lower.includes("memorial")) return "Tournament";
  return "League";
}

/** Where a schedule is relative to today, from its start/end dates (YYYY-MM-DD). */
export function getSchedulePhase(
  s: { startDate?: string; endDate?: string },
  today: string = new Date().toISOString().slice(0, 10)
): "current" | "upcoming" | "finished" | "unknown" {
  if (!s.startDate || !s.endDate) return "unknown";
  if (today < s.startDate) return "upcoming";
  if (today > s.endDate) return "finished";
  return "current";
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
  if (lower.includes("pcehl")) return "PCEHL";
  if (lower.includes("bcehl")) return "BCEHL";
  if (lower.startsWith("u") && lower.includes("a ")) return "PCAHA-A";
  if (lower.startsWith("u") && lower.includes("c ")) return "PCAHA-C";
  return "PCAHA";
}

// ==================== Tournament Helpers ====================

export interface TournamentInfo {
  scheduleId: number;
  scheduleName: string;
  divisionName: string;
  categoryName: string;
  startDate?: string;
  endDate?: string;
  teams: TeamStanding[];
}

/**
 * Get all tournaments from standings data.
 */
export function getAllTournaments(season?: string): TournamentInfo[] {
  const allStandings = getAllStandings(season);
  const tournaments: TournamentInfo[] = [];

  for (const data of Object.values(allStandings)) {
    if (getScheduleType(data) === "Tournament") {
      tournaments.push({
        scheduleId: data.scheduleId,
        scheduleName: data.scheduleName,
        divisionName: data.divisionName,
        categoryName: data.categoryName,
        startDate: data.startDate,
        endDate: data.endDate,
        teams: data.teams,
      });
    }
  }

  // Sort by division then name
  tournaments.sort((a, b) => {
    const divA = parseInt(a.divisionName.replace("U", ""));
    const divB = parseInt(b.divisionName.replace("U", ""));
    if (divA !== divB) return divA - divB;
    return a.scheduleName.localeCompare(b.scheduleName);
  });

  return tournaments;
}

/**
 * Get players for a specific tournament (by scheduleId).
 */
export function getTournamentPlayers(scheduleId: number, season?: string): PlayerStat[] {
  const allPlayers = getAllPlayers(season);
  return allPlayers
    .filter((p) => p.scheduleId === scheduleId)
    .sort((a, b) => b.points - a.points || b.goals - a.goals);
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
 * League name without the round, e.g. "U11A Placement" → "U11A",
 * "FVW U11C Balancing" → "FVW U11C", "PCEHL U13 AA Regular Season" → "PCEHL U13 AA".
 */
export function leagueLabel(scheduleName: string): string {
  let name = scheduleName.trim();
  const round =
    /\s*(regular season|league|placement( games| schedule)?|balancing|playoffs?|championship day|\(.*\))\s*$/i;
  while (round.test(name)) {
    const next = name.replace(round, "").trim();
    if (!next || next === name) break;
    name = next;
  }
  return name || scheduleName;
}

export interface TeamDivision {
  /** League the team plays in, e.g. "U11A" or "FVE U11C" */
  league: string;
  /** Tier/flight/group within that league for the current round */
  group: string | null;
}

/**
 * Where each team plays right now: its league and its tier in the current round.
 * Uses the round in progress (else the latest one that has started, else the
 * next one), preferring League over Playoffs over Placement. Tournaments are ignored.
 */
export function getTeamDivisions(
  division: string,
  category: HockeyCategory,
  today: string = new Date().toISOString().slice(0, 10),
  season?: string
): Map<number, TeamDivision> {
  const phaseRank = { current: 0, finished: 1, upcoming: 2, unknown: 1 };
  const typeRank: Record<string, number> = { League: 0, Playoffs: 1, Placement: 2 };
  const best = new Map<number, { score: number[]; value: TeamDivision }>();

  for (const data of Object.values(getFilteredStandings(division, category, season))) {
    const type = getScheduleType(data);
    if (type === "Tournament") continue;
    const phase = getSchedulePhase(data, today);
    // Lower is better; among finished rounds the most recent wins
    const score = [
      phaseRank[phase],
      phase === "finished" ? -Number((data.endDate ?? "").replace(/-/g, "")) : 0,
      typeRank[type],
    ];
    for (const team of data.teams) {
      const value: TeamDivision = {
        league: leagueLabel(data.scheduleName),
        group: team.groupName
          ? type === "League"
            ? normalizeGroupName(team.groupName)
            : team.groupName
          : null,
      };
      const prev = best.get(team.teamId);
      if (!prev || compareScores(score, prev.score) < 0) {
        best.set(team.teamId, { score, value });
      }
    }
  }

  return new Map([...best].map(([id, { value }]) => [id, value]));
}

/** Compare two number arrays element by element (first difference decides). */
function compareScores(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

/** Sort tier/flight/group names sensibly (Tier 1 before Tier 2, etc). */
export function sortGroups(groups: string[]): string[] {
  return sortGroupNames(groups);
}

