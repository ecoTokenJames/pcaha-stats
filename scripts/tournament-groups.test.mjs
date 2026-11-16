// Tests for src/lib/tournament-groups.ts. Run: npm test
// (Node runs the TypeScript file directly by stripping its types.)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildTournamentEvents,
  pacificToday,
  splitSchedule,
  splitTournamentName,
} from "../src/lib/tournament-groups.ts";

const team = (teamId, teamName, gamesPlayed = 3) => ({ teamId, teamName, gamesPlayed });
const game = (id, date, homeTeamId, awayTeamId) => ({
  id,
  number: `G${id}`,
  date,
  startTime: `${date}T18:00:00.000Z`,
  homeTeamId,
  awayTeamId,
});
const schedule = (scheduleId, scheduleName, teams, extra = {}) => ({
  scheduleId,
  scheduleName,
  divisionName: "U13",
  categoryName: "U13 A",
  startDate: "2026-10-09",
  endDate: "2026-10-11",
  teams,
  ...extra,
});
/** Every pair in `ids` plays once on `date` */
const roundRobin = (ids, date, start) => {
  const out = [];
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) out.push(game(start + out.length, date, ids[i], ids[j]));
  return out;
};

test("splits a schedule name into the tournament and its part", () => {
  assert.deepEqual(splitTournamentName("FALL CLASSIC - U13A - GOLD TIER"), { event: "FALL CLASSIC", section: "Gold Tier" });
  assert.deepEqual(splitTournamentName("PACIFIC COAST FEMALE REP CLASSIC - U13 TIER 1"), {
    event: "PACIFIC COAST FEMALE REP CLASSIC",
    section: "Tier 1",
  });
  assert.deepEqual(splitTournamentName("HOMETOWN HEROES - 13A"), { event: "HOMETOWN HEROES", section: "" });
  assert.deepEqual(splitTournamentName("19TH ANNUAL BURNABY FEMALE REMEMBRANCE TOURNAMENT - U11 C"), {
    event: "19TH ANNUAL BURNABY FEMALE REMEMBRANCE TOURNAMENT",
    section: "",
  });
  assert.deepEqual(splitTournamentName("U11A THANKSGIVING TOURNAMENT - PLAYOFFS - FLIGHT 1"), {
    event: "U11A THANKSGIVING TOURNAMENT",
    section: "Playoffs - Flight 1",
  });
  assert.deepEqual(splitTournamentName("MISSION U15 FALLEN STARS"), { event: "MISSION U15 FALLEN STARS", section: "" });
});

test("teams that never meet go in separate tables, strongest first", () => {
  const teams = [
    team(1, "LANGLEY U13 A3 TIER 3"),
    team(2, "SURREY U13 A3 TIER 3"),
    team(3, "DELTA U13 A3 TIER 3"),
    team(4, "BURNABY U13 A1 TIER 1"),
    team(5, "RICHMOND U13 A1 TIER 1"),
    team(6, "COQUITLAM U13 A1 TIER 1"),
  ];
  const games = [...roundRobin([1, 2, 3], "2026-10-09", 1), ...roundRobin([4, 5, 6], "2026-10-09", 10)];
  const groups = splitSchedule(schedule(1, "X", teams), games);
  assert.deepEqual(
    groups.map((g) => [g.label, g.teams.map((t) => t.teamId)]),
    [
      ["Group 1", [4, 5, 6]],
      ["Group 2", [1, 2, 3]],
    ]
  );
});

test("round-robin pools before a final day of crossovers become Pool A / Pool B", () => {
  const teams = [1, 2, 3, 4, 5, 6, 7, 8].map((id) => team(id, `TEAM ${id}`));
  const games = [
    ...roundRobin([1, 2, 3, 4], "2026-10-09", 1).slice(0, 3),
    ...roundRobin([1, 2, 3, 4], "2026-10-10", 1).slice(3),
    ...roundRobin([5, 6, 7, 8], "2026-10-09", 20).slice(0, 3),
    ...roundRobin([5, 6, 7, 8], "2026-10-10", 20).slice(3),
    game(40, "2026-10-11", 1, 5),
    game(41, "2026-10-11", 2, 6),
  ];
  const groups = splitSchedule(schedule(1, "X", teams), games);
  assert.deepEqual(
    groups.map((g) => [g.label, g.teams.map((t) => t.teamId), Boolean(g.note)]),
    [
      ["Pool A", [1, 2, 3, 4], true],
      ["Pool B", [5, 6, 7, 8], true],
    ]
  );
});

test("a two-day round robin stays one table", () => {
  const teams = [1, 2, 3, 4, 5, 6].map((id) => team(id, `TEAM ${id}`));
  const games = [...roundRobin([1, 2, 3], "2026-10-10", 1), ...roundRobin([4, 5, 6], "2026-10-10", 10), game(30, "2026-10-11", 1, 4)];
  const groups = splitSchedule(schedule(1, "X", teams), games);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].label, "");
  assert.equal(groups[0].teams.length, 6);
});

test("teams listed in a schedule but with no games in it are left out", () => {
  const teams = [team(1, "A"), team(2, "B"), team(3, "C", 0), team(4, "D", 0)];
  const groups = splitSchedule(schedule(1, "X", teams), [game(1, "2026-10-10", 1, 2)]);
  assert.deepEqual(groups.map((g) => g.teams.map((t) => t.teamId)), [[1, 2]]);
});

test("a tournament's tiers are merged into one entry; other weekends and ages stay apart", () => {
  const tiers = ["GOLD", "WHITE", "BLACK"].map((tier, i) =>
    schedule(100 + i, `FALL CLASSIC - U13A - ${tier} TIER`, [team(10 * i + 1, "A"), team(10 * i + 2, "B")])
  );
  const nextMonth = schedule(200, "FALL CLASSIC - U13A - GOLD TIER", [team(50, "A"), team(51, "B")], {
    startDate: "2026-11-13",
    endDate: "2026-11-15",
  });
  const u15 = schedule(300, "FALL CLASSIC - U15A - GOLD TIER", [team(60, "A"), team(61, "B")], { divisionName: "U15" });
  const games = (s) => [game(s.scheduleId, "2026-10-10", s.teams[0].teamId, s.teams[1].teamId)];
  const events = buildTournamentEvents([u15, nextMonth, ...tiers], games);
  assert.deepEqual(
    events.map((e) => [e.id, e.name, e.divisionName, e.groups.map((g) => g.label), e.teamCount]),
    [
      [100, "FALL CLASSIC", "U13", ["Gold Tier", "White Tier", "Black Tier"], 6],
      [200, "FALL CLASSIC", "U13", ["Gold Tier"], 2],
      [300, "FALL CLASSIC", "U15", ["Gold Tier"], 2],
    ]
  );
});

test("pacificToday is B.C. time (UTC-7)", () => {
  assert.equal(pacificToday(Date.parse("2026-11-16T06:59:00Z")), "2026-11-15");
  assert.equal(pacificToday(Date.parse("2026-11-16T07:00:00Z")), "2026-11-16");
});
