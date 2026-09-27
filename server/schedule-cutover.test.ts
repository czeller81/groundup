import assert from "node:assert/strict";
import test from "node:test";
import {
  FINAL_SCHEDULE_TAXONOMY,
  FINAL_WEEKLY_SCHEDULE,
  matchClassType,
} from "./class-booking-sync";
import { discoveryCategory, getMembershipWeekStart } from "./member-entitlements";
import { ALLOWED_CLASS_WEEKDAYS, isAllowedClassWeekday } from "@shared/booking-operations";
import { DAYS as STATIC_SCHEDULE_DAYS, SCHEDULE as STATIC_SCHEDULE } from "../client/src/lib/schedule-data";

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

test("final schedule has exactly six unique weekly slots on Monday, Wednesday, and Friday", () => {
  assert.equal(FINAL_WEEKLY_SCHEDULE.length, 6);
  const keys = new Set(FINAL_WEEKLY_SCHEDULE.map((slot) => `${slot.day}:${slot.time}`));
  assert.equal(keys.size, 6);
  assert.deepEqual([...new Set(FINAL_WEEKLY_SCHEDULE.map((slot) => slot.day))], ALLOWED_CLASS_WEEKDAYS);
  assert.equal(FINAL_WEEKLY_SCHEDULE.filter((slot) => slot.canonicalCategory === FINAL_SCHEDULE_TAXONOMY.adultSkill).length, 3);
  assert.equal(FINAL_WEEKLY_SCHEDULE.filter((slot) => slot.canonicalCategory === FINAL_SCHEDULE_TAXONOMY.girlsSkill).length, 0);
  assert.equal(FINAL_WEEKLY_SCHEDULE.filter((slot) => slot.canonicalCategory === FINAL_SCHEDULE_TAXONOMY.strength).length, 3);
  assert.ok(FINAL_WEEKLY_SCHEDULE.every((slot) => slot.durationMinutes === (slot.canonicalCategory === FINAL_SCHEDULE_TAXONOMY.girlsSkill ? 45 : 55)));
});

test("class weekday enforcement uses the academy timezone", () => {
  assert.equal(isAllowedClassWeekday("2026-09-28T18:00:00Z"), true); // Monday in Los Angeles
  assert.equal(isAllowedClassWeekday("2026-09-30T00:30:00Z"), false); // Tuesday in Los Angeles
  assert.equal(isAllowedClassWeekday("2026-10-01T00:30:00Z"), true); // Thursday UTC, Wednesday in Los Angeles
  assert.equal(isAllowedClassWeekday("2026-10-03T02:00:00Z"), true); // Saturday UTC, Friday in Los Angeles
  assert.equal(isAllowedClassWeekday("not-a-date"), false);
});

test("static schedule lists only approved class weekdays", () => {
  assert.deepEqual(STATIC_SCHEDULE_DAYS, ALLOWED_CLASS_WEEKDAYS);
  assert.ok(STATIC_SCHEDULE.every((entry) => ALLOWED_CLASS_WEEKDAYS.includes(entry.day as (typeof ALLOWED_CLASS_WEEKDAYS)[number])));
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