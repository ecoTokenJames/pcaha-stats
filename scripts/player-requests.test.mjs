// Checks the family requests in scraper/hidden-players.json and scraper/player-fixes.json
// against the data files the site is built from. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = path.resolve(import.meta.dirname, "..");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const hidden = readJson("scraper/hidden-players.json").hidden ?? [];
const removed = hidden.filter((h) => typeof h === "object" && h.remove).map((h) => Number(h.participantId));
const fixes = readJson("scraper/player-fixes.json").positions ?? {};

/** Every saved player row: this season, past seasons, leaders */
function playerRows() {
  const rows = [];
  for (const f of fs.readdirSync(path.join(root, "data/players"))) {
    const data = readJson(`data/players/${f}`);
    if (Array.isArray(data)) rows.push(...data);
    else for (const lists of Object.values(data)) for (const list of Object.values(lists)) rows.push(...list);
  }
  for (const season of fs.readdirSync(path.join(root, "data/seasons"))) {
    const dir = path.join(root, "data/seasons", season, "players");
    for (const f of fs.readdirSync(dir)) rows.push(...JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, f)))));
  }
  return rows;
}

test("request files are well formed", () => {
  for (const h of hidden) assert.ok(Number.isInteger(Number(h.participantId ?? h)), "participant id");
  for (const fix of Object.values(fixes)) assert.match(typeof fix === "string" ? fix : fix.position, /^[FDG]$/);
});

test("players removed on request are in no saved player data", () => {
  const rows = playerRows();
  for (const id of removed) {
    assert.equal(rows.filter((p) => p.participantId === id).length, 0, `player ${id} rows`);
    assert.ok(!(String(id) in readJson("data/history/players.json").players), `player ${id} history`);
    for (const f of fs.readdirSync(path.join(root, "data/gamelogs"))) {
      assert.ok(!(String(id) in readJson(`data/gamelogs/${f}`)), `player ${id} game log ${f}`);
    }
  }
});

test("corrected positions are in the saved data", () => {
  const rows = playerRows();
  for (const [id, fix] of Object.entries(fixes)) {
    const want = typeof fix === "string" ? fix : fix.position;
    const mine = rows.filter((p) => p.participantId === Number(id));
    assert.ok(mine.length > 0, `player ${id} has rows`);
    for (const p of mine) assert.equal(p.position, want, `player ${id} in ${p.scheduleName}`);
  }
});
