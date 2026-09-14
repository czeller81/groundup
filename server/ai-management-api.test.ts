import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import type { Server } from "node:http";
import { after, test } from "node:test";
import { eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { registerAiManagementRoutes } from "./ai-management-api";
import { storage } from "./storage";
import { bookings, membershipPlans, memberships, trainers, users } from "@shared/schema";

const TEST_KEY = "ai-management-regression-key";
const previousKey = process.env.AI_MANAGEMENT_API_KEY;
process.env.AI_MANAGEMENT_API_KEY = TEST_KEY;

after(() => {
  if (previousKey === undefined) delete process.env.AI_MANAGEMENT_API_KEY;
  else process.env.AI_MANAGEMENT_API_KEY = previousKey;
});

async function startManagementApp() {
  const app = express();
  app.use(express.json());
  registerAiManagementRoutes(app);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}/api/ai/v1`,
  };
}

async function createFixtures() {
  const suffix = randomUUID();
  const includedEmail = `ai-management-${suffix}@groundup.test`;
  const excludedEmail = `ai-management-${suffix}@example.invalid`;
  const includedUser = await storage.createUser(includedEmail, "Regression-only-password", "Report", "Member", "5550000201", "en");
  const excludedUser = await storage.createUser(excludedEmail, "Regression-only-password", "Internal", "Fixture", "5550000202", "en");
  const [plan] = await db.select().from(membershipPlans).where(eq(membershipPlans.internalKey, "ground_up_2")).limit(1);
  assert.ok(plan, "approved Ground Up 2 plan is required for report fixtures");
  const [trainer] = await db.insert(trainers).values({
    name: `Report Fixture Coach ${suffix}`,
    bio: "Regression fixture",
    photoUrl: "https://example.test/fixture.png",
    beltRank: "black",
    availability: {},
  }).returning();
  const [membership] = await db.insert(memberships).values({
    userId: includedUser.id,
    planId: plan.id,
    type: plan.internalKey,
    status: "active",
    priceCents: plan.displayPriceCents || 13900,
    source: "stripe_checkout",
    billingSource: "stripe_checkout",
    billingState: "active",
    stripeCustomerId: `cus_report_${suffix}`,
    stripeProductId: plan.stripeProductId,
    stripePriceId: plan.stripePriceId,
    stripeSubscriptionId: `sub_report_${suffix}`,
  }).returning();
  const now = new Date("2099-01-01T00:00:00.000Z").getTime();
  const [includedBooking] = await db.insert(bookings).values({
    userId: includedUser.id,
    customerName: "Report Member",
    customerEmail: includedEmail,
    customerPhone: "5550000201",
    notes: "not exported",
    sessionType: "Report fixture",
    start: new Date(now + 60 * 60 * 1000),
    end: new Date(now + 2 * 60 * 60 * 1000),
    trainerId: trainer.id,
    amountCents: 13900,
    currency: "usd",
    stripeSessionId: "=HYPERLINK(\"https://example.test\")",
    paymentStatus: "paid",
    status: "paid",
    createdAt: new Date(now),
  }).returning();
  const [excludedBooking] = await db.insert(bookings).values({
    userId: excludedUser.id,
    customerName: "Internal Fixture",
    customerEmail: excludedEmail,
    customerPhone: "5550000202",
    sessionType: "Internal report fixture",
    start: new Date(now + 60 * 60 * 1000),
    end: new Date(now + 2 * 60 * 60 * 1000),
    trainerId: trainer.id,
    amountCents: 100,
    currency: "usd",
    stripeSessionId: `cs_internal_${suffix}`,
    paymentStatus: "paid",
    status: "paid",
    createdAt: new Date(now),
  }).returning();

  return {
    includedUserId: includedUser.id,
    excludedUserId: excludedUser.id,
    trainerId: trainer.id,
    membershipId: membership.id,
    includedBookingId: includedBooking.id,
    excludedBookingId: excludedBooking.id,
    createdAt: new Date(now),
  };
}

async function cleanupFixtures(fixture: Awaited<ReturnType<typeof createFixtures>>) {
  await db.delete(bookings).where(inArray(bookings.id, [fixture.includedBookingId, fixture.excludedBookingId]));
  await db.delete(memberships).where(eq(memberships.id, fixture.membershipId));
  await db.delete(trainers).where(eq(trainers.id, fixture.trainerId));
  await db.delete(users).where(inArray(users.id, [fixture.includedUserId, fixture.excludedUserId]));
}

function authHeaders() {
  return { Authorization: `Bearer ${TEST_KEY}` };
}

test("AI management reports enforce permissions, pagination, date filters, and fixture exclusion", { concurrency: false }, async () => {
  const fixture = await createFixtures();
  const { server, baseUrl } = await startManagementApp();
  try {
    const unauthorized = await fetch(`${baseUrl}/operations/payments`);
    assert.equal(unauthorized.status, 401);
    const wrongToken = await fetch(`${baseUrl}/operations/memberships`, {
      headers: { Authorization: "Bearer wrong-token" },
    });
    assert.equal(wrongToken.status, 401);

    const payments = await fetch(`${baseUrl}/operations/payments?page=1&limit=1000`, { headers: authHeaders() });
    assert.equal(payments.status, 200);
    const paymentReport = await payments.json();
    assert.equal(paymentReport.limit, 100, "pagination must clamp to the documented maximum");
    assert.equal(paymentReport.total, 1, "internal test records must be excluded");
    assert.equal(paymentReport.rows[0].id, fixture.includedBookingId);
    assert.equal(paymentReport.rows[0].feeCents, null);
    assert.equal(paymentReport.rows[0].refundStatus, "unavailable");
    assert.equal(paymentReport.rows[0].accountingNote, undefined, "accounting notes belong at report level");

    const secondPage = await fetch(`${baseUrl}/operations/payments?page=2&limit=1`, { headers: authHeaders() });
    const secondPageReport = await secondPage.json();
    assert.equal(secondPageReport.total, 1);
    assert.deepEqual(secondPageReport.rows, []);

    const membershipsReportResponse = await fetch(`${baseUrl}/operations/memberships?page=1&limit=1`, { headers: authHeaders() });
    assert.equal(membershipsReportResponse.status, 200);
    const membershipsReport = await membershipsReportResponse.json();
    assert.equal(membershipsReport.total, 1);
    assert.equal(membershipsReport.rows[0].id, fixture.membershipId);
    assert.equal("email" in membershipsReport.rows[0], false, "membership report must not expose email");
    assert.equal("phone" in membershipsReport.rows[0], false, "membership report must not expose phone");

    const bounded = await fetch(`${baseUrl}/operations/payments?from=${encodeURIComponent(new Date(fixture.createdAt.getTime() - 1_000).toISOString())}&to=${encodeURIComponent(new Date(fixture.createdAt.getTime() + 1_000).toISOString())}`, { headers: authHeaders() });
    const boundedReport = await bounded.json();
    assert.equal(boundedReport.total, 1);
    const excludedByDate = await fetch(`${baseUrl}/operations/payments?from=${encodeURIComponent(new Date(fixture.createdAt.getTime() + 60_000).toISOString())}`, { headers: authHeaders() });
    assert.equal((await excludedByDate.json()).total, 0);

    const invalidDate = await fetch(`${baseUrl}/operations/payments?from=not-a-date`, { headers: authHeaders() });
    assert.equal(invalidDate.status, 400);
    const reversedDate = await fetch(`${baseUrl}/operations/payments?from=2026-02-02T00:00:00.000Z&to=2026-02-01T00:00:00.000Z`, { headers: authHeaders() });
    assert.equal(reversedDate.status, 400);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await cleanupFixtures(fixture);
  }
});

test("AI management CSV export is bounded, redacts fixtures, and escapes formula cells", { concurrency: false }, async () => {
  const fixture = await createFixtures();
  const { server, baseUrl } = await startManagementApp();
  try {
    const response = await fetch(`${baseUrl}/operations/payments.csv`, { headers: authHeaders() });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") || "", /text\/csv/);
    assert.match(response.headers.get("cache-control") || "", /no-store/);
    const csv = await response.text();
    assert.match(csv, /record_type/);
    assert.match(csv, new RegExp(`"${fixture.includedBookingId}"`));
    assert.doesNotMatch(csv, new RegExp(fixture.excludedBookingId));
    assert.match(csv, /"'=HYPERLINK/);
    assert.doesNotMatch(csv, /Report Member|5550000201|not exported/);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await cleanupFixtures(fixture);
  }
});