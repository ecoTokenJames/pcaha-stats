// Tests for src/lib/sportsmanship.ts. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { showsSportsmanship } from "../src/lib/sportsmanship.ts";

test("SP column shows only when every team has the number and some team earned points", () => {
  assert.equal(showsSportsmanship([{ sportsmanshipPoints: 3 }, { sportsmanshipPoints: 0 }]), true);
  // League doesn't award them: all zero
  assert.equal(showsSportsmanship([{ sportsmanshipPoints: 0 }, { sportsmanshipPoints: 0 }]), false);
  // Saved before we kept the number, or Spordle doesn't send it
  assert.equal(showsSportsmanship([{}, {}]), false);
  assert.equal(showsSportsmanship([{ sportsmanshipPoints: 2 }, { sportsmanshipPoints: null }]), false);
  assert.equal(showsSportsmanship([]), false);
});
