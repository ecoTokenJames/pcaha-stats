#!/usr/bin/env node
/**
 * PCAHA Stats Scraper
 *
 * Pulls all team standings and player stats from the Spordle Play API.
 * Run daily to keep stats up to date.
 *
 * Usage:
 *   node scraper/scrape.js              # Full scrape (all divisions, all data)
 *   node scraper/scrape.js --standings   # Only team standings (fast)
 *   node scraper/scrape.js --division U15 # Only one division
 */

const fs = require('fs');
const path = require('path');
const api = require('./api');

const DATA_DIR = process.env.PCAHA_DATA_DIR || path.join(__dirname, '..', 'data');
const SEASON = process.env.PCAHA_SEASON || currentSeason();

/**
 * Season id like "2026-27". Rolls over on Aug 1, when the new season's
 * schedules start appearing in Spordle. Override with PCAHA_SEASON.
 */
function currentSeason(now = new Date()) {
  const startYear = now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

// Divisions we care about (U9-U18)
const TARGET_DIVISIONS = ['U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18'];

const WANTED_TYPES = ['League', 'Playoffs', 'Placement', 'Tournament'];

/**
 * Keep League/Playoffs/Placement/Tournament schedules, minus ones whose games
 * happen outside PCAHA (out-of-district tournaments, camps, tryouts, etc).
 */
function isWantedSchedule(s) {
  if (!WANTED_TYPES.includes(s.type)) return false;
  const name = (s.name || '').toLowerCase();
  const isExcluded = name.includes('pre-season') || name.includes('exhibition') ||
    name.includes('tryout') || name.includes('camp') || name.includes('spring') ||
    name.includes('out of district') || name.includes('out-of-district') ||
    name.includes('showcase') || name.includes('jamboree') || name.includes('celebration') ||
    name.includes('face-off') || name.includes('face off') ||
    /\btest\b/.test(name);
  return !isExcluded;
}

/** Schedule fields copied onto standings and player rows */
function scheduleFields(schedule) {
  return {
    scheduleType: schedule.type,
    startDate: (schedule.startDate || '').slice(0, 10),
    endDate: (schedule.endDate || '').slice(0, 10),
  };
}

/**
 * Final score from a boxscore: goals per team, plus OT / shootout flags.
 */
function scoreFromBoxscore(boxscore, game) {
  const goals = boxscore.goals || [];
  const homeScore = goals.filter(g => g.teamId === game.homeTeamId).length;
  const awayScore = goals.filter(g => g.teamId === game.awayTeamId).length;
  const shootout = boxscore.shootout || [];
  let decidedBy = null;
  if (shootout.length > 0) decidedBy = 'SO';
  else if (goals.some(g => g.gameTime?.period === 'OT')) decidedBy = 'OT';
  return { homeScore, awayScore, decidedBy };
}

const arenaCache = {};
async function arenaName(arenaId) {
  if (!arenaId) return null;
  if (!(arenaId in arenaCache)) {
    try {
      const arena = await api.getArena(arenaId);
      arenaCache[arenaId] = arena ? [arena.name, arena.rink].filter(Boolean).join(' ') : null;
    } catch {
      arenaCache[arenaId] = null;
    }
  }
  return arenaCache[arenaId];
}

/**
 * One game as shown on the site. Score is filled in once the boxscore is read.
 */
async function gameRow(game, groupNames) {
  let status = 'scheduled';
  if (game.status === 'Cancelled') status = 'cancelled';
  else if (game.status === 'Postponed') status = 'postponed';
  else if (game.startTime && new Date(game.startTime) < new Date()) status = 'awaiting';
  return {
    id: game.id,
    number: game.number || null,
    date: game.date || null,
    startTime: game.startTime || null,
    groupId: game.groupId ?? null,
    groupName: groupNames[game.groupId] || null,
    homeTeamId: game.homeTeamId,
    homeTeamName: game.homeTeam?.name || 'TBD',
    awayTeamId: game.awayTeamId,
    awayTeamName: game.awayTeam?.name || 'TBD',
    homeScore: null,
    awayScore: null,
    decidedBy: null,
    status,
    arena: await arenaName(game.arenaId),
  };
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function saveJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

/**
 * Step 1: Fetch division metadata and filter to target divisions
 */
async function fetchDivisions() {
  log('Fetching divisions...');
  const allDivisions = await api.getDivisions();
  const divisions = allDivisions.filter(d => TARGET_DIVISIONS.includes(d.name));
  log(`Found ${divisions.length} target divisions: ${divisions.map(d => d.name).join(', ')}`);
  return divisions;
}

/**
 * Step 2: Fetch all schedules (leagues) for each division
 */
async function fetchSchedules(divisions) {
  log('Fetching schedules for all divisions...');
  const allSchedules = [];

  for (const division of divisions) {
    const schedules = await api.getSchedules(SEASON, division.id);
    if (!schedules) continue;

    // Use Spordle's own schedule type (League / Playoffs / Placement / Tournament).
    // Matching on names missed rounds like "FVW U11C Balancing" (a Placement round).
    const filtered = schedules.filter(s => isWantedSchedule(s));

    for (const schedule of filtered) {
      allSchedules.push({
        ...schedule,
        divisionName: division.name,
        divisionId: division.id,
      });
    }

    log(`  ${division.name}: ${filtered.length} schedules (of ${schedules.length} total)`);
  }

  log(`Total schedules to process: ${allSchedules.length}`);
  return allSchedules;
}

/**
 * Step 3: Fetch team standings for each schedule
 */
async function fetchStandings(schedules) {
  log('Fetching team standings...');
  const standings = {};

  for (const schedule of schedules) {
    try {
      const teamStats = await api.getTeamStats(schedule.id);
      if (!teamStats || teamStats.length === 0) continue;

      standings[schedule.id] = {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        divisionName: schedule.divisionName,
        categoryName: schedule.category?.name || '',
        ...scheduleFields(schedule),
        teams: teamStats.map(ts => ({
          rank: ts.ranking,
          teamId: ts.teamId,
          teamName: ts.team?.name || 'Unknown',
          teamShortName: ts.team?.shortName || null,
          teamLogoUrl: ts.team?.logoUrl || null,
          gamesPlayed: ts.gamesPlayed,
          wins: ts.wins,
          losses: ts.losses,
          ties: ts.ties,
          otWins: ts.otw,
          otLosses: ts.otl,
          points: ts.points,
          pointsPct: ts.pointsPct,
          goalsFor: ts.goalFor,
          goalsAgainst: ts.goalAgainst,
          diff: ts.diff,
          gfPerGame: ts.goalForPerGame,
          gaPerGame: ts.goalAgainstPerGame,
          pim: ts.pim,
          pimPerGame: ts.pimPerGame,
          groupName: ts.group?.name || null,
          groupId: ts.group?.id ?? null,
        })),
      };

      log(`  ${schedule.divisionName} - ${schedule.name}: ${teamStats.length} teams`);
    } catch (e) {
      log(`  ERROR: ${schedule.name}: ${e.message}`);
    }
  }

  return standings;
}

const PLAYER_POSITIONS = new Set(['F', 'D', 'G', 'C', 'LW', 'RW', 'W']);

/**
 * Players who dressed, from one team's game-sheet lineup: skaters and goalies listed
 * (members + extras such as call-ups), minus staff and anyone serving a suspension.
 */
function dressedPlayers(lineup) {
  const seen = new Set();
  const out = [];
  for (const m of [...(lineup.members || []), ...(lineup.extras || [])]) {
    if (!m.participantId || seen.has(m.participantId)) continue;
    if (m.suspension) continue; // listed on the sheet but serving a suspension
    if (!(m.positions || []).some(p => PLAYER_POSITIONS.has(p))) continue;
    seen.add(m.participantId);
    out.push(m);
  }
  return out;
}

/**
 * Step 4: Fetch all games and boxscores for player stats
 */
async function fetchPlayerStats(schedules, groupNames) {
  log('Fetching games and player stats...');
  // scheduleId -> game rows (scores, dates, tier group) for the Games tab
  const gamesBySchedule = {};
  // division -> participantId -> [[gameId, scheduleId, goals, assists, pim], ...] (games with events)
  const gameLogs = {};
  // Keyed by `${participantId}-${scheduleId}` so stats are per-schedule
  const playerMap = {};
  const teamPlayerMap = {}; // teamId -> Set of participantIds
  // `${teamId}-${scheduleId}` -> { games: games with a lineup, played: {pid: games dressed}, members: {pid: lineup entry} }
  const lineupStats = {};
  let totalGames = 0;
  let processedGames = 0;

  for (const schedule of schedules) {
    log(`  Fetching games for ${schedule.divisionName} - ${schedule.name}...`);
    const schedId = schedule.id;

    try {
      const games = await api.getGames(schedule.id);
      if (!games || games.length === 0) continue;

      const rows = {};
      for (const g of games) rows[g.id] = await gameRow(g, groupNames);
      gamesBySchedule[schedId] = Object.values(rows);

      // Process certified games, plus approved games with team stats (tournament games aren't certified)
      const completedGames = games.filter(g => g.isCertified || (g.isApproved && g.homeTeamStats && g.awayTeamStats));
      totalGames += completedGames.length;
      log(`    ${completedGames.length} completed games (of ${games.length} total)`);

      // Fetch boxscores in batches
      const gameIds = completedGames.map(g => g.id);

      for (let i = 0; i < gameIds.length; i += 5) {
        const batch = gameIds.slice(i, i + 5);
        // Game sheets carry the lineups (who actually dressed); optional, GP falls back without them
        const sheetsP = Promise.all(batch.map(gameId => api.getScoresheet(gameId).catch(() => null)));
        const boxscores = await Promise.all(
          batch.map(async (gameId) => {
            try {
              return await api.getBoxscore(gameId);
            } catch (e) {
              log(`  WARN: boxscore ${gameId} failed: ${e.message}`);
              return null;
            }
          })
        );
        const sheets = await sheetsP;

        for (let j = 0; j < batch.length; j++) {
          const boxscore = boxscores[j];
          const game = completedGames.find(g => g.id === batch[j]);
          if (!boxscore || !game) continue;

          // Spordle marks some future games approved; only a game that has started has a result
          if (game.startTime && new Date(game.startTime) < new Date()) {
            Object.assign(rows[game.id], scoreFromBoxscore(boxscore, game), { status: 'final' });
          }

          // Track which players played in this game (composite keys)
          const gamePlayers = new Set();
          // This game's goals/assists/PIM per player, for the game-by-game log
          const perGame = {};
          const bump = (pid, field, n = 1) => {
            (perGame[pid] ||= { g: 0, a: 0, pim: 0 })[field] += n;
          };

          // Process goals
          for (const goal of (boxscore.goals || [])) {
            if (!goal.participant) continue;
            const pid = goal.participant.participantId;
            const key = `${pid}-${schedId}`;

            // Initialize player if new for this schedule
            if (!playerMap[key]) {
              playerMap[key] = {
                participantId: pid,
                name: goal.participant.fullName,
                number: goal.participant.number,
                teamId: goal.teamId,
                teamName: '',
                divisionName: schedule.divisionName,
                scheduleName: schedule.name,
                scheduleId: schedId,
                categoryName: schedule.category?.name || '',
                scheduleType: schedule.type,
                goals: 0,
                assists: 0,
                points: 0,
                pim: 0,
                ppGoals: 0,
                shGoals: 0,
                gwGoals: 0,
                gamesPlayed: 0,
                isAffiliate: goal.participant.isAffiliate || false,
                position: '',
              };
            }

            playerMap[key].goals++;
            playerMap[key].points++;
            bump(pid, 'g');
            if (goal.isPowerplay) playerMap[key].ppGoals++;
            if (goal.isShorthanded) playerMap[key].shGoals++;
            gamePlayers.add(key);

            // Set team name from game data
            const team = boxscore.teams?.find(t => t.id === goal.teamId);
            if (team) playerMap[key].teamName = team.name;

            // Track team membership
            if (!teamPlayerMap[goal.teamId]) teamPlayerMap[goal.teamId] = new Set();
            teamPlayerMap[goal.teamId].add(pid);

            // Process assists
            for (const assist of (goal.assists || [])) {
              const apid = assist.participantId;
              const akey = `${apid}-${schedId}`;
              if (!playerMap[akey]) {
                playerMap[akey] = {
                  participantId: apid,
                  name: assist.fullName,
                  number: assist.number,
                  teamId: goal.teamId, // Same team as the scorer
                  teamName: team?.name || '',
                  divisionName: schedule.divisionName,
                  scheduleName: schedule.name,
                  scheduleId: schedId,
                  categoryName: schedule.category?.name || '',
                  scheduleType: schedule.type,
                  goals: 0,
                  assists: 0,
                  points: 0,
                  pim: 0,
                  ppGoals: 0,
                  shGoals: 0,
                  gwGoals: 0,
                  gamesPlayed: 0,
                  isAffiliate: assist.isAffiliate || false,
                  position: '',
                };
              }
              playerMap[akey].assists++;
              playerMap[akey].points++;
              bump(apid, 'a');
              gamePlayers.add(akey);

              if (!teamPlayerMap[goal.teamId]) teamPlayerMap[goal.teamId] = new Set();
              teamPlayerMap[goal.teamId].add(apid);
            }
          }

          // Process penalties
          for (const penalty of (boxscore.penalties || [])) {
            if (!penalty.participant) continue;
            const pid = penalty.participant.participantId;
            const key = `${pid}-${schedId}`;

            if (!playerMap[key]) {
              playerMap[key] = {
                participantId: pid,
                name: penalty.participant.fullName,
                number: penalty.participant.number,
                teamId: penalty.teamId,
                teamName: '',
                divisionName: schedule.divisionName,
                scheduleName: schedule.name,
                scheduleId: schedId,
                categoryName: schedule.category?.name || '',
                scheduleType: schedule.type,
                goals: 0,
                assists: 0,
                points: 0,
                pim: 0,
                ppGoals: 0,
                shGoals: 0,
                gwGoals: 0,
                gamesPlayed: 0,
                isAffiliate: penalty.participant.isAffiliate || false,
                position: '',
              };
            }

            // Calculate PIM based on penalty duration
            const durName = (penalty.duration?.name || '').toLowerCase();
            let pimValue = 2; // default minor
            if (durName.includes('major')) pimValue = 5;
            else if (durName.includes('misconduct') && durName.includes('game')) pimValue = 10;
            else if (durName.includes('misconduct')) pimValue = 10;
            else if (durName.includes('match')) pimValue = 5;

            playerMap[key].pim += pimValue;
            bump(pid, 'pim', pimValue);
            gamePlayers.add(key);

            const team = boxscore.teams?.find(t => t.id === penalty.teamId);
            if (team) playerMap[key].teamName = team.name;

            if (!teamPlayerMap[penalty.teamId]) teamPlayerMap[penalty.teamId] = new Set();
            teamPlayerMap[penalty.teamId].add(pid);
          }

          const started = game.startTime && new Date(game.startTime) < new Date();

          // Lineups: who dressed for each team (anyone with a goal, assist or penalty counts too)
          const lineups = started ? sheets[j]?.scoresheet?.lineups : null;
          for (const lineup of Object.values(lineups || {})) {
            const dressed = dressedPlayers(lineup);
            if (dressed.length === 0) continue; // empty sheet: treat this game as unknown
            const t = (lineupStats[`${lineup.teamId}-${schedId}`] ||= { games: 0, played: {}, members: {} });
            t.games++;
            const ids = new Set(dressed.map(m => m.participantId));
            for (const key of gamePlayers) {
              if (playerMap[key]?.teamId === lineup.teamId) ids.add(playerMap[key].participantId);
            }
            for (const pid of ids) t.played[pid] = (t.played[pid] || 0) + 1;
            for (const m of dressed) t.members[m.participantId] ||= m;
            // Dressed but no points or penalties: still a game in their log
            for (const pid of ids) perGame[pid] ||= { g: 0, a: 0, pim: 0 };
          }

          // Game-by-game log (only games that have actually started)
          if (started) {
            const divLog = (gameLogs[schedule.divisionName] ||= {});
            for (const [pid, e] of Object.entries(perGame)) {
              (divLog[pid] ||= []).push([game.id, schedId, e.g, e.a, e.pim]);
            }
          }

          // Increment games played for all players who appeared in this game
          for (const key of gamePlayers) {
            if (playerMap[key]) playerMap[key].gamesPlayed++;
          }

          processedGames++;
        }

        // Rate limiting
        await api.sleep(50);
      }

      // Progress update
      if (processedGames % 100 === 0 || processedGames === totalGames) {
        log(`    Processed ${processedGames}/${totalGames} games`);
      }
    } catch (e) {
      log(`  ERROR fetching games for ${schedule.name}: ${e.message}`);
    }
  }

  log(`Processed ${processedGames} games total, found ${Object.keys(playerMap).length} player-schedule entries`);
  return { playerMap, teamPlayerMap, gamesBySchedule, gameLogs, lineupStats, totalGames: processedGames };
}

/**
 * Step 5: Fetch team rosters and set each player's GP.
 * GP = games the player dressed for (from game-sheet lineups), plus the team's games
 * that have no lineup on file (we can't tell who played those, so everyone gets them).
 * Also adds roster players and dressed call-ups who never appeared in a boxscore.
 */
async function enrichWithRosters(playerMap, standings, schedules, lineupStats = {}) {
  log('Fetching team rosters to fix GP...');

  // Build a list of all team-schedule entries (one entry per team per schedule)
  const teamScheduleEntries = [];
  const uniqueTeamIds = new Set();
  for (const [schedId, data] of Object.entries(standings)) {
    const schedule = schedules.find(s => s.id === parseInt(schedId));
    if (!schedule) continue;

    for (const team of data.teams) {
      // A team can sit in several groups of one schedule (e.g. playoff rounds);
      // its games in this schedule are the sum across those groups
      const existing = teamScheduleEntries.find(
        e => e.teamId === team.teamId && e.scheduleId === parseInt(schedId)
      );
      if (existing) {
        existing.gamesPlayed += team.gamesPlayed;
        continue;
      }
      teamScheduleEntries.push({
        teamId: team.teamId,
        teamName: team.teamName,
        gamesPlayed: team.gamesPlayed,
        divisionName: data.divisionName,
        scheduleName: data.scheduleName,
        scheduleId: parseInt(schedId),
        categoryName: data.categoryName,
        scheduleType: data.scheduleType,
      });
      uniqueTeamIds.add(team.teamId);
    }
  }

  const teamIds = Array.from(uniqueTeamIds);
  log(`  Fetching rosters for ${teamIds.length} teams (${teamScheduleEntries.length} team-schedule entries)...`);

  // Cache rosters by teamId (same roster serves multiple schedules)
  const rosterCache = {};
  let fetched = 0;

  for (let i = 0; i < teamIds.length; i += 5) {
    const batch = teamIds.slice(i, i + 5);
    const rosters = await Promise.all(
      batch.map(async (teamId) => {
        try {
          const members = await api.getTeamMembers(teamId);
          return { teamId, members: members || [] };
        } catch (e) {
          log(`  WARN: roster for team ${teamId} failed: ${e.message}`);
          return { teamId, members: [] };
        }
      })
    );

    for (const { teamId, members } of rosters) {
      // Filter to actual players (have a jersey number)
      rosterCache[teamId] = members.filter(m => m.number && m.number > 0 && m.participant);
    }

    fetched += batch.length;
    if (fetched % 100 === 0 || fetched >= teamIds.length) {
      log(`  Fetched ${fetched}/${teamIds.length} rosters`);
    }

    await api.sleep(50);
  }

  // Now create/update player entries for EACH team-schedule combination
  let rosterPlayers = 0;
  let newEntries = 0;
  const gpFor = (entry, pid) => {
    const l = lineupStats[`${entry.teamId}-${entry.scheduleId}`];
    if (!l) return entry.gamesPlayed;
    // Capped at the team's GP: standings can lag a game behind the sheets
    return Math.min(entry.gamesPlayed, (l.played[pid] || 0) + Math.max(0, entry.gamesPlayed - l.games));
  };

  for (const entry of teamScheduleEntries) {
    const roster = rosterCache[entry.teamId];
    if (!roster) continue;

    // Call-ups who dressed for this team but aren't on its roster
    const rosterIds = new Set(roster.map(m => m.participantId));
    const l = lineupStats[`${entry.teamId}-${entry.scheduleId}`];
    const callUps = Object.values(l?.members || {})
      .filter(m => !rosterIds.has(m.participantId))
      .map(m => ({ ...m, number: m.number || 0, isAffiliate: true }));

    for (const member of [...roster, ...callUps]) {
      const pid = member.participantId;
      const key = `${pid}-${entry.scheduleId}`;
      rosterPlayers++;

      // Normalize position: C → F, keep D/F/G as-is
      const rawPos = (member.positions && member.positions[0]) || '';
      const position = rawPos === 'C' ? 'F' : (['F', 'D', 'G'].includes(rawPos) ? rawPos : '');

      if (playerMap[key]) {
        // Player exists from boxscore data for this schedule — update GP and position
        playerMap[key].gamesPlayed = gpFor(entry, pid);
        playerMap[key].position = position;
      } else {
        // New entry — player on roster but didn't appear in boxscore for this schedule
        newEntries++;
        playerMap[key] = {
          participantId: pid,
          name: member.participant.fullName || 'Unknown',
          number: member.number || 0,
          teamId: entry.teamId,
          teamName: entry.teamName,
          divisionName: entry.divisionName,
          scheduleName: entry.scheduleName,
          scheduleId: entry.scheduleId,
          categoryName: entry.categoryName,
          scheduleType: entry.scheduleType,
          goals: 0,
          assists: 0,
          points: 0,
          pim: 0,
          ppGoals: 0,
          shGoals: 0,
          gwGoals: 0,
          gamesPlayed: gpFor(entry, pid),
          isAffiliate: member.isAffiliate || false,
          position,
        };
      }
    }
  }

  log(`  Roster enrichment: ${rosterPlayers} roster-schedule entries processed, ${newEntries} new entries added`);
}

/**
 * Main scraper function
 */
async function main() {
  const args = process.argv.slice(2);
  const standingsOnly = args.includes('--standings');
  const divisionFilter = args.includes('--division') ? args[args.indexOf('--division') + 1] : null;

  const startTime = Date.now();
  log('=== PCAHA Stats Scraper ===');
  log(`Season: ${SEASON}`);
  if (standingsOnly) log('Mode: Standings only');
  if (divisionFilter) log(`Division filter: ${divisionFilter}`);

  // Step 1: Get divisions
  let divisions = await fetchDivisions();
  if (divisionFilter) {
    divisions = divisions.filter(d => d.name === divisionFilter);
    if (divisions.length === 0) {
      log(`ERROR: Division ${divisionFilter} not found`);
      process.exit(1);
    }
  }

  // Step 2: Get schedules
  const schedules = await fetchSchedules(divisions);

  // Save schedule metadata
  const scheduleMeta = schedules.map(s => ({
    id: s.id,
    name: s.name,
    divisionName: s.divisionName,
    categoryName: s.category?.name || '',
    groupId: s.groupId,
    ...scheduleFields(s),
  }));
  saveJson(path.join(DATA_DIR, 'meta', 'schedules.json'), scheduleMeta);
  saveJson(path.join(DATA_DIR, 'meta', 'divisions.json'), divisions.map(d => ({
    id: d.id,
    name: d.name,
  })));

  // Step 3: Fetch standings
  const standings = await fetchStandings(schedules);
  saveJson(path.join(DATA_DIR, 'standings', 'all-standings.json'), standings);

  // Also save per-division standings files
  for (const division of divisions) {
    const divStandings = {};
    for (const [schedId, data] of Object.entries(standings)) {
      if (data.divisionName === division.name) {
        divStandings[schedId] = data;
      }
    }
    if (Object.keys(divStandings).length > 0) {
      saveJson(path.join(DATA_DIR, 'standings', `${division.name.toLowerCase()}.json`), divStandings);
    }
  }

  log(`Saved standings for ${Object.keys(standings).length} schedules`);

  // Step 4: Fetch player stats (unless --standings flag)
  if (!standingsOnly) {
    const groupNames = {};
    for (const data of Object.values(standings)) {
      for (const t of data.teams) if (t.groupId != null) groupNames[t.groupId] = t.groupName;
    }
    const { playerMap, gamesBySchedule, gameLogs, lineupStats } = await fetchPlayerStats(schedules, groupNames);

    // Game-by-game player logs per division (used by the stats agent for trends)
    for (const [div, log] of Object.entries(gameLogs)) {
      saveJson(path.join(DATA_DIR, 'gamelogs', `${div.toLowerCase()}.json`), log);
    }

    // Save game results/schedule per division, newest first
    for (const division of divisions) {
      const divGames = {};
      for (const schedule of schedules) {
        if (schedule.divisionName !== division.name || !gamesBySchedule[schedule.id]) continue;
        divGames[schedule.id] = gamesBySchedule[schedule.id].sort((a, b) =>
          (b.startTime || '').localeCompare(a.startTime || ''));
      }
      if (Object.keys(divGames).length > 0) {
        saveJson(path.join(DATA_DIR, 'games', `${division.name.toLowerCase()}.json`), divGames);
      }
    }

    // Step 5: Fetch team rosters and fix GP
    // The boxscore only records players who scored/assisted/penalized.
    // Game-sheet lineups say who dressed; team GP from standings covers games without one.
    await enrichWithRosters(playerMap, standings, schedules, lineupStats);

    // Convert player map to sorted arrays
    // Removal requests: keep the stats, withhold the name
    const hidden = new Set(
      (require('./hidden-players.json').hidden || []).map(h => Number(h.participantId ?? h))
    );
    for (const p of Object.values(playerMap)) {
      if (hidden.has(p.participantId)) p.name = 'Name withheld';
    }
    if (hidden.size > 0) log(`  Withheld ${hidden.size} player name(s) on request`);

    const players = Object.values(playerMap).sort((a, b) => b.points - a.points);
    saveJson(path.join(DATA_DIR, 'players', 'all-players.json'), players);

    // Save per-division player files
    for (const division of divisions) {
      const divPlayers = players.filter(p => p.divisionName === division.name);
      if (divPlayers.length > 0) {
        saveJson(path.join(DATA_DIR, 'players', `${division.name.toLowerCase()}.json`), divPlayers);
      }
    }

    // Generate league leaders
    const leaders = generateLeaders(players, divisions);
    saveJson(path.join(DATA_DIR, 'players', 'leaders.json'), leaders);

    log(`Saved ${players.length} player stats`);
  }

  // Save scrape metadata
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  saveJson(path.join(DATA_DIR, 'meta', 'last-scrape.json'), {
    timestamp: new Date().toISOString(),
    season: SEASON,
    divisionsScraped: divisions.map(d => d.name),
    schedulesProcessed: schedules.length,
    standingsTeams: Object.values(standings).reduce((sum, s) => sum + s.teams.length, 0),
    elapsedSeconds: parseFloat(elapsed),
    standingsOnly,
  });

  log(`=== Done in ${elapsed}s ===`);
}

/**
 * Generate league leaders (top scorers, etc.)
 */
function generateLeaders(players, divisions) {
  const leaders = {};

  for (const division of divisions) {
    // Only use regular season (League) entries for leaders, skip playoff/placement duplicates
    const divPlayers = players.filter(p =>
      p.divisionName === division.name &&
      p.gamesPlayed >= 3 &&
      !p.scheduleName.toLowerCase().includes('playoff') &&
      !p.scheduleName.toLowerCase().includes('placement')
    );

    leaders[division.name] = {
      topScorers: divPlayers
        .sort((a, b) => b.points - a.points || b.goals - a.goals)
        .slice(0, 25)
        .map(p => ({ ...p })),
      topGoals: divPlayers
        .sort((a, b) => b.goals - a.goals || b.points - a.points)
        .slice(0, 25)
        .map(p => ({ ...p })),
      topAssists: divPlayers
        .sort((a, b) => b.assists - a.assists || b.points - a.points)
        .slice(0, 25)
        .map(p => ({ ...p })),
      topPIM: divPlayers
        .sort((a, b) => b.pim - a.pim)
        .slice(0, 25)
        .map(p => ({ ...p })),
    };
  }

  return leaders;
}

main().catch(e => {
  console.error('SCRAPER ERROR:', e);
  process.exit(1);
});
