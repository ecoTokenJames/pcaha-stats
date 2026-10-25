#!/usr/bin/env node
/**
 * Packages a finished season so the site can show it under /seasons/<season>.
 * Input: a full scrape of that season made with
 *
 *   PCAHA_SEASON=2025-26 PCAHA_DATA_DIR=<dir> node scraper/scrape.js
 *
 * Usage: node scraper/package-season.js <dir>
 *
 * Writes data/seasons/<season>/ with only what the pages read (meta, standings,
 * per-division players and games), minified and gzipped. Past seasons don't change,
 * so this runs once per season, not nightly. Names on hidden-players.json are
 * withheld when the site reads the files, so later removals still apply.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const src = process.argv[2];
if (!src) {
  console.error('Usage: node scraper/package-season.js <scrape-dir>');
  process.exit(1);
}

const season = JSON.parse(fs.readFileSync(path.join(src, 'meta', 'last-scrape.json'), 'utf8')).season;
if (!/^\d{4}-\d{2}$/.test(season || '')) {
  console.error(`No season in ${src}/meta/last-scrape.json`);
  process.exit(1);
}

const out = path.join(__dirname, '..', 'data', 'seasons', season);
fs.rmSync(out, { recursive: true, force: true });

const wanted = [
  ['meta', f => f.endsWith('.json')],
  ['standings', f => f.endsWith('.json')],
  ['games', f => f.endsWith('.json')],
  // all-players.json and leaders.json duplicate the division files; the site doesn't need them
  ['players', f => /^u\d+\.json$/.test(f)],
];

let total = 0;
for (const [dir, keep] of wanted) {
  const from = path.join(src, dir);
  if (!fs.existsSync(from)) continue;
  fs.mkdirSync(path.join(out, dir), { recursive: true });
  for (const file of fs.readdirSync(from).filter(keep)) {
    const json = JSON.stringify(JSON.parse(fs.readFileSync(path.join(from, file), 'utf8')));
    const gz = zlib.gzipSync(json, { level: 9 });
    fs.writeFileSync(path.join(out, dir, `${file}.gz`), gz);
    total += gz.length;
  }
}
console.log(`Packaged ${season} into ${out} (${(total / 1e6).toFixed(1)} MB)`);
