import test from "node:test";
import assert from "node:assert/strict";
import { discoveryCategory, getMembershipWeekStart } from "./member-entitlements";

test("membership weeks use the configured Monday start in the configured timezone", () => {
  const weekStart = getMembershipWeekStart(
    new Date("2026-09-04T20:00:00.000Z"),
    1,
    "America/Los_Angeles",
  );
  assert.equal(weekStart.toISOString(), "2026-08-31T12:00:00.000Z");
});

test("class taxonomy maps skill and strength occurrences to separate Discovery categories", () => {
  assert.equal(discoveryCategory({
    category: "jiu-jitsu",
    name: "Women's Jiu-Jitsu",
    matchPattern: "women",
  } as any), "SKILL");
  assert.equal(discoveryCategory({
    category: "fitness",
    name: "Strength & Conditioning",
    matchPattern: "strength",
  } as any), "STRENGTH");
});