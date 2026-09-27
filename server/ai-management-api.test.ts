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
const TEST_PROVIDER_KEY = "lime-provider-regression-key";
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

test("Lime provider credentials enforce scopes while the legacy AI key remains broad", { concurrency: false }, async () => {
  const previousProviderKey = process.env.LIME_AGENT_API_KEY;
  const previousProviderScopes = process.env.LIME_AGENT_API_SCOPES;
  const previousLegacyKey = process.env.AI_MANAGEMENT_API_KEY;
  const previousInfo = console.info;
  const auditLines: string[] = [];
  process.env.LIME_AGENT_API_KEY = TEST_PROVIDER_KEY;
  process.env.LIME_AGENT_API_SCOPES = "schedule:read";
  console.info = (...values: unknown[]) => auditLines.push(values.map(String).join(" "));
  const { server, baseUrl } = await startManagementApp();
  try {
    const openApiResponse = await fetch(`${baseUrl}/openapi.json`);
    assert.equal(openApiResponse.status, 200, "the OpenAPI document stays public");
    const openApi = await openApiResponse.json() as any;
    assert.ok(openApi["x-provider-scopes"].includes("schedule:read"));
    assert.deepEqual(openApi.paths["/api/ai/v1/operations/schedule"].get["x-required-scopes"], ["schedule:read"]);
    assert.deepEqual(openApi.paths["/api/ai/v1/operations/bookings"].get["x-required-scopes"], ["booking:read"]);
    assert.doesNotMatch(JSON.stringify(openApi), new RegExp(TEST_PROVIDER_KEY));

    const missingCredential = await fetch(`${baseUrl}/operations/schedule`);
    assert.equal(missingCredential.status, 401);
    assert.equal((await missingCredential.json()).code, "AI_MANAGEMENT_UNAUTHORIZED");
    assert.match(missingCredential.headers.get("x-request-id") || "", /^[\da-f-]{36}$/i);

    const invalidCredential = await fetch(`${baseUrl}/operations/schedule`, {
      headers: { Authorization: "Bearer invalid-provider-test-credential" },
    });
    assert.equal(invalidCredential.status, 401);

    const requestId = "3c54b25e-51d2-4807-a33e-ae34debcfe87";
    const allowedSchedule = await fetch(`${baseUrl}/operations/schedule`, {
      headers: {
        Authorization: `Bearer ${TEST_PROVIDER_KEY}`,
        "X-Request-Id": requestId,
      },
    });
    assert.equal(allowedSchedule.status, 200);
    assert.equal(allowedSchedule.headers.get("x-request-id"), requestId);

    const deniedBookings = await fetch(`${baseUrl}/operations/bookings`, {
      headers: { Authorization: `Bearer ${TEST_PROVIDER_KEY}` },
    });
    assert.equal(deniedBookings.status, 403);
    const deniedBody = await deniedBookings.json();
    assert.equal(deniedBody.code, "AI_SCOPE_FORBIDDEN");
    assert.deepEqual(deniedBody.requiredScopes, ["booking:read"]);
    assert.ok(deniedBody.requestId);

    for (const [documentedPath, pathItem] of Object.entries(openApi.paths)) {
      for (const [method, operation] of Object.entries(pathItem as Record<string, any>)) {
        const requiredScopes = operation["x-required-scopes"] as string[];
        assert.ok(requiredScopes.length > 0, `${method.toUpperCase()} ${documentedPath} must declare a scope`);
        if (documentedPath === "/api/ai/v1/operations/schedule" && method === "get") continue;
        const relativePath = documentedPath
          .slice("/api/ai/v1".length)
          .replace(/\{[^}]+\}/g, "not-a-real-record");
        const methodUpper = method.toUpperCase();
        const response = await fetch(`${baseUrl}${relativePath}`, {
          method: methodUpper,
          headers: {
            Authorization: `Bearer ${TEST_PROVIDER_KEY}`,
            ...(methodUpper === "PATCH" ? { "Content-Type": "application/json" } : {}),
          },
          ...(methodUpper === "PATCH" ? { body: JSON.stringify({ status: "canceled" }) } : {}),
        });
        assert.equal(response.status, 403, `${methodUpper} ${documentedPath} must deny a schedule-only credential`);
        assert.equal((await response.json()).code, "AI_SCOPE_FORBIDDEN");
      }
    }

    const legacyStillWorks = await fetch(`${baseUrl}/operations/payments`, { headers: authHeaders() });
    assert.equal(legacyStillWorks.status, 200, "the existing AI key retains backward-compatible access");

    delete process.env.LIME_AGENT_API_SCOPES;
    const missingScopeConfig = await fetch(`${baseUrl}/operations/schedule`, {
      headers: { Authorization: `Bearer ${TEST_PROVIDER_KEY}` },
    });
    assert.equal(missingScopeConfig.status, 403, "a missing scope configuration grants no provider capabilities");
    assert.equal((await missingScopeConfig.json()).code, "AI_SCOPE_FORBIDDEN");

    process.env.LIME_AGENT_API_SCOPES = "schedule:read,unrecognized:read";
    const unknownConfiguredScope = await fetch(`${baseUrl}/operations/schedule`, {
      headers: { Authorization: `Bearer ${TEST_PROVIDER_KEY}` },
    });
    assert.equal(unknownConfiguredScope.status, 503, "unknown configured scopes fail closed");
    assert.equal((await unknownConfiguredScope.json()).code, "AI_PROVIDER_SCOPE_CONFIGURATION_INVALID");

    process.env.AI_MANAGEMENT_API_KEY = TEST_PROVIDER_KEY;
    process.env.LIME_AGENT_API_SCOPES = "schedule:read";
    const credentialCollision = await fetch(`${baseUrl}/operations/schedule`, {
      headers: { Authorization: `Bearer ${TEST_PROVIDER_KEY}` },
    });
    assert.equal(credentialCollision.status, 503, "a scoped key may not silently inherit legacy broad access");
    assert.equal((await credentialCollision.json()).code, "AI_PROVIDER_CREDENTIAL_COLLISION");

    const parsedAudit = auditLines.map((line) => JSON.parse(line));
    const providerAudit = parsedAudit.find((entry) => entry.event === "ai_api_request" && entry.requestId === requestId);
    assert.ok(providerAudit, "authenticated provider requests emit an audit record");
    assert.equal(providerAudit.credentialClass, "lime_scoped");
    assert.equal(providerAudit.route, "/api/ai/v1/operations/schedule");
    assert.deepEqual(providerAudit.requiredScopes, ["schedule:read"]);
    assert.doesNotMatch(auditLines.join("\n"), new RegExp(TEST_PROVIDER_KEY));
  } finally {
    console.info = previousInfo;
    if (previousProviderKey === undefined) delete process.env.LIME_AGENT_API_KEY;
    else process.env.LIME_AGENT_API_KEY = previousProviderKey;
    if (previousProviderScopes === undefined) delete process.env.LIME_AGENT_API_SCOPES;
    else process.env.LIME_AGENT_API_SCOPES = previousProviderScopes;
    if (previousLegacyKey === undefined) delete process.env.AI_MANAGEMENT_API_KEY;
    else process.env.AI_MANAGEMENT_API_KEY = previousLegacyKey;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});