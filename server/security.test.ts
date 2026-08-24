import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import Stripe from "stripe";
import { bookingBelongsToUser, createPublicRateLimit, requireAuth, requireRole } from "./route-security";
import { verifyCalendlySignature, verifyStripeSignature } from "./webhook-security";

function responseRecorder() {
  const result: { statusCode: number; body?: unknown } = { statusCode: 200 };
  return {
    result,
    status(code: number) { result.statusCode = code; return this; },
    json(body: unknown) { result.body = body; return this; },
  } as any;
}

test("Stripe accepts a correctly signed raw payload and rejects tampering", () => {
  const stripe = new Stripe("sk_test_" + "x".repeat(24), { apiVersion: "2025-08-27.basil" });
  const secret = "whsec_test_secret";
  const body = Buffer.from(JSON.stringify({ id: "evt_test", object: "event", type: "ping", data: { object: {} } }));
  const signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret });
  assert.equal(verifyStripeSignature(stripe, body, signature, secret).id, "evt_test");
  assert.throws(() => verifyStripeSignature(stripe, Buffer.from(body.toString() + " "), signature, secret));
  assert.throws(() => verifyStripeSignature(stripe, body, undefined, secret));
});

test("Calendly verifies timestamped HMAC signatures and rejects replay/tampering", () => {
  const body = Buffer.from('{"event":"invitee.created"}');
  const now = 1_700_000_000;
  const digest = crypto.createHmac("sha256", "calendly-secret").update(`${now}.${body}`).digest("hex");
  const signature = `t=${now},v1=${digest}`;
  assert.equal(verifyCalendlySignature(body, signature, "calendly-secret", 300, now), true);
  assert.equal(verifyCalendlySignature(body, signature, "calendly-secret", 300, now + 301), false);
  assert.equal(verifyCalendlySignature(Buffer.from("{}"), signature, "calendly-secret", 300, now), false);
});

test("legacy role routes remain closed to anonymous and unauthorized sessions", () => {
  const next = () => {};
  let res = responseRecorder();
  requireAuth({ session: {} } as any, res, next);
  assert.equal(res.result.statusCode, 401);
  res = responseRecorder();
  requireRole("admin")({ session: { userId: "member", userRole: "member" } } as any, res, next);
  assert.equal(res.result.statusCode, 403);
  let called = false;
  requireRole("admin")({ session: { userId: "admin", userRole: "admin" } } as any, res, () => { called = true; });
  assert.equal(called, true);
});

test("payment creation cannot use another member's booking", () => {
  assert.equal(bookingBelongsToUser({ userId: "member-a" }, "member-b"), false);
  assert.equal(bookingBelongsToUser({ userId: "member-a" }, "member-a"), true);
  assert.equal(bookingBelongsToUser(undefined, "member-a"), false);
});

test("public rate limits count per IP and path", () => {
  const limit = createPublicRateLimit(2, 60_000);
  const next = () => {};
  const request = { ip: "127.0.0.1", path: "/api/contact" } as any;
  let res = responseRecorder();
  limit(request, res, next);
  limit(request, res, next);
  limit(request, res, next);
  assert.equal(res.result.statusCode, 429);
});