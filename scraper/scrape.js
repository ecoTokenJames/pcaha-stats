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
const config = require('./config.json');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SEASON = config.season;

// Divisions we care about (U9-U18)
const TARGET_DIVISIONS = ['U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18'];

// Schedule types we want (skip pre-season, tryouts, etc.)
const WANTED_SCHEDULE_TYPES = ['Regular Season', 'Playoffs', 'League'];

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

    // Filter to regular season and playoff schedules
    const filtered = schedules.filter(s => {
      const name = (s.name || '').toLowerCase();
      const isLeague = name.includes('league');
      const isPlayoff = name.includes('playoff');
      const isPlacement = name.includes('placement');
      // Exclude: pre-season, exhibition, tryouts, tournaments out-of-district, camps
      const isExcluded = name.includes('pre-season') || name.includes('exhibition') ||
        name.includes('tryout') || name.includes('camp') || name.includes('spring') ||
        name.includes('out of district') || name.includes('out-of-district');
      return (isLeague || isPlayoff || isPlacement) && !isExcluded;
    });

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
        })),
      };

      log(`  ${schedule.divisionName} - ${schedule.name}: ${teamStats.length} teams`);
    } catch (e) {
      log(`  ERROR: ${schedule.name}: ${e.message}`);
    }
  }

  return standings;
}

/**
 * Step 4: Fetch all games and boxscores for player stats
 */
async function fetchPlayerStats(schedules) {
  log('Fetching games and player stats...');
  const playerMap = {}; // participantId -> { name, number, teamId, goals, assists, pim, gp, ... }
  const teamPlayerMap = {}; // teamId -> Set of participantIds
  let totalGames = 0;
  let processedGames = 0;

  for (const schedule of schedules) {
    log(`  Fetching games for ${schedule.divisionName} - ${schedule.name}...`);

    try {
      const games = await api.getGames(schedule.id);
      if (!games || games.length === 0) continue;

      // Only process certified/completed games
      const completedGames = games.filter(g => g.isCertified);
      totalGames += completedGames.length;
      log(`    ${completedGames.length} completed games (of ${games.length} total)`);

      // Fetch boxscores in batches
      const gameIds = completedGames.map(g => g.id);

      for (let i = 0; i < gameIds.length; i += 5) {
        const batch = gameIds.slice(i, i + 5);
        const boxscores = await Promise.all(
          batch.map(async (gameId) => {
            try {
              return await api.getBoxscore(gameId);
            } catch (e) {
              return null;
            }
          })
        );

        for (let j = 0; j < batch.length; j++) {
          const boxscore = boxscores[j];
          const game = completedGames.find(g => g.id === batch[j]);
          if (!boxscore || !game) continue;

          // Track which players played in this game
          const gamePlayers = new Set();

          // Process goals
          for (const goal of (boxscore.goals || [])) {
            if (!goal.participant) continue;
            const pid = goal.participant.participantId;

            // Initialize player if new
            if (!playerMap[pid]) {
              playerMap[pid] = {
                participantId: pid,
                name: goal.participant.fullName,
                number: goal.participant.number,
                teamId: goal.teamId,
                teamName: '',
                divisionName: schedule.divisionName,
                scheduleName: schedule.name,
                scheduleId: schedule.id,
                categoryName: schedule.category?.name || '',
                goals: 0,
                assists: 0,
                points: 0,
                pim: 0,
                ppGoals: 0,
                shGoals: 0,
                gwGoals: 0,
                gamesPlayed: 0,
                isAffiliate: goal.participant.isAffiliate || false,
              };
            }

            playerMap[pid].goals++;
            playerMap[pid].points++;
            if (goal.isPowerplay) playerMap[pid].ppGoals++;
            if (goal.isShorthanded) playerMap[pid].shGoals++;
            gamePlayers.add(pid);

            // Set team name from game data
            const team = boxscore.teams?.find(t => t.id === goal.teamId);
            if (team) playerMap[pid].teamName = team.name;

            // Track team membership
            if (!teamPlayerMap[goal.teamId]) teamPlayerMap[goal.teamId] = new Set();
            teamPlayerMap[goal.teamId].add(pid);

            // Process assists
            for (const assist of (goal.assists || [])) {
              const apid = assist.participantId;
              if (!playerMap[apid]) {
                playerMap[apid] = {
                  participantId: apid,
                  name: assist.fullName,
                  number: assist.number,
                  teamId: goal.teamId, // Same team as the scorer
                  teamName: team?.name || '',
                  divisionName: schedule.divisionName,
                  scheduleName: schedule.name,
                  scheduleId: schedule.id,
                  categoryName: schedule.category?.name || '',
                  goals: 0,
                  assists: 0,
                  points: 0,
                  pim: 0,
                  ppGoals: 0,
                  shGoals: 0,
                  gwGoals: 0,
                  gamesPlayed: 0,
                  isAffiliate: assist.isAffiliate || false,
                };
              }
              playerMap[apid].assists++;
              playerMap[apid].points++;
              gamePlayers.add(apid);

              if (!teamPlayerMap[goal.teamId]) teamPlayerMap[goal.teamId] = new Set();
              teamPlayerMap[goal.teamId].add(apid);
            }
          }

          // Process penalties
          for (const penalty of (boxscore.penalties || [])) {
            if (!penalty.participant) continue;
            const pid = penalty.participant.participantId;

            if (!playerMap[pid]) {
              playerMap[pid] = {
                participantId: pid,
                name: penalty.participant.fullName,
                number: penalty.participant.number,
                teamId: penalty.teamId,
                teamName: '',
                divisionName: schedule.divisionName,
                scheduleName: schedule.name,
                scheduleId: schedule.id,
                categoryName: schedule.category?.name || '',
                goals: 0,
                assists: 0,
                points: 0,
                pim: 0,
                ppGoals: 0,
                shGoals: 0,
                gwGoals: 0,
                gamesPlayed: 0,
                isAffiliate: penalty.participant.isAffiliate || false,
              };
            }

            // Calculate PIM based on penalty duration
            const durName = (penalty.duration?.name || '').toLowerCase();
            let pimValue = 2; // default minor
            if (durName.includes('major')) pimValue = 5;
            else if (durName.includes('misconduct') && durName.includes('game')) pimValue = 10;
            else if (durName.includes('misconduct')) pimValue = 10;
            else if (durName.includes('match')) pimValue = 5;

            playerMap[pid].pim += pimValue;
            gamePlayers.add(pid);

            const team = boxscore.teams?.find(t => t.id === penalty.teamId);
            if (team) playerMap[pid].teamName = team.name;

            if (!teamPlayerMap[penalty.teamId]) teamPlayerMap[penalty.teamId] = new Set();
            teamPlayerMap[penalty.teamId].add(pid);
          }

          // Increment games played for all players who appeared in this game
          for (const pid of gamePlayers) {
            if (playerMap[pid]) playerMap[pid].gamesPlayed++;
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

  log(`Processed ${processedGames} games total, found ${Object.keys(playerMap).length} players`);
  return { playerMap, teamPlayerMap, totalGames: processedGames };
}

/**
 * Step 5: Fetch team rosters and set GP = team GP from standings.
 * Also adds players who never appeared in a boxscore but are on the roster.
 */
async function enrichWithRosters(playerMap, standings, schedules) {
  log('Fetching team rosters to fix GP...');

  // Build a map of teamId -> { teamGP, schedule info }
  const teamInfo = {};
  for (const [schedId, data] of Object.entries(standings)) {
    const schedule = schedules.find(s => s.id === parseInt(schedId));
    if (!schedule) continue;

    for (const team of data.teams) {
      // Use the highest GP if a team appears in multiple schedules
      if (!teamInfo[team.teamId] || team.gamesPlayed > teamInfo[team.teamId].gamesPlayed) {
        teamInfo[team.teamId] = {
          teamId: team.teamId,
          teamName: team.teamName,
          gamesPlayed: team.gamesPlayed,
          divisionName: data.divisionName,
          scheduleName: data.scheduleName,
          scheduleId: parseInt(schedId),
          categoryName: data.categoryName,
        };
      }
    }
  }

  const teamIds = Object.keys(teamInfo).map(Number);
  log(`  Fetching rosters for ${teamIds.length} teams...`);

  let fetched = 0;
  let rosterPlayers = 0;
  let newPlayers = 0;

  for (let i = 0; i < teamIds.length; i += 5) {
    const batch = teamIds.slice(i, i + 5);
    const rosters = await Promise.all(
      batch.map(async (teamId) => {
        try {
          const members = await api.getTeamMembers(teamId);
          return { teamId, members: members || [] };
        } catch (e) {
          return { teamId, members: [] };
        }
      })
    );

    for (const { teamId, members } of rosters) {
      const info = teamInfo[teamId];
      if (!info) continue;

      // Filter to actual players (have a jersey number)
      const players = members.filter(m => m.number && m.number > 0 && m.participant);

      for (const member of players) {
        const pid = member.participantId;
        rosterPlayers++;

        if (playerMap[pid]) {
          // Player exists from boxscore data — update GP to team GP
          playerMap[pid].gamesPlayed = info.gamesPlayed;
        } else {
          // New player — never appeared in a boxscore but is on the roster
          newPlayers++;
          playerMap[pid] = {
            participantId: pid,
            name: member.participant.fullName || 'Unknown',
            number: member.number || 0,
            teamId: teamId,
            teamName: info.teamName,
            divisionName: info.divisionName,
            scheduleName: info.scheduleName,
            scheduleId: info.scheduleId,
            categoryName: info.categoryName,
            goals: 0,
            assists: 0,
            points: 0,
            pim: 0,
            ppGoals: 0,
            shGoals: 0,
            gwGoals: 0,
            gamesPlayed: info.gamesPlayed,
            isAffiliate: member.isAffiliate || false,
          };
        }
      }
    }

    fetched += batch.length;
    if (fetched % 100 === 0 || fetched >= teamIds.length) {
      log(`  Fetched ${fetched}/${teamIds.length} rosters`);
    }

    await api.sleep(50);
  }

  log(`  Roster enrichment: ${rosterPlayers} roster players processed, ${newPlayers} new players added`);
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
    const { playerMap, totalGames } = await fetchPlayerStats(schedules);

    // Step 5: Fetch team rosters and fix GP
    // The boxscore only records players who scored/assisted/penalized.
    // We use team rosters + team GP from standings for accurate games played.
    await enrichWithRosters(playerMap, standings, schedules);

    // Convert player map to sorted arrays
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
    const divPlayers = players.filter(p => p.divisionName === division.name && p.gamesPlayed >= 3);

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
