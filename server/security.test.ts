import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import Stripe from "stripe";
import { bookingBelongsToUser, canRetryWebhook, coachCanManageMember, createOriginProtection, createPublicRateLimit, createScannerProbeGuard, isInternalTestEmail, isPublicOccurrenceText, isScannerProbePath, requireAuth, requireRole } from "./route-security";
import { applySecurityHeaders } from "./security-headers";
import { verifyCalendlySignature, verifyStripeSignature } from "./webhook-security";
import { FORM_COPY, PORTAL_COPY, localizeFormOption, localizeFormText } from "../client/src/lib/locale";
import { classDateLabel, classTimeLabel } from "../client/src/lib/class-booking";
import { portalNavigationPaths } from "../client/src/lib/portal-navigation";
import { localizeApiError, resolveLocale } from "../client/src/lib/locale";
import { PUBLIC_NO_SCRIPT_DISCOVERY_ROUTES, PUBLIC_NO_SCRIPT_NON_DISCOVERY_ROUTES } from "../client/src/public-route-inventory";
import { applyDocumentLocale, documentLocaleForPath } from "./document-locale";

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
  assert.deepEqual(portalNavigationPaths("member"), ["/portal/dashboard", "/portal/billing", "/portal/schedule", "/portal/my-classes"]);
  assert.deepEqual(portalNavigationPaths("coach"), ["/portal/dashboard", "/portal/billing", "/portal/schedule", "/portal/my-classes", "/portal/coach"]);
  assert.deepEqual(portalNavigationPaths("admin"), ["/portal/dashboard", "/portal/billing", "/portal/schedule", "/portal/my-classes", "/portal/coach", "/portal/class-admin", "/portal/admin"]);
});

test("one locale resolver gives explicit routes precedence and portal preferences persistence", () => {
  assert.equal(resolveLocale("/es/programas", "en", "en"), "es");
  assert.equal(resolveLocale("/personal-training", "es", "es"), "en");
  assert.equal(resolveLocale("/portal/dashboard", "es", "en"), "es");
  assert.equal(resolveLocale("/portal/dashboard", null, "es"), "es");
  assert.equal(resolveLocale("/portal/dashboard", null, null, "es"), "es");
  assert.equal(resolveLocale("/portal/login?locale=en", "es", "es"), "en");
  assert.equal(localizeApiError("Invalid email or password", "es", "Error"), "El correo o la contraseña no son válidos.");
});

test("document locale follows the localized route on direct and portal paths", () => {
  assert.equal(documentLocaleForPath("/discovery-pass"), "en");
  assert.equal(documentLocaleForPath("/es/discovery-pass"), "es");
  assert.equal(documentLocaleForPath("/es/portal/login"), "es");
  assert.equal(documentLocaleForPath("/portal/login"), "en");
  assert.match(applyDocumentLocale('<html lang="en">', "/es/discovery-pass"), /<html lang="es">/);
  assert.match(applyDocumentLocale('<html lang="es">', "/discovery-pass"), /<html lang="en">/);
});

test("server fallback pages preserve localized Discovery Pass destinations", () => {
  const routesSource = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const pageContentSource = routesSource.slice(
    routesSource.indexOf("const PAGE_CONTENT"),
    routesSource.indexOf("async function serveWithMeta"),
  );
  const entryFor = (routePath: string) => {
    const escapedPath = routePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const entry = pageContentSource.match(new RegExp(`  "${escapedPath}":[\\s\\S]*?(?=\\n  "/|\\n};)`));
    assert.ok(entry, `Missing server fallback content for ${routePath}`);
    return entry[0];
  };

  for (const route of PUBLIC_NO_SCRIPT_DISCOVERY_ROUTES) {
    assert.match(entryFor(route.englishPath), new RegExp(`href="${route.englishDestination}"`));
    assert.match(entryFor(route.spanishPath), new RegExp(`href="${route.spanishDestination}"`));
  }

  assert.match(entryFor("/es/girls"), /href="\/es\/contacto"/);
  assert.doesNotMatch(entryFor("/es/girls"), /discovery-pass/);
  assert.doesNotMatch(pageContentSource, /"\/es\/programas":/);
});

test("Personal training, Spanish booking, and Adaptive Capacity fallbacks stay outside Discovery Pass", () => {
  const routesSource = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const pageContentSource = routesSource.slice(
    routesSource.indexOf("const PAGE_CONTENT"),
    routesSource.indexOf("async function serveWithMeta"),
  );
  const entryFor = (routePath: string) => {
    const escapedPath = routePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const entry = pageContentSource.match(new RegExp(`  "${escapedPath}":[\\s\\S]*?(?=\\n  "/|\\n};)`));
    assert.ok(entry, `Missing server fallback content for ${routePath}`);
    return entry[0];
  };

  for (const route of PUBLIC_NO_SCRIPT_NON_DISCOVERY_ROUTES) {
    const entry = entryFor(route.path);
    for (const destination of route.requiredLinks) {
      assert.match(entry, new RegExp(`href="${destination.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
    }
    assert.doesNotMatch(entry, /discovery-pass/);
  }
});

test("Spanish booking and Adaptive Capacity fallbacks retain localized metadata", () => {
  const routesSource = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  assert.match(routesSource, /"\/es\/reservar": \{\s*title: "Obtén tu Discovery Pass Gratis/);
  assert.match(routesSource, /canonical: "https:\/\/www\.groundupbjj\.com\/es\/reservar"/);
  assert.match(routesSource, /"\/es\/adaptive-capacity": \{\s*title: "Capacidad Adaptativa/);
  assert.match(routesSource, /canonical: "https:\/\/www\.groundupbjj\.com\/es\/adaptive-capacity"/);
  assert.match(routesSource, /"\/es\/adaptive-capacity": \{ en: "https:\/\/www\.groundupbjj\.com\/adaptive-capacity", es: "https:\/\/www\.groundupbjj\.com\/es\/adaptive-capacity" \}/);
});

test("payment creation cannot use another member's booking", () => {
  assert.equal(bookingBelongsToUser({ userId: "member-a" }, "member-b"), false);
  assert.equal(bookingBelongsToUser({ userId: "member-a" }, "member-a"), true);
  assert.equal(bookingBelongsToUser(undefined, "member-a"), false);
});

test("coach access stays scoped to assigned members across member-owned objects", () => {
  assert.equal(coachCanManageMember({ assignedCoachId: "coach-a" }, "coach-a"), true);
  assert.equal(coachCanManageMember({ assignedCoachId: "coach-a" }, "coach-b"), false);
  assert.equal(coachCanManageMember({ assignedCoachId: null }, "coach-a"), false);
});

test("browser mutations reject cross-site origins but allow same-origin and webhooks", () => {
  const guard = createOriginProtection();
  const next = () => {};
  let res = responseRecorder();
  guard({ method: "POST", path: "/api/contact", protocol: "https", get: (name: string) => name === "host" ? "groundupbjj.com" : name === "origin" ? "https://evil.example" : undefined } as any, res, next);
  assert.equal(res.result.statusCode, 403);
  let called = false;
  guard({ method: "POST", path: "/api/contact", protocol: "https", get: (name: string) => name === "host" ? "groundupbjj.com" : name === "origin" ? "https://groundupbjj.com" : undefined } as any, responseRecorder(), () => { called = true; });
  assert.equal(called, true);
  called = false;
  guard({ method: "POST", path: "/api/stripe/webhook", protocol: "https", get: () => "https://evil.example" } as any, responseRecorder(), () => { called = true; });
  assert.equal(called, true);
});

test("webhook retries only after a retryable failure is unlocked", () => {
  const now = new Date("2026-09-01T20:00:00.000Z");
  assert.equal(canRetryWebhook("completed", null, now), false);
  assert.equal(canRetryWebhook("failed_terminal", null, now), false);
  assert.equal(canRetryWebhook("processing", new Date("2026-09-01T20:05:00.000Z"), now), false);
  assert.equal(canRetryWebhook("failed_retryable", null, now), true);
  assert.equal(canRetryWebhook("processing", new Date("2026-09-01T19:55:00.000Z"), now), true);
});

test("public occurrence filtering excludes test-marked records without deleting them", () => {
  assert.equal(isPublicOccurrenceText("Women’s BJJ", "Beginner class", "Oxnard"), true);
  assert.equal(isPublicOccurrenceText("BOOKING READINESS TEST SERIES", "Internal test", "Oxnard"), false);
  assert.equal(isPublicOccurrenceText("Women’s BJJ", null, "TEST LOCATION"), false);
  assert.equal(isPublicOccurrenceText("QA Future Skill Class", "Skill", "Ground Up fixture"), false);
  assert.equal(isPublicOccurrenceText("Women’s BJJ", "Beginner class", "Fixture Coach"), false);
});

test("internal QA email markers stay out of production-facing admin data", () => {
  assert.equal(isInternalTestEmail("mobile-qa-member@example.invalid"), true);
  assert.equal(isInternalTestEmail("member@gmail.com"), false);
  assert.equal(isInternalTestEmail(null), false);
});

test("public rate limits count per IP and path", async () => {
  const limit = createPublicRateLimit(2, 60_000);
  const next = () => {};
  const request = { ip: "127.0.0.1", path: "/api/contact" } as any;
  let res = responseRecorder();
  await limit(request, res, next);
  await limit(request, res, next);
  await limit(request, res, next);
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

test("portal copy stays available in English and Spanish", () => {
  for (const locale of ["en", "es"] as const) {
    assert.ok(PORTAL_COPY[locale].dashboard);
    assert.ok(PORTAL_COPY[locale].schedule);
    assert.ok(PORTAL_COPY[locale].myClasses);
    assert.ok(PORTAL_COPY[locale].viewSchedule);
    assert.ok(PORTAL_COPY[locale].loadError);
  }
  assert.notEqual(PORTAL_COPY.en.dashboard, PORTAL_COPY.es.dashboard);
  assert.notEqual(PORTAL_COPY.en.viewSchedule, PORTAL_COPY.es.viewSchedule);
});

test("class labels honor the selected portal locale", () => {
  const start = "2026-09-05T17:00:00.000Z";
  const end = "2026-09-05T18:30:00.000Z";
  assert.match(classDateLabel(start, "en"), /Sat/);
  assert.match(classDateLabel(start, "es"), /sáb/i);
  assert.match(classTimeLabel(start, end, "en"), /:/);
  assert.match(classTimeLabel(start, end, "es"), /:/);
  assert.notEqual(classDateLabel(start, "en"), classDateLabel(start, "es"));
});

test("member-facing seeded forms provide Spanish labels without changing stored keys or values", () => {
  assert.equal(localizeFormText("es", "health-parq", "title", "Health & PAR-Q Assessment"), "Evaluación de salud y PAR-Q");
  assert.equal(localizeFormText("es", "health-parq", "field", "Has a doctor ever said you have a heart condition?", "heartCondition"), "¿Algún médico te ha dicho que tienes una enfermedad cardíaca?");
  assert.equal(localizeFormOption("es", "goals-preferences", "Self-Defense"), "Defensa personal");
  assert.equal(localizeFormText("en", "health-parq", "field", "Has a doctor ever said you have a heart condition?", "heartCondition"), "Has a doctor ever said you have a heart condition?");
  assert.ok(FORM_COPY["minor-consent"]?.es?.fields.childAge);
});