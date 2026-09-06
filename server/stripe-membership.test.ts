import assert from "node:assert/strict";
import { test } from "node:test";
import Stripe from "stripe";
import { asc, eq } from "drizzle-orm";
import { db } from "./db";
import { membershipPlans } from "@shared/schema";
import {
  BILLING_PLAN_KEYS,
  STRIPE_MEMBERSHIP_CATALOG,
  stripeBillingState,
} from "./membership-billing";

test("approved membership catalog keeps exact Ground Up prices and entitlements", () => {
  assert.deepEqual(BILLING_PLAN_KEYS, [
    "ground_up_2",
    "ground_up_3",
    "ground_up_personal",
    "girls_program",
  ]);
  assert.equal(STRIPE_MEMBERSHIP_CATALOG.ground_up_2.amountCents, 13900);
  assert.equal(STRIPE_MEMBERSHIP_CATALOG.ground_up_2.weeklySessionLimit, 2);
  assert.equal(STRIPE_MEMBERSHIP_CATALOG.ground_up_3.amountCents, 15900);
  assert.equal(STRIPE_MEMBERSHIP_CATALOG.ground_up_3.weeklySessionLimit, 3);
  assert.equal(STRIPE_MEMBERSHIP_CATALOG.ground_up_personal.amountCents, 25000);
  assert.equal(STRIPE_MEMBERSHIP_CATALOG.ground_up_personal.privateSessionsPerMonth, 4);
  assert.equal(STRIPE_MEMBERSHIP_CATALOG.ground_up_personal.weeklySessionLimit, null);
  assert.equal(STRIPE_MEMBERSHIP_CATALOG.girls_program.amountCents, 11900);
  assert.deepEqual(STRIPE_MEMBERSHIP_CATALOG.girls_program.eligibleClassCategories, ["girls_skill", "GIRLS_JIU_JITSU_SELF_DEFENSE"]);
});

test("Stripe subscription states map to membership billing states", () => {
  const base = {
    id: "sub_test",
    object: "subscription" as const,
    customer: "cus_test",
    metadata: {},
    cancel_at_period_end: false,
    status: "active" as const,
  } as Stripe.Subscription;
  assert.equal(stripeBillingState(base), "active");
  assert.equal(stripeBillingState({ ...base, status: "past_due" }), "past_due");
  assert.equal(stripeBillingState({ ...base, status: "canceled" }), "cancelled");
  assert.equal(stripeBillingState({ ...base, status: "incomplete" }), "pending");
  assert.equal(stripeBillingState({ ...base, cancel_at_period_end: true }), "cancel_at_period_end");
});

test("development database has one Stripe mapping for each approved plan", async () => {
  const plans = await db.select({
    internalKey: membershipPlans.internalKey,
    displayPriceCents: membershipPlans.displayPriceCents,
    stripeProductId: membershipPlans.stripeProductId,
    stripePriceId: membershipPlans.stripePriceId,
  }).from(membershipPlans).where(eq(membershipPlans.active, true)).orderBy(asc(membershipPlans.internalKey));
  for (const key of BILLING_PLAN_KEYS) {
    const matches = plans.filter((plan) => plan.internalKey === key);
    assert.equal(matches.length, 1, `${key} should have exactly one active plan record`);
    assert.equal(matches[0].displayPriceCents, STRIPE_MEMBERSHIP_CATALOG[key].amountCents);
    assert.match(matches[0].stripeProductId || "", /^prod_/);
    assert.match(matches[0].stripePriceId || "", /^price_/);
  }
});

test("test-mode Stripe catalog has one exact monthly price per approved plan", { skip: !process.env.STRIPE_SECRET_KEY }, async () => {
  const key = process.env.STRIPE_SECRET_KEY!;
  assert.ok(key.startsWith("sk_test_"), "membership evidence must run against Stripe test mode");
  const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil", typescript: true });
  const products = await stripe.products.list({ active: true, limit: 100 });
  for (const planKey of BILLING_PLAN_KEYS) {
    const matchingProducts = products.data.filter((product) => product.metadata?.ground_up_plan_key === planKey);
    assert.equal(matchingProducts.length, 1, `${planKey} should not have duplicate Stripe products`);
    const prices = await stripe.prices.list({ product: matchingProducts[0].id, active: true, limit: 100 });
    const matchingPrices = prices.data.filter((price) =>
      price.currency === "usd" &&
      price.unit_amount === STRIPE_MEMBERSHIP_CATALOG[planKey].amountCents &&
      price.recurring?.interval === "month" &&
      price.recurring?.interval_count === 1,
    );
    assert.equal(matchingPrices.length, 1, `${planKey} should not have duplicate exact monthly prices`);
  }
});