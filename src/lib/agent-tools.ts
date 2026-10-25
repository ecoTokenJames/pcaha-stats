/**
 * Read-only lookup tools for the stats agent. The model asks for one of these by
 * name; our server runs it against the site's own nightly data (never the
 * visitor's browser) and hands the result back. Everything returned is already
 * public on pcahastats.com; names on the removal list are withheld at scrape time.
 */
import {
  getActiveDivisions,
  getDivisionGameLogs,
  getDivisionGames,
  getDivisionPlayers,
  getDivisionStandings,
  getDivisionsForCategory,
  getFilteredStandings,
  getPlayerHistory,
  getScheduleType,
  getTeamDivisions,
  mergePlayerStats,
  SEASON,
  type GameRow,
  type HockeyCategory,
  type PlayerStat,
} from "./data";

const CATEGORIES: HockeyCategory[] = ["rep", "house", "female"];
const SITE = "https://www.pcahastats.com";

// ─── Tool definitions (OpenAI function-calling shape) ───

export const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "search",
      description:
        "Find players and teams by name (any part of the name, e.g. 'burnaby u11 a1' or 'mcardle'). Returns ids to use with get_team / get_player. Always search first when the user names someone.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Name or part of a name" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_team",
      description:
        "A team's current season: standings in each schedule (league, tiering, playoffs, tournaments), recent results, upcoming games, and every player's season totals.",
      parameters: {
        type: "object",
        properties: { teamId: { type: "number" } },
        required: ["teamId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_player",
      description:
        "A player's current season (totals by team/schedule, game-by-game log, points-per-game trend) and past seasons back to 2023-24 for year-over-year comparison.",
      parameters: {
        type: "object",
        properties: { participantId: { type: "number" } },
        required: ["participantId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_leaders",
      description:
        "Scoring leaders for an age group (U9, U11, U13, U15, U17, U18), optionally one category, league and tier. Counts league, tiering and playoff games (not tournaments).",
      parameters: {
        type: "object",
        properties: {
          division: { type: "string", description: "e.g. U11" },
          category: { type: "string", enum: ["rep", "house", "female"] },
          league: { type: "string", description: "e.g. U11A or FVE U11C (optional)" },
          tier: { type: "string", description: "e.g. FVC Group 1 or Tier 2 (optional)" },
          stat: { type: "string", enum: ["points", "goals", "assists", "pim"] },
        },
        required: ["division"],
      },
    },
  },
] as const;

// ─── Indexes (built once per server instance; data changes only on redeploy) ───

interface TeamRef {
  teamId: number;
  name: string;
  division: string;
  category: HockeyCategory;
  href: string;
}

let teamIndex: Map<number, TeamRef> | null = null;

function teams(): Map<number, TeamRef> {
  if (teamIndex) return teamIndex;
  teamIndex = new Map();
  for (const category of CATEGORIES) {
    for (const div of getDivisionsForCategory(category)) {
      for (const data of Object.values(getFilteredStandings(div.name, category))) {
        for (const t of data.teams) {
          if (teamIndex.has(t.teamId)) continue;
          teamIndex.set(t.teamId, {
            teamId: t.teamId,
            name: t.teamName,
            division: div.name,
            category,
            href: `${SITE}/standings/${category}/${div.name.toLowerCase()}/team/${t.teamId}`,
          });
        }
      }
    }
  }
  return teamIndex;
}

function divisions(): string[] {
  return getActiveDivisions().map((d) => d.name);
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function round(n: number, places = 2): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

function gameDate(g: GameRow): string {
  return g.startTime
    ? new Date(g.startTime).toLocaleDateString("en-CA", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "America/Vancouver",
      })
    : (g.date ?? "");
}

// ─── Tools ───

function search(query: string) {
  const words = normalize(query).split(" ").filter(Boolean);
  if (words.length === 0) return { error: "empty query" };
  const match = (text: string) => {
    const t = normalize(text);
    return words.every((w) => t.includes(w));
  };

  const teamHits = [...teams().values()]
    .filter((t) => match(`${t.name} ${t.division} ${t.category}`))
    .slice(0, 10)
    .map((t) => ({ teamId: t.teamId, name: t.name, division: t.division, category: t.category }));

  const seen = new Set<string>();
  const playerHits: Array<Record<string, unknown>> = [];
  for (const div of divisions()) {
    for (const p of getDivisionPlayers(div)) {
      const key = `${p.participantId}-${p.teamId}`;
      if (seen.has(key) || p.name === "Name withheld") continue;
      if (!match(`${p.name} ${p.teamName}`)) continue;
      seen.add(key);
      playerHits.push({
        participantId: p.participantId,
        name: p.name,
        number: p.number,
        team: p.teamName,
        teamId: p.teamId,
        division: div,
      });
      if (playerHits.length >= 10) break;
    }
    if (playerHits.length >= 10) break;
  }

  // Past-season players who aren't on a team this season
  if (playerHits.length < 10) {
    for (const [pid, seasons] of Object.entries(getPlayerHistory())) {
      if (playerHits.some((h) => String(h.participantId) === pid)) continue;
      const last = seasons[seasons.length - 1];
      const name = last.name;
      if (!name || name === "Name withheld" || !match(name)) continue;
      playerHits.push({
        participantId: Number(pid),
        name,
        lastSeason: last.season,
        team: last.teamName,
        division: last.division,
      });
      if (playerHits.length >= 10) break;
    }
  }

  return { teams: teamHits, players: playerHits };
}

function getTeam(teamId: number) {
  const ref = teams().get(teamId);
  if (!ref) return { error: "team not found this season" };

  const schedules = Object.values(getDivisionStandings(ref.division))
    .flatMap((data) =>
      data.teams
        .filter((t) => t.teamId === teamId)
        .map((t) => ({
          schedule: data.scheduleName,
          type: getScheduleType(data),
          group: t.groupName,
          rank: t.gamesPlayed > 0 ? t.rank : null,
          teamsInGroup: data.teams.filter((x) => x.groupName === t.groupName).length,
          gp: t.gamesPlayed,
          w: t.wins,
          l: t.losses,
          t: t.ties,
          otl: t.otLosses,
          pts: t.points,
          gf: t.goalsFor,
          ga: t.goalsAgainst,
        }))
    );

  const games = Object.values(getDivisionGames(ref.division))
    .flat()
    .filter((g) => g.homeTeamId === teamId || g.awayTeamId === teamId)
    .sort((a, b) => (b.startTime ?? "").localeCompare(a.startTime ?? ""));
  const view = (g: GameRow) => {
    const home = g.homeTeamId === teamId;
    const us = home ? g.homeScore : g.awayScore;
    const them = home ? g.awayScore : g.homeScore;
    return {
      date: gameDate(g),
      opponent: home ? g.awayTeamName : g.homeTeamName,
      homeAway: home ? "home" : "away",
      result:
        g.status === "final"
          ? `${us! > them! ? "W" : us! < them! ? "L" : "T"} ${us}-${them}${g.decidedBy ? ` (${g.decidedBy})` : ""}`
          : g.status,
      rink: g.arena,
    };
  };

  const players = mergePlayerStats(
    getDivisionPlayers(ref.division).filter((p) => p.teamId === teamId)
  ).map((p) => ({
    participantId: p.participantId,
    name: p.name,
    number: p.number,
    position: p.position,
    gp: p.gamesPlayed,
    g: p.goals,
    a: p.assists,
    pts: p.points,
    pim: p.pim,
  }));

  return {
    team: ref.name,
    division: ref.division,
    category: ref.category,
    season: SEASON,
    page: ref.href,
    schedules,
    recentResults: games.filter((g) => g.status === "final").slice(0, 10).map(view),
    upcoming: games
      .filter((g) => g.status === "scheduled")
      .reverse()
      .slice(0, 5)
      .map(view),
    players,
    note: "All stats are based on game sheets. Player totals include tournaments.",
  };
}

function getPlayer(participantId: number) {
  const rows: Array<PlayerStat & { division: string }> = [];
  for (const div of divisions()) {
    for (const p of getDivisionPlayers(div)) {
      if (p.participantId === participantId) rows.push({ ...p, division: div });
    }
  }

  const history = (getPlayerHistory()[String(participantId)] ?? []).map((h) => ({
    season: h.season,
    division: h.division,
    team: h.teamName,
    type: h.type,
    gp: h.gamesPlayed,
    g: h.goals,
    a: h.assists,
    pts: h.points,
    pim: h.pim,
    ppg: h.gamesPlayed > 0 ? round(h.points / h.gamesPlayed) : null,
  }));

  if (rows.length === 0 && history.length === 0) return { error: "player not found" };
  if (rows.some((r) => r.name === "Name withheld")) {
    return { error: "This player's name has been withheld at the family's request." };
  }

  // Current season, per schedule and overall (league + tiering + playoffs; tournaments listed separately)
  const bySchedule = rows.map((p) => ({
    team: p.teamName,
    schedule: p.scheduleName,
    type: getScheduleType(p),
    gp: p.gamesPlayed,
    g: p.goals,
    a: p.assists,
    pts: p.points,
    pim: p.pim,
  }));
  const nonTournament = rows.filter((p) => getScheduleType(p) !== "Tournament");
  const total = mergePlayerStats(nonTournament)[0];

  // Game-by-game: every final game of the player's team(s), with the player's G/A/PIM (0 if none)
  const division = rows[0]?.division;
  const teamIds = new Set(rows.map((r) => r.teamId));
  const log = division ? (getDivisionGameLogs(division)[String(participantId)] ?? []) : [];
  const byGame = new Map(log.map((r) => [r[0], r]));
  const games = division
    ? Object.values(getDivisionGames(division))
        .flat()
        .filter(
          (g) =>
            g.status === "final" && (teamIds.has(g.homeTeamId) || teamIds.has(g.awayTeamId))
        )
        .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""))
    : [];
  const gameLog = games.map((g) => {
    const r = byGame.get(g.id);
    const home = teamIds.has(g.homeTeamId);
    return {
      date: gameDate(g),
      opponent: home ? g.awayTeamName : g.homeTeamName,
      g: r ? r[2] : 0,
      a: r ? r[3] : 0,
      pim: r ? r[4] : 0,
    };
  });
  const pts = (x: { g: number; a: number }) => x.g + x.a;
  const last5 = gameLog.slice(-5);
  const trend =
    gameLog.length >= 6
      ? {
          seasonPointsPerGame: round(gameLog.reduce((s, x) => s + pts(x), 0) / gameLog.length),
          last5PointsPerGame: round(last5.reduce((s, x) => s + pts(x), 0) / last5.length),
        }
      : null;

  const pastRaw = getPlayerHistory()[String(participantId)] ?? [];
  const name = rows[0]?.name ?? pastRaw[pastRaw.length - 1]?.name;
  if (name === "Name withheld") {
    return { error: "This player's name has been withheld at the family's request." };
  }
  const team = rows[0] ? teams().get(rows[0].teamId) : undefined;

  return {
    name,
    number: rows[0]?.number ?? pastRaw[pastRaw.length - 1]?.number,
    position: rows[0]?.position || undefined,
    season: SEASON,
    teamPage: team?.href,
    currentSeason: total
      ? {
          gp: total.gamesPlayed,
          g: total.goals,
          a: total.assists,
          pts: total.points,
          pim: total.pim,
          ppg: total.gamesPlayed > 0 ? round(total.points / total.gamesPlayed) : null,
        }
      : null,
    bySchedule,
    gameLog: gameLog.slice(-20),
    trend,
    pastSeasons: history,
    notes: [
      "All stats are based on game sheets.",
      "Moving up a tier (or age group) usually lowers points against tougher opponents; that is not a decline.",
      "Past seasons start in 2023-24; Spordle has no player stats before that.",
    ],
  };
}

function getLeaders(args: {
  division: string;
  category?: HockeyCategory;
  league?: string;
  tier?: string;
  stat?: "points" | "goals" | "assists" | "pim";
}) {
  const division = String(args.division ?? "").toUpperCase();
  if (!divisions().includes(division)) {
    return { error: `unknown division; try one of ${divisions().join(", ")}` };
  }
  const cats = args.category ? [args.category] : CATEGORIES;
  const stat = args.stat ?? "points";
  const out: Array<Record<string, unknown>> = [];

  for (const category of cats) {
    const teamDivs = getTeamDivisions(division, category);
    const inCategory = new Set(
      Object.values(getFilteredStandings(division, category)).flatMap((s) =>
        s.teams.map((t) => t.teamId)
      )
    );
    const players = mergePlayerStats(
      getDivisionPlayers(division).filter(
        (p) => inCategory.has(p.teamId) && getScheduleType(p) !== "Tournament"
      )
    )
      .filter((p) => p.gamesPlayed > 0)
      .map((p) => ({
        p,
        league: teamDivs.get(p.teamId)?.league ?? null,
        tier: teamDivs.get(p.teamId)?.group ?? null,
      }))
      .filter(
        (x) =>
          (!args.league || normalize(x.league ?? "") === normalize(args.league)) &&
          (!args.tier || normalize(x.tier ?? "") === normalize(args.tier))
      );

    const value = (p: PlayerStat) =>
      stat === "goals" ? p.goals : stat === "assists" ? p.assists : stat === "pim" ? p.pim : p.points;
    players.sort((a, b) => value(b.p) - value(a.p) || b.p.goals - a.p.goals);
    for (const { p, league, tier } of players.slice(0, 10)) {
      out.push({
        category,
        league,
        tier,
        name: p.name,
        number: p.number,
        team: p.teamName,
        gp: p.gamesPlayed,
        g: p.goals,
        a: p.assists,
        pts: p.points,
        pim: p.pim,
      });
    }
  }

  return {
    division,
    stat,
    page: `${SITE}/leaders/${cats[0]}/${division.toLowerCase()}`,
    leaders: out,
    note: "Counts league, tiering and playoff games; tournaments are not included.",
  };
}

/** Run one tool call from the model. Always returns a JSON string (errors included). */
export function runAgentTool(name: string, rawArgs: string): string {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return JSON.stringify({ error: "arguments were not valid JSON" });
  }
  try {
    let result: unknown;
    switch (name) {
      case "search":
        result = search(String(args.query ?? ""));
        break;
      case "get_team":
        result = getTeam(Number(args.teamId));
        break;
      case "get_player":
        result = getPlayer(Number(args.participantId));
        break;
      case "get_leaders":
        result = getLeaders(args as Parameters<typeof getLeaders>[0]);
        break;
      default:
        result = { error: `unknown tool ${name}` };
    }
    const text = JSON.stringify(result);
    // Keep each tool result a reasonable size for the model (and the bill)
    return text.length > 14_000 ? text.slice(0, 14_000) + '..."(truncated)"' : text;
  } catch (e) {
    return JSON.stringify({ error: e instanceof Error ? e.message : "lookup failed" });
  }
}
