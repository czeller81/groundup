import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import Stripe from "stripe";
import { bookingBelongsToUser, createPublicRateLimit, createScannerProbeGuard, isScannerProbePath, requireAuth, requireRole } from "./route-security";
import { applySecurityHeaders } from "./security-headers";
import { verifyCalendlySignature, verifyStripeSignature } from "./webhook-security";

function responseRecorder() {
  const result: { statusCode: number; body?: unknown } = { statusCode: 200 };
  return {
    result,
    status(code: number) { result.statusCode = code; return this; },
    set(_nameOrHeaders: string | Record<string, string>, _value?: string) { return this; },
    type(_value: string) { return this; },
    json(body: unknown) { result.body = body; return this; },
    send(body: unknown) { result.body = body; return this; },
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

test("obvious vulnerability probe paths are identified and stopped before the SPA", () => {
  assert.equal(isScannerProbePath("/admin.php"), true);
  assert.equal(isScannerProbePath("/wp-admin/install.php?step=1"), true);
  assert.equal(isScannerProbePath("/.env"), true);
  assert.equal(isScannerProbePath("/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php"), true);
  assert.equal(isScannerProbePath("/contact"), false);

  const guard = createScannerProbeGuard(1, 60_000);
  const request = { ip: "127.0.0.1", originalUrl: "/admin.php" } as any;
  let res = responseRecorder();
  guard(request, res, () => { throw new Error("probe reached application"); });
  assert.equal(res.result.statusCode, 404);
  assert.equal(res.result.body, "Not found");
  res = responseRecorder();
  guard(request, res, () => { throw new Error("probe reached application"); });
  assert.equal(res.result.statusCode, 429);
});

test("baseline security headers are applied without exposing implementation details", () => {
  const headers: Record<string, string> = {};
  const res = {
    set(nameOrHeaders: string | Record<string, string>, value?: string) {
      if (typeof nameOrHeaders === "string") headers[nameOrHeaders] = value || "";
      else Object.assign(headers, nameOrHeaders);
      return this;
    },
  } as any;
  applySecurityHeaders({ path: "/api/portal/me" } as any, res, () => {});
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.equal(headers["X-Frame-Options"], "SAMEORIGIN");
  assert.equal(headers["Cache-Control"], "no-store");
});