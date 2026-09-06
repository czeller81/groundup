import assert from "node:assert/strict";
import { test } from "node:test";
import type { Server } from "node:http";
import express from "express";
import Stripe from "stripe";
import { asc, eq } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { membershipPlans, memberships, users } from "@shared/schema";
import {
  BILLING_PLAN_KEYS,
  STRIPE_MEMBERSHIP_CATALOG,
  applyStripeSubscription,
  adminMembershipBillingState,
  stripeBillingState,
} from "./membership-billing";
import { registerMemberRoutes } from "./member-routes";

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

test("admin billing states keep unresolved memberships distinct", () => {
  assert.equal(adminMembershipBillingState({ billingState: "pending", status: "pending" }), "pending");
  assert.equal(adminMembershipBillingState({ billingState: "active", status: "active" }), "active");
  assert.equal(adminMembershipBillingState({ billingState: "past_due", status: "active" }), "past_due");
  assert.equal(adminMembershipBillingState({ billingState: "active", status: "active", cancelAtPeriodEnd: true }), "cancel_at_period_end");
  assert.equal(adminMembershipBillingState({ billingState: "cancelled", status: "cancelled" }), "cancelled");
});

test("member billing moves the same checkout membership from pending to active after Stripe reconciliation", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "fixture evidence must never run in production");
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `stripe-handoff-${suffix}@example.invalid`;
  const stripeCustomerId = `cus_handoff_${suffix}`;
  const stripeCheckoutSessionId = `cs_handoff_${suffix}`;
  const stripeSubscriptionId = `sub_handoff_${suffix}`;
  const user = await storage.createUser(email, "GroundUp-QA-Password-2026", "Stripe", "Handoff", "5550000199", "en");
  let server: Server | undefined;

  try {
    await db.update(users).set({ stripeCustomerId }).where(eq(users.id, user.id));
    const [plan] = await db.select().from(membershipPlans).where(eq(membershipPlans.internalKey, "ground_up_3")).limit(1);
    assert.ok(plan, "the approved Ground Up 3 plan is required for Stripe handoff evidence");

    const [pendingMembership] = await db.insert(memberships).values({
      userId: user.id,
      planId: plan.id,
      type: plan.internalKey,
      status: "pending",
      priceCents: plan.displayPriceCents || STRIPE_MEMBERSHIP_CATALOG.ground_up_3.amountCents,
      source: "stripe_checkout",
      billingSource: "stripe_checkout",
      billingState: "pending",
      stripeCustomerId,
      stripeProductId: plan.stripeProductId,
      stripePriceId: plan.stripePriceId,
      stripeCheckoutSessionId,
    }).returning();

    const app = express();
    app.use((req, _res, next) => {
      (req as any).session = { userId: user.id };
      next();
    });
    registerMemberRoutes(app);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const billingUrl = `http://127.0.0.1:${address.port}/api/portal/billing`;

    const pendingResponse = await fetch(billingUrl);
    assert.equal(pendingResponse.status, 200);
    const pendingBilling = await pendingResponse.json();
    assert.equal(pendingBilling.activeMembership, null);
    assert.equal(pendingBilling.pendingMembership.id, pendingMembership.id);
    assert.equal(pendingBilling.pendingMembership.billingState, "pending");
    assert.equal(pendingBilling.pendingMembership.status, "pending");

    const timestamp = Math.floor(Date.now() / 1000);
    await applyStripeSubscription({
      id: stripeSubscriptionId,
      object: "subscription",
      customer: stripeCustomerId,
      metadata: {
        ground_up_user_id: user.id,
        ground_up_plan_key: plan.internalKey,
      },
      cancel_at_period_end: false,
      status: "active",
      start_date: timestamp,
      canceled_at: null,
      ended_at: null,
      items: {
        data: [{
          current_period_start: timestamp,
          current_period_end: timestamp + 30 * 24 * 60 * 60,
        }],
      },
    } as unknown as Stripe.Subscription, {
      checkoutSessionId: stripeCheckoutSessionId,
    });

    const activeResponse = await fetch(billingUrl);
    assert.equal(activeResponse.status, 200);
    const activeBilling = await activeResponse.json();
    assert.equal(activeBilling.pendingMembership, null);
    assert.equal(activeBilling.activeMembership.id, pendingMembership.id);
    assert.equal(activeBilling.activeMembership.billingState, "active");
    assert.equal(activeBilling.activeMembership.status, "active");
    assert.equal(activeBilling.activeMembership.stripeSubscriptionId, stripeSubscriptionId);
    assert.equal(activeBilling.memberships.length, 1);
    assert.equal(activeBilling.memberships[0].id, pendingMembership.id);
  } finally {
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
    await db.delete(memberships).where(eq(memberships.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
  }
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