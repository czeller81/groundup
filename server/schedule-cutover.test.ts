import assert from "node:assert/strict";
import test from "node:test";
import {
  FINAL_SCHEDULE_TAXONOMY,
  FINAL_WEEKLY_SCHEDULE,
  matchClassType,
} from "./class-booking-sync";
import { discoveryCategory, getMembershipWeekStart } from "./member-entitlements";

const canonicalTypes = [
  { canonicalCategory: FINAL_SCHEDULE_TAXONOMY.adultSkill, strengthFocus: null },
  { canonicalCategory: FINAL_SCHEDULE_TAXONOMY.girlsSkill, strengthFocus: null },
  { canonicalCategory: FINAL_SCHEDULE_TAXONOMY.strength, strengthFocus: FINAL_SCHEDULE_TAXONOMY.lowerBody },
  { canonicalCategory: FINAL_SCHEDULE_TAXONOMY.strength, strengthFocus: FINAL_SCHEDULE_TAXONOMY.upperBodyCore },
  { canonicalCategory: FINAL_SCHEDULE_TAXONOMY.strength, strengthFocus: FINAL_SCHEDULE_TAXONOMY.fullBody },
].map((type, index) => ({
  ...type,
  id: `type-${index}`,
  name: `type-${index}`,
  active: true,
  category: "canonical",
  matchPattern: null,
})) as any;

test("final schedule has exactly 13 unique weekly slots", () => {
  assert.equal(FINAL_WEEKLY_SCHEDULE.length, 13);
  const keys = new Set(FINAL_WEEKLY_SCHEDULE.map((slot) => `${slot.day}:${slot.time}`));
  assert.equal(keys.size, 13);
  assert.equal(FINAL_WEEKLY_SCHEDULE.filter((slot) => slot.canonicalCategory === FINAL_SCHEDULE_TAXONOMY.adultSkill).length, 5);
  assert.equal(FINAL_WEEKLY_SCHEDULE.filter((slot) => slot.canonicalCategory === FINAL_SCHEDULE_TAXONOMY.girlsSkill).length, 2);
  assert.equal(FINAL_WEEKLY_SCHEDULE.filter((slot) => slot.canonicalCategory === FINAL_SCHEDULE_TAXONOMY.strength).length, 6);
  assert.ok(FINAL_WEEKLY_SCHEDULE.every((slot) => slot.durationMinutes === (slot.canonicalCategory === FINAL_SCHEDULE_TAXONOMY.girlsSkill ? 45 : 55)));
});

test("Google title mapping is deterministic and keeps girls separate", () => {
  assert.equal(matchClassType("Ground Up — Jiu-Jitsu / Self-Defense", canonicalTypes).canonicalCategory, FINAL_SCHEDULE_TAXONOMY.adultSkill);
  assert.equal(matchClassType("Ground Up — Girls’ Jiu-Jitsu / Self-Defense", canonicalTypes).canonicalCategory, FINAL_SCHEDULE_TAXONOMY.girlsSkill);
  assert.equal(matchClassType("Ground Up — Strength & Conditioning — Lower Body", canonicalTypes).strengthFocus, FINAL_SCHEDULE_TAXONOMY.lowerBody);
  assert.equal(matchClassType("Ground Up — Strength & Conditioning — Upper Body + Core", canonicalTypes).strengthFocus, FINAL_SCHEDULE_TAXONOMY.upperBodyCore);
  assert.equal(matchClassType("Ground Up — Strength & Conditioning — Full Body", canonicalTypes).strengthFocus, FINAL_SCHEDULE_TAXONOMY.fullBody);
});

test("girls are not eligible for the adult Discovery Pass", () => {
  assert.equal(discoveryCategory(canonicalTypes[0]), "SKILL");
  assert.equal(discoveryCategory(canonicalTypes[1]), null);
  assert.equal(discoveryCategory(canonicalTypes[2]), "STRENGTH");
});

test("membership week boundaries stay on Pacific Mondays through DST", () => {
  assert.equal(getMembershipWeekStart(new Date("2026-03-08T18:00:00Z"), 1, "America/Los_Angeles").toISOString(), "2026-03-02T12:00:00.000Z");
  assert.equal(getMembershipWeekStart(new Date("2026-11-01T18:00:00Z"), 1, "America/Los_Angeles").toISOString(), "2026-10-26T12:00:00.000Z");
});