import test from "node:test";
import assert from "node:assert/strict";
import {
  discoveryCategory,
  getMembershipWeekStart,
  isMembershipBillingAllowed,
  isMembershipEligibleForPlan,
  isWithinMemberBookingWindow,
  isPlanEffectiveAt,
  planAllowsGirls,
} from "./member-entitlements";

test("member booking visibility is limited to the next seven days", () => {
  const now = new Date("2026-09-08T12:00:00.000Z");
  assert.equal(isWithinMemberBookingWindow(new Date("2026-09-15T12:00:00.000Z"), now), true);
  assert.equal(isWithinMemberBookingWindow(new Date("2026-09-15T12:00:00.001Z"), now), false);
});

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

test("plan-linked membership billing and pause guardrails fail closed", () => {
  const plan = {
    active: true,
    effectiveStart: null,
    effectiveEnd: null,
  };
  const base = {
    status: "active",
    startDate: new Date("2026-01-01"),
    endDate: null,
    billingState: "active",
    billingSource: "stripe",
    stripeSubscriptionId: "sub_test",
    stripeCheckoutSessionId: null,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    pausedAt: null,
  } as const;
  const at = new Date("2026-09-08");
  assert.equal(isMembershipBillingAllowed(base), true);
  assert.equal(isMembershipEligibleForPlan(base, plan, at), true);
  assert.equal(isMembershipBillingAllowed({
    ...base,
    billingSource: "manual",
    billingState: "manual",
    stripeSubscriptionId: null,
  }), true);
  assert.equal(isMembershipEligibleForPlan({ ...base, billingState: "past_due" }, plan, at), false);
  assert.equal(isMembershipEligibleForPlan({ ...base, currentPeriodEnd: new Date("2026-09-07") }, plan, at), false);
  assert.equal(isMembershipEligibleForPlan({ ...base, pausedAt: at }, plan, at), false);
  assert.equal(isMembershipEligibleForPlan({
    ...base,
    billingState: "cancel_at_period_end",
    cancelAtPeriodEnd: true,
    currentPeriodEnd: new Date("2026-09-07"),
  }, plan, at), false);
  assert.equal(isMembershipEligibleForPlan({
    ...base,
    billingState: "cancel_at_period_end",
    cancelAtPeriodEnd: true,
    currentPeriodEnd: null,
  }, plan, at), false);
});

test("plan effective dates are inclusive and inactive plans are unavailable", () => {
  const plan = {
    active: true,
    effectiveStart: new Date("2026-09-01"),
    effectiveEnd: new Date("2026-09-30"),
  };
  assert.equal(isPlanEffectiveAt(plan, new Date("2026-09-01")), true);
  assert.equal(isPlanEffectiveAt(plan, new Date("2026-09-30")), true);
  assert.equal(isPlanEffectiveAt(plan, new Date("2026-08-31")), false);
  assert.equal(isPlanEffectiveAt({ ...plan, active: false }, new Date("2026-09-08")), false);
});

test("minor booking plans must explicitly include the girls category", () => {
  assert.equal(planAllowsGirls({ eligibleClassCategories: ["girls_skill"] }), true);
  assert.equal(planAllowsGirls({ eligibleClassCategories: ["GIRLS_JIU_JITSU_SELF_DEFENSE"] }), true);
  assert.equal(planAllowsGirls({ eligibleClassCategories: ["skill", "strength"] }), false);
  assert.equal(planAllowsGirls({ eligibleClassCategories: [] }), false);
});