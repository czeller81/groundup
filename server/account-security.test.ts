import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { eq, inArray } from "drizzle-orm";
import { accountCanUseMemberFeatures, consumePublicRateLimits, createPublicRateLimit, isOperationalAccount, publicBotCheck } from "./route-security";
import { db } from "./db";
import { storage } from "./storage";
import { emailVerificationTokens, memberAuditEvents, trialLeads, users } from "@shared/schema";

function responseRecorder() {
  const result: { statusCode: number; body?: unknown } = { statusCode: 200 };
  return {
    result,
    status(code: number) { result.statusCode = code; return this; },
    set() { return this; },
    json(body: unknown) { result.body = body; return this; },
  } as any;
}

test("public bot checks reject honeypot and instant submissions", () => {
  assert.equal(publicBotCheck({ body: { website: "filled", formStartedAt: Date.now() - 5000 } } as any), "honeypot");
  assert.equal(publicBotCheck({ body: { website: "", formStartedAt: Date.now() } } as any), "completion_time");
  assert.equal(publicBotCheck({ body: { website: "", formStartedAt: Date.now() - 2000 } } as any), null);
});

test("public rate limiter rejects repeated requests across separate middleware instances", async () => {
  const signal = `security-test-${crypto.randomBytes(6).toString("hex")}`;
  const firstMiddleware = createPublicRateLimit(1, 60_000, () => signal);
  const secondMiddleware = createPublicRateLimit(1, 60_000, () => signal);
  let nextCalls = 0;
  const req = { ip: "127.0.0.1", path: "/api/portal/signup" } as any;
  const first = responseRecorder();
  await firstMiddleware(req, first, () => { nextCalls++; });
  const second = responseRecorder();
  await secondMiddleware(req, second, () => { nextCalls++; });
  assert.equal(nextCalls, 1);
  assert.equal(second.result.statusCode, 429);
});

test("daily signup caps are shared and atomically reserve related signals", async () => {
  const signal = `daily-signup-test-${crypto.randomBytes(6).toString("hex")}`;
  const first = await consumePublicRateLimits([
    { key: `${signal}:ip`, limit: 1, windowMs: 60_000 },
    { key: `${signal}:device`, limit: 1, windowMs: 60_000 },
  ]);
  const second = await consumePublicRateLimits([
    { key: `${signal}:ip`, limit: 1, windowMs: 60_000 },
    { key: `${signal}:device`, limit: 1, windowMs: 60_000 },
  ]);
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);
});

test("expired public counters no longer block a later request", async () => {
  const signal = `expired-rate-limit-test-${crypto.randomBytes(6).toString("hex")}`;
  const startedAt = new Date(Date.now() - 10_000);
  await consumePublicRateLimits([{ key: signal, limit: 1, windowMs: 1_000 }], startedAt);
  const later = await consumePublicRateLimits(
    [{ key: signal, limit: 1, windowMs: 60_000 }],
    new Date(startedAt.getTime() + 2_000),
  );
  assert.equal(later.allowed, true);
});

test("unverified and suspicious accounts cannot use member features", () => {
  assert.equal(isOperationalAccount({ emailVerifiedAt: null, accountStatus: "unverified" }), false);
  assert.equal(accountCanUseMemberFeatures({ emailVerifiedAt: new Date(), accountStatus: "suspicious" }), false);
  assert.equal(isOperationalAccount({ emailVerifiedAt: new Date(), accountStatus: "legitimate" }), true);
});

test("suspicious accounts are counted as filtered out of the Discovery funnel", async () => {
  const suffix = crypto.randomBytes(6).toString("hex");
  const fixtureCreatedAt = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
  const fixtureUserIds: string[] = [];
  try {
    for (let index = 0; index < 6; index += 1) {
      const user = await storage.createUser(
        `suspicious-report-${suffix}-${index}@groundup.test`,
        "GroundUp-Report-Password",
        "Suspicious",
        `Fixture ${index}`,
        undefined,
        "en",
        { accountStatus: "suspicious", riskReasons: ["report-fixture"] },
      );
      fixtureUserIds.push(user.id);
      await db.update(users).set({
        emailVerifiedAt: new Date(),
        createdAt: fixtureCreatedAt,
      }).where(eq(users.id, user.id));
    }

    const report = await storage.getDiscoveryFunnelReport({
      from: new Date(fixtureCreatedAt.getTime() - 1_000),
      to: new Date(fixtureCreatedAt.getTime() + 1_000),
    });
    assert.equal(report.filteredOut.rawAccountsCreated, fixtureUserIds.length);
    assert.equal(report.filteredOut.excludedAccounts, fixtureUserIds.length);
    assert.equal(report.stages.accountCreated, 0);
  } finally {
    if (fixtureUserIds.length) await db.delete(users).where(inArray(users.id, fixtureUserIds));
  }
});

test("email verification tokens expire, are one-time, and activate a normal account", async () => {
  const suffix = crypto.randomBytes(6).toString("hex");
  const user = await storage.createUser(`verification-${suffix}@example.invalid`, "GroundUp-Verification-Password", "Verify", "Member");
  const tokenHash = crypto.createHash("sha256").update(`token-${suffix}`).digest("hex");
  try {
    await storage.createEmailVerificationToken(user.id, tokenHash, new Date(Date.now() + 60_000));
    const verified = await storage.consumeEmailVerificationToken(tokenHash);
    assert.equal(verified?.emailVerifiedAt !== null, true);
    assert.equal(verified?.accountStatus, "legitimate");
    assert.equal(await storage.consumeEmailVerificationToken(tokenHash), undefined);
  } finally {
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
  }
});

test("admin review can restore a suspicious account to legitimate", async () => {
  const suffix = crypto.randomBytes(6).toString("hex");
  const actor = await storage.createUser(`review-actor-${suffix}@example.invalid`, "GroundUp-Review-Password", "Review", "Actor");
  const member = await storage.createUser(
    `review-member-${suffix}@example.invalid`,
    "GroundUp-Review-Password",
    "Suspicious",
    "Member",
    undefined,
    "en",
    { accountStatus: "suspicious", riskReasons: ["test-signal"] },
  );
  try {
    const updated = await storage.updateAccountReview({
      userId: member.id,
      status: "legitimate",
      actorId: actor.id,
      reason: "Admin confirmed the account belongs to a real member.",
    });
    assert.equal(updated?.accountStatus, "legitimate");
    assert.deepEqual(updated?.riskReasons, ["test-signal"]);
  } finally {
    await db.delete(memberAuditEvents).where(eq(memberAuditEvents.actorId, actor.id));
    await db.delete(memberAuditEvents).where(eq(memberAuditEvents.userId, member.id));
    await db.delete(users).where(eq(users.id, member.id));
    await db.delete(users).where(eq(users.id, actor.id));
  }
});

test("suppressed leads stay out of active lead queues", async () => {
  const suffix = crypto.randomBytes(6).toString("hex");
  const lead = await storage.createTrialLead({
    firstName: "Suspicious",
    lastName: "Lead",
    email: `suppressed-lead-${suffix}@test.invalid`,
    phone: "5550000998",
    program: "adaptive-capacity",
    experience: "none",
  });
  try {
    await storage.updateTrialLeadStatus(lead.id, "suspicious");
    const activeLeads = await storage.getTrialLeads("adaptive-capacity");
    const allLeads = await storage.getTrialLeads("adaptive-capacity", { includeSuppressed: true });
    assert.equal(activeLeads.some((item) => item.id === lead.id), false);
    assert.equal(allLeads.some((item) => item.id === lead.id && item.status === "suspicious"), true);
  } finally {
    await db.delete(trialLeads).where(eq(trialLeads.id, lead.id));
  }
});