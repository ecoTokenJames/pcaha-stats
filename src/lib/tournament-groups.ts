/**
 * Turns Spordle's tournament schedules into tournaments as families know them:
 * one entry per tournament per age group, with a standings table for each tier,
 * flight or pool.
 *
 * Spordle stores tournaments two ways, and organizers rarely fill in its "group"
 * field, so this works from the data we already have:
 * - one schedule per tier or pool ("FALL CLASSIC - U13A - GOLD TIER", "... - BLACK TIER"),
 *   which are merged back into one tournament;
 * - one schedule for everything (42 teams in "REMEMBRANCE DAY CLASSIC"), which is
 *   split by who played whom: teams that never meet are in different tiers, and a
 *   round robin before the final day marks the pools.
 *
 * Pure functions (no file reads) so they can be tested on their own.
 */
import type { GameRow, TeamStanding } from "./data";

export interface TournamentSchedule {
  scheduleId: number;
  scheduleName: string;
  divisionName: string;
  categoryName: string;
  startDate?: string;
  endDate?: string;
  teams: TeamStanding[];
}

export interface TournamentGroup {
  /** e.g. "Gold Tier", "Group 2", "Pool A"; "" when the tournament is a single table */
  label: string;
  /** Short line under the table, e.g. that pool records include playoff games */
  note?: string;
  scheduleId: number;
  /** Spordle's rows for these teams, in Spordle's order */
  teams: TeamStanding[];
}

export interface TournamentEvent {
  /** The lowest schedule id in the tournament; its page lives at /tournaments/<id> */
  id: number;
  scheduleIds: number[];
  name: string;
  divisionName: string;
  categoryNames: string[];
  startDate?: string;
  endDate?: string;
  groups: TournamentGroup[];
  teamCount: number;
}

/** Today in B.C. (permanent UTC-7 since Nov 2026), as YYYY-MM-DD */
export function pacificToday(now = Date.now()): string {
  return new Date(now - 7 * 3_600_000).toISOString().slice(0, 10);
}

// ==================== Names ====================

/** An age/level token at the start of a name part: "U13A", "U13", "13A", "U11 C", "U15 AAA" */
const AGE_PREFIX = /^(?:U\d{1,2}|\d{1,2}U?)\s*(?:AAA|AA|A|B|C)?\d?\b\s*/i;

const KEEP_UPPER = /^(?:AAA|AA|A|B|C|[A-Z]?\d.*|U\d+[A-Z]?|[IVX]+)$/i;

/** "GOLD TIER" → "Gold Tier", "TIERS 2-4" → "Tiers 2-4", "POOL A" → "Pool A" */
export function titleCase(text: string): string {
  return text
    .split(/(\s+)/)
    .map((w) =>
      /^\s*$/.test(w) || KEEP_UPPER.test(w)
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join("");
}

/**
 * Split a schedule name into the tournament and the part of it this schedule is.
 * "FALL CLASSIC - U13A - GOLD TIER" → { event: "FALL CLASSIC", section: "Gold Tier" }
 * "HOMETOWN HEROES - 13A"           → { event: "HOMETOWN HEROES", section: "" }
 * "MISSION U15 FALLEN STARS"        → { event: "MISSION U15 FALLEN STARS", section: "" }
 */
export function splitTournamentName(name: string): { event: string; section: string } {
  const parts = name.trim().split(/\s+-\s+/);
  const event = parts[0].trim();
  const section = parts
    .slice(1)
    .map((p) => p.trim().replace(AGE_PREFIX, "").trim())
    .filter(Boolean)
    .join(" - ");
  return { event, section: titleCase(section) };
}

// ==================== Who played whom ====================

/** Teams joined by games, as groups of team ids (in the order the ids were given). */
function connectedGroups(teamIds: number[], games: GameRow[]): number[][] {
  const parent = new Map(teamIds.map((id) => [id, id]));
  const find = (id: number): number => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };
  for (const g of games) {
    if (parent.has(g.homeTeamId) && parent.has(g.awayTeamId)) {
      parent.set(find(g.homeTeamId), find(g.awayTeamId));
    }
  }
  const groups = new Map<number, number[]>();
  for (const id of teamIds) {
    const root = find(id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(id);
  }
  return [...groups.values()];
}

/**
 * Roughly how strong a team is from its name, lower = stronger: "TIER 2" → 2,
 * "U11 A4" → 4, AAA / elite leagues → 0. null when the name doesn't say.
 * Only used to list a tournament's groups strongest first.
 */
function nameLevel(teamName: string): number | null {
  const name = teamName.toUpperCase();
  if (/\b(AAA|PCEHL|BCEHL|ELITE)\b/.test(name)) return 0;
  const tier = name.match(/\bTIER\s*(\d)/);
  if (tier) return Number(tier[1]);
  const level = name.match(/\b[AC](\d)\b/);
  if (level) return Number(level[1]);
  return null;
}

function averageLevel(teams: TeamStanding[]): number {
  const levels = teams.map((t) => nameLevel(t.teamName)).filter((n): n is number => n !== null);
  return levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : Infinity;
}

function firstStart(games: GameRow[]): string {
  return games.reduce((min, g) => (g.startTime && g.startTime < min ? g.startTime : min), "~");
}

/**
 * Pools inside one tier: the games before the final day, if they form separate
 * round robins of 3+ teams where everyone played at least twice. The final day is
 * usually crossovers and finals, which join the pools together. Needs 3+ days of
 * games so a two-day round robin isn't cut in half.
 */
function findPools(teamIds: number[], games: GameRow[]): number[][] | null {
  const days = [...new Set(games.map((g) => g.date).filter(Boolean))].sort();
  if (days.length < 3) return null;
  const lastDay = days[days.length - 1];
  const early = games.filter((g) => g.date !== lastDay);
  const pools = connectedGroups(teamIds, early);
  if (pools.length < 2) return null;
  // Pools are about the same size; a 10 and a 5 is more likely two separate events
  const sizes = pools.map((p) => p.length);
  if (Math.max(...sizes) > Math.min(...sizes) * 1.5) return null;
  for (const pool of pools) {
    if (pool.length < 3) return null;
    const inPool = new Set(pool);
    for (const id of pool) {
      const played = early.filter(
        (g) =>
          (g.homeTeamId === id && inPool.has(g.awayTeamId)) ||
          (g.awayTeamId === id && inPool.has(g.homeTeamId))
      ).length;
      if (played < 2) return null;
    }
  }
  return pools;
}

/**
 * One schedule's teams as standings tables: one per tier (teams that never met),
 * and one per pool inside a tier when the games show pools.
 */
export function splitSchedule(
  schedule: TournamentSchedule,
  games: GameRow[],
  section = ""
): TournamentGroup[] {
  const inGames = new Set(games.flatMap((g) => [g.homeTeamId, g.awayTeamId]));
  // Spordle lists every team entered in a schedule; drop the ones with no games in it
  // (e.g. a playoff flight lists all 24 teams but only 8 play in it)
  const active = schedule.teams.filter((t) => t.gamesPlayed > 0 || inGames.has(t.teamId));
  const teams = active.length > 0 ? active : schedule.teams;
  const rows = (ids: number[]) => {
    const set = new Set(ids);
    return teams.filter((t) => set.has(t.teamId));
  };
  const gamesOf = (ids: number[]) => {
    const set = new Set(ids);
    return games.filter((g) => set.has(g.homeTeamId) && set.has(g.awayTeamId));
  };
  const join = (...labels: string[]) => labels.filter(Boolean).join(" · ");

  if (games.length === 0 || active.length === 0) {
    return [{ label: section, scheduleId: schedule.scheduleId, teams }];
  }

  const tiers = connectedGroups(
    teams.map((t) => t.teamId),
    games
  )
    .map((ids) => ({ ids, teams: rows(ids), games: gamesOf(ids) }))
    .sort(
      (a, b) =>
        averageLevel(a.teams) - averageLevel(b.teams) ||
        b.ids.length - a.ids.length ||
        firstStart(a.games).localeCompare(firstStart(b.games))
    );

  const groups: TournamentGroup[] = [];
  tiers.forEach((tier, i) => {
    const tierLabel = tiers.length > 1 ? `Group ${i + 1}` : "";
    const pools = findPools(tier.ids, tier.games);
    if (!pools) {
      groups.push({ label: join(section, tierLabel), scheduleId: schedule.scheduleId, teams: tier.teams });
      return;
    }
    pools
      .map((ids) => ({ ids, start: firstStart(gamesOf(ids)) }))
      .sort((a, b) => a.start.localeCompare(b.start))
      .forEach((pool, p) => {
        const inPool = new Set(pool.ids);
        const playedOutside = tier.games.some(
          (g) => inPool.has(g.homeTeamId) !== inPool.has(g.awayTeamId)
        );
        groups.push({
          label: join(section, tierLabel, `Pool ${String.fromCharCode(65 + p)}`),
          note: playedOutside ? "Records include crossover and playoff games." : undefined,
          scheduleId: schedule.scheduleId,
          teams: rows(pool.ids),
        });
      });
  });
  return groups.filter((g) => g.teams.length > 0);
}

// ==================== Games per table ====================

export interface TournamentSection extends TournamentGroup {
  /** That table's games, newest first. Playoff sections have games but no teams */
  games: GameRow[];
}

const POOL = /^Pool [A-Z]$/;

/**
 * A tournament's standings tables, each with its own games, in page order.
 * Games between two pools (crossovers, semis, finals) get a "Playoffs" section
 * right after those pools, e.g. "Playoffs" or "Group 1 · Playoffs".
 */
export function tournamentSections(
  event: Pick<TournamentEvent, "scheduleIds" | "groups">,
  gamesFor: (scheduleId: number) => GameRow[]
): TournamentSection[] {
  const out: TournamentSection[] = [];
  const seen = new Set<number>();

  for (const scheduleId of event.scheduleIds) {
    const groups: TournamentSection[] = event.groups
      .filter((g) => g.scheduleId === scheduleId)
      .map((g) => ({ ...g, games: [] }));
    if (groups.length === 0) continue;
    const groupOf = new Map<number, TournamentSection>();
    for (const g of groups) for (const t of g.teams) groupOf.set(t.teamId, g);
    const playoffs = new Map<string, TournamentSection>();
    // "Group 1 · Pool A" → ["Group 1"]: the part a playoff game's two teams share
    const withoutPool = (label: string) => label.split(" · ").filter((p) => p && !POOL.test(p));

    for (const game of gamesFor(scheduleId)) {
      if (seen.has(game.id)) continue;
      seen.add(game.id);
      const home = groupOf.get(game.homeTeamId);
      const away = groupOf.get(game.awayTeamId);
      if (groups.length === 1 || (home && home === away)) {
        (groups.length === 1 ? groups[0] : home!).games.push(game);
        continue;
      }
      // Between pools, or a team not decided yet (TBD)
      const sides = [home, away].filter((g): g is TournamentSection => Boolean(g)).map((g) => withoutPool(g.label));
      const shared =
        sides.length === 2
          ? sides[0].filter((part, i) => part === sides[1][i])
          : sides.length === 1
            ? sides[0]
            : withoutPool(groups[0].label).filter((part, i) => groups.every((g) => withoutPool(g.label)[i] === part));
      const label = [...shared, "Playoffs"].join(" · ");
      if (!playoffs.has(label)) playoffs.set(label, { label, scheduleId, teams: [], games: [] });
      playoffs.get(label)!.games.push(game);
    }

    // Each playoff section goes right after the last table it draws from
    const ordered = [...groups];
    for (const section of playoffs.values()) {
      const prefix = section.label.replace(/(^| · )Playoffs$/, "");
      let at = -1;
      ordered.forEach((g, i) => {
        if (g.teams.length > 0 && (prefix === "" || g.label === prefix || g.label.startsWith(`${prefix} · `))) at = i;
      });
      ordered.splice(at === -1 ? ordered.length : at + 1, 0, section);
    }
    out.push(...ordered);
  }

  const newestFirst = (a: GameRow, b: GameRow) => (b.startTime ?? "").localeCompare(a.startTime ?? "");
  for (const s of out) s.games.sort(newestFirst);
  return out;
}

// ==================== Tournaments ====================

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Same weekend (within a day), or either side has no dates */
function overlaps(a: { startDate?: string; endDate?: string }, b: { startDate?: string; endDate?: string }) {
  if (!a.startDate || !a.endDate || !b.startDate || !b.endDate) return true;
  return a.startDate <= addDays(b.endDate, 1) && b.startDate <= addDays(a.endDate, 1);
}

const normalize = (s: string) => s.toUpperCase().replace(/\s+/g, " ").trim();

/**
 * Group tournament schedules into tournaments: same age group, same tournament
 * name, same weekend. Each tournament gets its standings tables in order.
 */
export function buildTournamentEvents(
  schedules: TournamentSchedule[],
  gamesFor: (schedule: TournamentSchedule) => GameRow[]
): TournamentEvent[] {
  const sorted = [...schedules].sort((a, b) => a.scheduleId - b.scheduleId);
  const events: { key: string; schedules: TournamentSchedule[]; startDate?: string; endDate?: string }[] = [];

  for (const s of sorted) {
    const key = `${s.divisionName}|${normalize(splitTournamentName(s.scheduleName).event)}`;
    const match = events.find((e) => e.key === key && overlaps(e, s));
    if (match) {
      match.schedules.push(s);
      if (s.startDate && (!match.startDate || s.startDate < match.startDate)) match.startDate = s.startDate;
      if (s.endDate && (!match.endDate || s.endDate > match.endDate)) match.endDate = s.endDate;
    } else {
      events.push({ key, schedules: [s], startDate: s.startDate, endDate: s.endDate });
    }
  }

  return events.map((e) => {
    const multi = e.schedules.length > 1;
    const groups = e.schedules.flatMap((s) => {
      const { section } = splitTournamentName(s.scheduleName);
      // A lone schedule keeps its leftover label ("Pool A") only if it has one
      return splitSchedule(s, gamesFor(s), multi || section ? section : "");
    });
    const first = e.schedules[0];
    return {
      id: first.scheduleId,
      scheduleIds: e.schedules.map((s) => s.scheduleId),
      name: splitTournamentName(first.scheduleName).event,
      divisionName: first.divisionName,
      categoryNames: [...new Set(e.schedules.map((s) => s.categoryName).filter(Boolean))],
      startDate: e.startDate,
      endDate: e.endDate,
      groups,
      teamCount: new Set(groups.flatMap((g) => g.teams.map((t) => t.teamId))).size,
    };
  });
}
