import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { accountCanUseMemberFeatures, createPublicRateLimit, isOperationalAccount, publicBotCheck } from "./route-security";
import { storage } from "./storage";

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

test("public rate limiter rejects repeated requests for the same signal", () => {
  const middleware = createPublicRateLimit(1, 60_000, () => "security-test");
  let nextCalls = 0;
  const req = { ip: "127.0.0.1", path: "/api/portal/signup" } as any;
  const first = responseRecorder();
  middleware(req, first, () => { nextCalls++; });
  const second = responseRecorder();
  middleware(req, second, () => { nextCalls++; });
  assert.equal(nextCalls, 1);
  assert.equal(second.result.statusCode, 429);
});

test("unverified and suspicious accounts cannot use member features", () => {
  assert.equal(isOperationalAccount({ emailVerifiedAt: null, accountStatus: "unverified" }), false);
  assert.equal(accountCanUseMemberFeatures({ emailVerifiedAt: new Date(), accountStatus: "suspicious" }), false);
  assert.equal(isOperationalAccount({ emailVerifiedAt: new Date(), accountStatus: "legitimate" }), true);
});

test("suspicious accounts are counted as filtered out of the Discovery funnel", async () => {
  const report = await storage.getDiscoveryFunnelReport({ days: 30 });
  assert.ok(report.filteredOut.excludedAccounts >= 6);
  assert.ok(report.stages.accountCreated <= report.filteredOut.rawAccountsCreated);
});

test("email verification tokens expire, are one-time, and activate a normal account", async () => {
  const suffix = crypto.randomBytes(6).toString("hex");
  const user = await storage.createUser(`verification-${suffix}@example.invalid`, "GroundUp-Verification-Password", "Verify", "Member");
  const tokenHash = crypto.createHash("sha256").update(`token-${suffix}`).digest("hex");
  await storage.createEmailVerificationToken(user.id, tokenHash, new Date(Date.now() + 60_000));
  const verified = await storage.consumeEmailVerificationToken(tokenHash);
  assert.equal(verified?.emailVerifiedAt !== null, true);
  assert.equal(verified?.accountStatus, "legitimate");
  assert.equal(await storage.consumeEmailVerificationToken(tokenHash), undefined);
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
  const updated = await storage.updateAccountReview({
    userId: member.id,
    status: "legitimate",
    actorId: actor.id,
    reason: "Admin confirmed the account belongs to a real member.",
  });
  assert.equal(updated?.accountStatus, "legitimate");
  assert.deepEqual(updated?.riskReasons, ["test-signal"]);
});