import assert from "node:assert/strict";
import { test } from "node:test";
import type { Server } from "node:http";
import express from "express";
import Stripe from "stripe";
import { and, asc, eq } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { membershipPlans, memberships, users } from "@shared/schema";
import {
  BILLING_PLAN_KEYS,
  STRIPE_MEMBERSHIP_CATALOG,
  applyStripeSubscription,
  adminMembershipBillingState,
  checkoutSessionIsExpired,
  reconcilePendingStripeCheckouts,
  reconcileStalePendingStripeCheckouts,
  stripeBillingState,
  withStripeCheckoutReconciliationLease,
} from "./membership-billing";
import { registerMemberRoutes } from "./member-routes";

const sleep = (durationMs: number) => new Promise<void>((resolve) => setTimeout(resolve, durationMs));

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

test("expired Checkout sessions are terminal and no longer block a retry", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "fixture evidence must never run in production");
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const user = await storage.createUser(`stripe-expired-${suffix}@example.invalid`, "GroundUp-QA-Password-2026", "Stripe", "Expired", "5550000198", "en");
  try {
    const [plan] = await db.select().from(membershipPlans).where(eq(membershipPlans.internalKey, "ground_up_3")).limit(1);
    assert.ok(plan);
    const [pending] = await db.insert(memberships).values({
      userId: user.id,
      planId: plan.id,
      type: plan.internalKey,
      status: "pending",
      priceCents: plan.displayPriceCents || STRIPE_MEMBERSHIP_CATALOG.ground_up_3.amountCents,
      source: "stripe_checkout",
      billingSource: "stripe_checkout",
      billingState: "pending",
      stripeCustomerId: `cus_expired_${suffix}`,
      stripeCheckoutSessionId: `cs_expired_${suffix}`,
    }).returning();

    const fakeStripe = {
      checkout: {
        sessions: {
          retrieve: async (sessionId: string) => ({
            id: sessionId,
            mode: "subscription",
            status: "expired",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            subscription: null,
            metadata: {},
          }),
        },
      },
    } as unknown as Stripe;

    await reconcilePendingStripeCheckouts(fakeStripe, user.id);
    const [reconciled] = await db.select().from(memberships).where(eq(memberships.id, pending.id));
    assert.equal(reconciled.billingState, "cancelled");
    assert.equal(reconciled.status, "cancelled");
    assert.ok(reconciled.cancelledAt);
    assert.equal(await (async () => {
      const available = await db.select().from(memberships).where(and(
        eq(memberships.userId, user.id),
        eq(memberships.billingState, "pending"),
      ));
      return available.length;
    })(), 0);
  } finally {
    await db.delete(memberships).where(eq(memberships.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
  }
});

test("completed Checkout sessions reconcile the existing pending membership", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "fixture evidence must never run in production");
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const user = await storage.createUser(`stripe-complete-${suffix}@example.invalid`, "GroundUp-QA-Password-2026", "Stripe", "Complete", "5550000197", "en");
  try {
    const [plan] = await db.select().from(membershipPlans).where(eq(membershipPlans.internalKey, "ground_up_3")).limit(1);
    assert.ok(plan);
    const stripeCustomerId = `cus_complete_${suffix}`;
    const checkoutSessionId = `cs_complete_${suffix}`;
    const subscriptionId = `sub_complete_${suffix}`;
    await db.update(users).set({ stripeCustomerId }).where(eq(users.id, user.id));
    const [pending] = await db.insert(memberships).values({
      userId: user.id,
      planId: plan.id,
      type: plan.internalKey,
      status: "pending",
      priceCents: plan.displayPriceCents || STRIPE_MEMBERSHIP_CATALOG.ground_up_3.amountCents,
      source: "stripe_checkout",
      billingSource: "stripe_checkout",
      billingState: "pending",
      stripeCustomerId,
      stripeCheckoutSessionId: checkoutSessionId,
    }).returning();
    const timestamp = Math.floor(Date.now() / 1000);
    const subscription = {
      id: subscriptionId,
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
      latest_invoice: null,
      items: {
        data: [{
          current_period_start: timestamp,
          current_period_end: timestamp + 30 * 24 * 60 * 60,
          price: {
            id: plan.stripePriceId,
            object: "price",
            active: true,
            currency: "usd",
            type: "recurring",
            unit_amount: plan.displayPriceCents,
            recurring: { interval: "month", interval_count: 1 },
            product: plan.stripeProductId,
          },
        }],
      },
    } as unknown as Stripe.Subscription;
    const fakeStripe = {
      checkout: {
        sessions: {
          retrieve: async () => ({
            id: checkoutSessionId,
            mode: "subscription",
            status: "complete",
            expires_at: timestamp + 3600,
            subscription: subscriptionId,
            metadata: subscription.metadata,
          }),
        },
      },
      subscriptions: {
        retrieve: async () => subscription,
      },
    } as unknown as Stripe;

    await reconcilePendingStripeCheckouts(fakeStripe, user.id);
    const [reconciled] = await db.select().from(memberships).where(eq(memberships.id, pending.id));
    assert.equal(reconciled.billingState, "active");
    assert.equal(reconciled.status, "active");
    assert.equal(reconciled.stripeSubscriptionId, subscriptionId);
    assert.equal(reconciled.stripeCheckoutSessionId, checkoutSessionId);
    const allMemberships = await db.select().from(memberships).where(eq(memberships.userId, user.id));
    assert.equal(allMemberships.length, 1);
  } finally {
    await db.delete(memberships).where(eq(memberships.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
  }
});

test("Checkout session expiry uses Stripe status and expiry timestamp", () => {
  const now = Date.now();
  assert.equal(checkoutSessionIsExpired({ status: "expired", expires_at: Math.floor((now + 3600000) / 1000) }, now), true);
  assert.equal(checkoutSessionIsExpired({ status: "open", expires_at: Math.floor((now - 1000) / 1000) }, now), true);
  assert.equal(checkoutSessionIsExpired({ status: "open", expires_at: Math.floor((now + 3600000) / 1000) }, now), false);
});

test("Stripe checkout maintenance allows only one concurrent database lease owner", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "lease evidence must never run against production data");
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    let passes = 0;
    let firstPassStarted!: () => void;
    const firstPassReady = new Promise<void>((resolve) => {
      firstPassStarted = resolve;
    });

    const firstPass = withStripeCheckoutReconciliationLease(async () => {
      passes++;
      firstPassStarted();
      await sleep(250);
      return "first";
    }, { leaseMs: 1000 });

    await firstPassReady;
    const secondPass = withStripeCheckoutReconciliationLease(async () => {
      passes++;
      return "second";
    }, { leaseMs: 1000 });

    assert.equal(await secondPass, undefined);
    assert.equal(await firstPass, "first");
    assert.equal(passes, 1);
  } finally {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  }
});

test("Stripe checkout maintenance can resume after an abandoned database lease expires", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "lease evidence must never run against production data");
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  let abandonedPass: Promise<string | undefined> | undefined;
  let finishAbandonedPass!: () => void;
  try {
    let abandonedPassStarted!: () => void;
    const abandonedPassReady = new Promise<void>((resolve) => {
      abandonedPassStarted = resolve;
    });
    abandonedPass = withStripeCheckoutReconciliationLease(async () => {
      abandonedPassStarted();
      await new Promise<void>((resolve) => {
        finishAbandonedPass = resolve;
      });
      return "abandoned";
    }, { leaseMs: 100 });

    await abandonedPassReady;
    await sleep(250);

    const resumedPass = await withStripeCheckoutReconciliationLease(async () => "resumed", { leaseMs: 1000 });
    assert.equal(resumedPass, "resumed");

    finishAbandonedPass();
    assert.equal(await abandonedPass, "abandoned");
  } finally {
    if (finishAbandonedPass) finishAbandonedPass();
    if (abandonedPass) await abandonedPass;
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  }
});

test("stale checkout maintenance is bounded, observable, and retry-safe", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "fixture evidence must never run in production");
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const user = await storage.createUser(`stripe-maintenance-${suffix}@example.invalid`, "GroundUp-QA-Password-2026", "Stripe", "Maintenance", "5550000196", "en");
  try {
    const [plan] = await db.select().from(membershipPlans).where(eq(membershipPlans.internalKey, "ground_up_3")).limit(1);
    assert.ok(plan);
    const [expired] = await db.insert(memberships).values({
      userId: user.id,
      planId: plan.id,
      type: plan.internalKey,
      status: "pending",
      priceCents: plan.displayPriceCents || STRIPE_MEMBERSHIP_CATALOG.ground_up_3.amountCents,
      source: "stripe_checkout",
      billingSource: "stripe_checkout",
      billingState: "pending",
      stripeCustomerId: `cus_maintenance_${suffix}`,
      stripeCheckoutSessionId: `cs_maintenance_expired_${suffix}`,
    }).returning();
    const [retryable] = await db.insert(memberships).values({
      userId: user.id,
      planId: plan.id,
      type: plan.internalKey,
      status: "pending",
      priceCents: plan.displayPriceCents || STRIPE_MEMBERSHIP_CATALOG.ground_up_3.amountCents,
      source: "stripe_checkout",
      billingSource: "stripe_checkout",
      billingState: "pending",
      stripeCustomerId: `cus_maintenance_${suffix}`,
      stripeCheckoutSessionId: `cs_maintenance_retryable_${suffix}`,
    }).returning();
    const staleCreatedAt = new Date(Date.now() - 60 * 60 * 1000);
    await db.update(memberships).set({ createdAt: staleCreatedAt }).where(eq(memberships.id, expired.id));
    await db.update(memberships).set({
      createdAt: new Date(staleCreatedAt.getTime() + 1000),
    }).where(eq(memberships.id, retryable.id));

    const fakeStripe = {
      checkout: {
        sessions: {
          retrieve: async (sessionId: string) => {
            if (sessionId.includes("retryable")) throw new Error("temporary Stripe outage");
            return {
              id: sessionId,
              mode: "subscription",
              status: "expired",
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              subscription: null,
              metadata: {},
            };
          },
        },
      },
    } as unknown as Stripe;

    const summary = await reconcileStalePendingStripeCheckouts(fakeStripe, { limit: 1 });
    assert.equal(summary.scanned, 1);
    assert.equal(summary.expired, 1);
    assert.equal(summary.apiFailures, 0);

    const retrySummary = await reconcileStalePendingStripeCheckouts(fakeStripe);
    assert.equal(retrySummary.scanned, 1);
    assert.equal(retrySummary.apiFailures, 1);

    const [expiredAfter] = await db.select().from(memberships).where(eq(memberships.id, expired.id));
    const [retryableAfter] = await db.select().from(memberships).where(eq(memberships.id, retryable.id));
    assert.equal(expiredAfter.billingState, "cancelled");
    assert.equal(retryableAfter.billingState, "pending");
  } finally {
    await db.delete(memberships).where(eq(memberships.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
  }
});

test("Stripe lookup timeouts leave items retryable and do not block later maintenance items", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "fixture evidence must never run in production");
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const user = await storage.createUser(`stripe-timeout-${suffix}@example.invalid`, "GroundUp-QA-Password-2026", "Stripe", "Timeout", "5550000200", "en");
  try {
    const [plan] = await db.select().from(membershipPlans).where(eq(membershipPlans.internalKey, "ground_up_3")).limit(1);
    assert.ok(plan);
    const membershipValues = {
      userId: user.id,
      planId: plan.id,
      type: plan.internalKey,
      status: "pending",
      priceCents: plan.displayPriceCents || STRIPE_MEMBERSHIP_CATALOG.ground_up_3.amountCents,
      source: "stripe_checkout",
      billingSource: "stripe_checkout",
      billingState: "pending",
      stripeCustomerId: `cus_timeout_${suffix}`,
    } as const;
    const [checkoutTimeout] = await db.insert(memberships).values({
      ...membershipValues,
      stripeCheckoutSessionId: `cs_timeout_checkout_${suffix}`,
    }).returning();
    const [subscriptionTimeout] = await db.insert(memberships).values({
      ...membershipValues,
      stripeCheckoutSessionId: `cs_timeout_subscription_${suffix}`,
    }).returning();
    const [laterItem] = await db.insert(memberships).values({
      ...membershipValues,
      stripeCheckoutSessionId: `cs_timeout_later_${suffix}`,
    }).returning();
    const staleCreatedAt = new Date(Date.now() - 60 * 60 * 1000);
    await db.update(memberships).set({ createdAt: staleCreatedAt }).where(eq(memberships.id, checkoutTimeout.id));
    await db.update(memberships).set({
      createdAt: new Date(staleCreatedAt.getTime() + 1000),
    }).where(eq(memberships.id, subscriptionTimeout.id));
    await db.update(memberships).set({
      createdAt: new Date(staleCreatedAt.getTime() + 2000),
    }).where(eq(memberships.id, laterItem.id));

    let allowRetries = false;
    const observedTimeouts: number[] = [];
    const fakeStripe = {
      checkout: {
        sessions: {
          retrieve: async (sessionId: string, requestOptions?: { timeout?: number }) => {
            observedTimeouts.push(requestOptions?.timeout || 0);
            if (!allowRetries && sessionId.includes("checkout")) {
              return new Promise(() => {});
            }
            if (!allowRetries && sessionId.includes("subscription")) {
              return {
                id: sessionId,
                mode: "subscription",
                status: "complete",
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                subscription: `sub_timeout_${suffix}`,
                metadata: {},
              };
            }
            return {
              id: sessionId,
              mode: "subscription",
              status: "expired",
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              subscription: null,
              metadata: {},
            };
          },
        },
      },
      subscriptions: {
        retrieve: async (_subscriptionId: string, _params?: { expand?: string[] }, requestOptions?: { timeout?: number }) => {
          observedTimeouts.push(requestOptions?.timeout || 0);
          return new Promise(() => {});
        },
      },
    } as unknown as Stripe;

    const startedAt = Date.now();
    const summary = await reconcileStalePendingStripeCheckouts(fakeStripe, {
      requestTimeoutMs: 20,
    });
    assert.ok(Date.now() - startedAt < 1000, "each Stripe lookup must have a bounded wait");
    assert.equal(summary.scanned, 3);
    assert.equal(summary.apiFailures, 2);
    assert.equal(summary.expired, 1);
    assert.deepEqual(observedTimeouts, [20, 20, 20, 20]);

    const [checkoutTimeoutAfterFirstPass] = await db.select().from(memberships).where(eq(memberships.id, checkoutTimeout.id));
    const [subscriptionTimeoutAfterFirstPass] = await db.select().from(memberships).where(eq(memberships.id, subscriptionTimeout.id));
    const [laterItemAfterFirstPass] = await db.select().from(memberships).where(eq(memberships.id, laterItem.id));
    assert.equal(checkoutTimeoutAfterFirstPass.billingState, "pending");
    assert.equal(subscriptionTimeoutAfterFirstPass.billingState, "pending");
    assert.equal(laterItemAfterFirstPass.billingState, "cancelled");

    allowRetries = true;
    const retrySummary = await reconcileStalePendingStripeCheckouts(fakeStripe, {
      requestTimeoutMs: 20,
    });
    assert.equal(retrySummary.scanned, 2);
    assert.equal(retrySummary.apiFailures, 0);
    assert.equal(retrySummary.expired, 2);
    const retryableMemberships = await db.select().from(memberships).where(eq(memberships.userId, user.id));
    assert.equal(retryableMemberships.every((membership) => membership.billingState === "cancelled"), true);
  } finally {
    await db.delete(memberships).where(eq(memberships.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
  }
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
          price: {
            id: plan.stripePriceId,
            object: "price",
            active: true,
            currency: "usd",
            type: "recurring",
            unit_amount: plan.displayPriceCents,
            recurring: { interval: "month", interval_count: 1 },
            product: plan.stripeProductId,
          },
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

    const cancelledAt = timestamp + 60;
    const cancelledMembership = await applyStripeSubscription({
      id: stripeSubscriptionId,
      object: "subscription",
      customer: stripeCustomerId,
      metadata: {
        ground_up_user_id: user.id,
        ground_up_plan_key: plan.internalKey,
      },
      cancel_at_period_end: false,
      status: "canceled",
      start_date: timestamp,
      canceled_at: cancelledAt,
      ended_at: cancelledAt,
      latest_invoice: null,
      items: {
        data: [{
          current_period_start: timestamp,
          current_period_end: timestamp + 30 * 24 * 60 * 60,
          price: {
            id: plan.stripePriceId,
            object: "price",
            active: true,
            currency: "usd",
            type: "recurring",
            unit_amount: plan.displayPriceCents,
            recurring: { interval: "month", interval_count: 1 },
            product: plan.stripeProductId,
          },
        }],
      },
    } as unknown as Stripe.Subscription);
    assert.equal(cancelledMembership.id, pendingMembership.id);

    const cancelledResponse = await fetch(billingUrl);
    assert.equal(cancelledResponse.status, 200);
    const cancelledBilling = await cancelledResponse.json();
    assert.equal(cancelledBilling.activeMembership, null);
    assert.equal(cancelledBilling.pendingMembership, null);
    assert.equal(cancelledBilling.memberships.length, 1);
    assert.equal(cancelledBilling.memberships[0].id, pendingMembership.id);
    assert.equal(cancelledBilling.memberships[0].billingState, "cancelled");
    assert.equal(cancelledBilling.memberships[0].status, "cancelled");
    assert.ok(cancelledBilling.memberships[0].cancelledAt);
  } finally {
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
    await db.delete(memberships).where(eq(memberships.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
  }
});

test("member billing keeps the same active membership when Stripe reconciliation marks it past due", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "fixture evidence must never run in production");
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const user = await storage.createUser(
    `stripe-past-due-${suffix}@example.invalid`,
    "GroundUp-QA-Password-2026",
    "Stripe",
    "Past Due",
    "5550000200",
    "en",
  );
  let server: Server | undefined;

  try {
    const stripeCustomerId = `cus_past_due_${suffix}`;
    const stripeSubscriptionId = `sub_past_due_${suffix}`;
    await db.update(users).set({ stripeCustomerId }).where(eq(users.id, user.id));
    const [plan] = await db.select().from(membershipPlans).where(eq(membershipPlans.internalKey, "ground_up_3")).limit(1);
    assert.ok(plan, "the approved Ground Up 3 plan is required for past-due evidence");

    const app = express();
    app.use((req, _res, next) => {
      (req as any).session = { userId: user.id };
      next();
    });
    registerMemberRoutes(app);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve, reject) => {
      server!.once("listening", resolve);
      server!.once("error", reject);
    });
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const billingUrl = `http://127.0.0.1:${address.port}/api/portal/billing`;
    const timestamp = Math.floor(Date.now() / 1000);
    const subscription = {
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
          price: {
            id: plan.stripePriceId,
            object: "price",
            active: true,
            currency: "usd",
            type: "recurring",
            unit_amount: plan.displayPriceCents,
            recurring: { interval: "month", interval_count: 1 },
            product: plan.stripeProductId,
          },
        }],
      },
    } as unknown as Stripe.Subscription;

    const activeMembership = await applyStripeSubscription(subscription);
    const activeResponse = await fetch(billingUrl);
    assert.equal(activeResponse.status, 200);
    const activeBilling = await activeResponse.json();
    assert.equal(activeBilling.pendingMembership, null);
    assert.equal(activeBilling.activeMembership.id, activeMembership.id);
    assert.equal(activeBilling.activeMembership.billingState, "active");
    assert.equal(activeBilling.memberships.length, 1);

    const pastDueMembership = await applyStripeSubscription(
      { ...subscription, status: "past_due" },
      { latestInvoiceId: `in_past_due_${suffix}`, billingFailureAt: new Date() },
    );
    assert.equal(pastDueMembership.id, activeMembership.id);

    const pastDueResponse = await fetch(billingUrl);
    assert.equal(pastDueResponse.status, 200);
    const pastDueBilling = await pastDueResponse.json();
    assert.equal(pastDueBilling.pendingMembership, null);
    assert.equal(pastDueBilling.activeMembership.id, activeMembership.id);
    assert.equal(pastDueBilling.activeMembership.billingState, "past_due");
    assert.equal(pastDueBilling.activeMembership.status, "active");
    assert.equal(pastDueBilling.activeMembership.stripeSubscriptionId, stripeSubscriptionId);
    assert.equal(pastDueBilling.memberships.length, 1);
    assert.equal(pastDueBilling.memberships[0].id, activeMembership.id);
    assert.equal(pastDueBilling.memberships[0].billingState, "past_due");
  } finally {
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
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

test("test-mode Stripe catalog has one exact monthly price per approved plan", { skip: !process.env.STRIPE_TEST_SECRET_KEY }, async () => {
  const key = process.env.STRIPE_TEST_SECRET_KEY!;
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