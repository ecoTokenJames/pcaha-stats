#!/usr/bin/env node
/**
 * Builds data/history/players.json — every player's past seasons, for the stats
 * agent's year-over-year comparisons. Input: full scrapes of past seasons made with
 *
 *   PCAHA_SEASON=2025-26 PCAHA_DATA_DIR=<dir>/2025-26 node scraper/scrape.js
 *
 * Usage: node scraper/build-history.js <dir-with-season-folders> [season ...]
 * Seasons are past and final, so this runs once per season, not nightly.
 *
 * Output: { [participantId]: [{ season, name, number, division, teamName, teamId,
 *           type, gamesPlayed, goals, assists, points, pim }, ...] } (oldest first),
 * one row per player per team per schedule type (League / Placement / Playoffs / Tournament).
 */

const fs = require('fs');
const path = require('path');

const [root, ...seasonArgs] = process.argv.slice(2);
if (!root) {
  console.error('Usage: node scraper/build-history.js <dir> [season ...]');
  process.exit(1);
}
const seasons = (seasonArgs.length ? seasonArgs : fs.readdirSync(root).filter(d => /^\d{4}-\d{2}$/.test(d))).sort();

// Same rule as the site (scheduleType from Spordle, else guess from the name)
function scheduleType(p) {
  if (['League', 'Playoffs', 'Placement', 'Tournament'].includes(p.scheduleType)) return p.scheduleType;
  const n = (p.scheduleName || '').toLowerCase();
  if (n.includes('playoff')) return 'Playoffs';
  if (n.includes('placement') || n.includes('balancing')) return 'Placement';
  if (/tournament|classic|cup|memorial/.test(n)) return 'Tournament';
  return 'League';
}

const history = {};
for (const season of seasons) {
  const file = path.join(root, season, 'players', 'all-players.json');
  if (!fs.existsSync(file)) {
    console.error(`  skip ${season}: no ${file}`);
    continue;
  }
  const players = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rows = new Map();
  for (const p of players) {
    const type = scheduleType(p);
    const key = `${p.participantId}|${p.teamId}|${type}`;
    let r = rows.get(key);
    if (!r) {
      r = {
        season,
        name: p.name,
        number: p.number || 0,
        division: p.divisionName,
        teamName: p.teamName,
        teamId: p.teamId,
        type,
        gamesPlayed: 0,
        goals: 0,
        assists: 0,
        points: 0,
        pim: 0,
      };
      rows.set(key, r);
    }
    r.gamesPlayed += p.gamesPlayed || 0;
    r.goals += p.goals || 0;
    r.assists += p.assists || 0;
    r.points += p.points || 0;
    r.pim += p.pim || 0;
  }
  let n = 0;
  for (const [key, r] of rows) {
    if (r.gamesPlayed === 0 && r.points === 0 && r.pim === 0) continue; // roster-only, never played
    const pid = key.split('|')[0];
    (history[pid] ||= []).push(r);
    n++;
  }
  console.log(`  ${season}: ${players.length} schedule rows -> ${n} player/team/type rows`);
}

for (const rows of Object.values(history)) rows.sort((a, b) => a.season.localeCompare(b.season));

const out = path.join(__dirname, '..', 'data', 'history', 'players.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(history));
console.log(`Wrote ${Object.keys(history).length} players to ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
