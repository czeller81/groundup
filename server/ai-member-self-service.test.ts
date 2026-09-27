import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bookingInputSchema,
  buildBookingPreviewResponse,
  confirmedBookingInputSchema,
  createDelegationSchema,
  hasDependentBookingScope,
  hashDelegationToken,
  isMemberAiSelfServiceEnabled,
  MEMBER_AI_SCOPES,
} from "./ai-member-self-service";

const occurrenceId = "b31f1606-34fb-45af-987b-6c7193ad5324";
const minorProfileId = "5e3cb341-7d6f-438a-8467-272347d18ae5";

test("delegation requests reject client identity, unknown scopes, duplicates, and expirations over seven days", () => {
  const request = {
    scopes: ["self:schedule:read"],
    expiresInHours: 168,
  };
  assert.equal(createDelegationSchema.safeParse(request).success, true);
  assert.equal(createDelegationSchema.safeParse({ ...request, userId: "another-member" }).success, false);
  assert.equal(createDelegationSchema.safeParse({ ...request, scopes: ["admin:all"] }).success, false);
  assert.equal(createDelegationSchema.safeParse({ ...request, scopes: ["self:schedule:read", "self:schedule:read"] }).success, false);
  assert.equal(createDelegationSchema.safeParse({ ...request, expiresInHours: 169 }).success, false);
  assert.ok(MEMBER_AI_SCOPES.includes("self:reservation:create"));
});

test("booking requests derive member identity server-side and require explicit confirmation", () => {
  assert.equal(bookingInputSchema.safeParse({ occurrenceId }).success, true);
  assert.equal(bookingInputSchema.safeParse({ occurrenceId, minorProfileId }).success, true);
  assert.equal(bookingInputSchema.safeParse({ occurrenceId, userId: "attacker" }).success, false);
  assert.equal(bookingInputSchema.safeParse({ occurrenceId, email: "attacker@example.test" }).success, false);
  assert.equal(confirmedBookingInputSchema.safeParse({ occurrenceId, confirm: true }).success, true);
  assert.equal(confirmedBookingInputSchema.safeParse({ occurrenceId, confirm: false }).success, false);
  assert.equal(confirmedBookingInputSchema.safeParse({ occurrenceId }).success, false);
});

test("dependent booking requires the separate dependent-name scope", () => {
  const bookingOnly = new Set(["self:reservation:create"] as const);
  const dependentRead = new Set(["self:reservation:create", "self:dependents:read"] as const);
  assert.equal(hasDependentBookingScope(bookingOnly, undefined), true);
  assert.equal(hasDependentBookingScope(bookingOnly, minorProfileId), false);
  assert.equal(hasDependentBookingScope(dependentRead, minorProfileId), true);
});

test("delegation tokens are stored as a one-way SHA-256 digest", () => {
  const token = "member_ai_example_secret";
  const digest = hashDelegationToken(token);
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.notEqual(digest, token);
  assert.notEqual(digest, hashDelegationToken(`${token}-different`));
});

test("ineligible booking previews never claim a reservation outcome", () => {
  const ineligible = {
    eligible: false,
    code: "WEEKLY_LIMIT_REACHED",
    message: "Weekly limit reached.",
    waitlistAllowed: false,
  } as Parameters<typeof buildBookingPreviewResponse>[0];
  const preview = buildBookingPreviewResponse(ineligible);
  assert.equal(preview.eligible, false);
  assert.equal(preview.bookingOutcome, null);
  assert.equal(preview.requiresExplicitConfirmation, false);
  assert.equal(preview.waitlistAllowed, false);
});

test("eligible booking previews distinguish confirmed and waitlisted outcomes", () => {
  const eligible = {
    eligible: true,
    code: "ELIGIBLE",
    message: "Eligible.",
    waitlistAllowed: true,
  } as Parameters<typeof buildBookingPreviewResponse>[0];
  const waitlist = {
    ...eligible,
    code: "CLASS_FULL_WAITLIST_AVAILABLE",
  } as Parameters<typeof buildBookingPreviewResponse>[0];
  assert.equal(buildBookingPreviewResponse(eligible).bookingOutcome, "confirmed");
  assert.equal(buildBookingPreviewResponse(eligible).requiresExplicitConfirmation, true);
  assert.equal(buildBookingPreviewResponse(waitlist).bookingOutcome, "waitlisted");
});

test("a missing human waiver keeps booking preview ineligible", () => {
  const eligible = {
    eligible: true,
    code: "ELIGIBLE",
    message: "Eligible.",
    waitlistAllowed: true,
  } as Parameters<typeof buildBookingPreviewResponse>[0];
  const preview = buildBookingPreviewResponse(eligible, false);
  assert.equal(preview.eligible, false);
  assert.equal(preview.code, "CURRENT_WAIVER_REQUIRED");
  assert.equal(preview.bookingOutcome, null);
  assert.equal(preview.requiresHumanAction, true);
});

test("production activation requires the dedicated server opt-in and a database configuration", () => {
  const keys = ["NODE_ENV", "MEMBER_AI_SELF_SERVICE_ENABLED", "VITE_MEMBER_AI_SELF_SERVICE_ENABLED", "DATABASE_URL", "NEON_DATABASE_URL"] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.NODE_ENV = "production";
  delete process.env.MEMBER_AI_SELF_SERVICE_ENABLED;
  process.env.VITE_MEMBER_AI_SELF_SERVICE_ENABLED = "true";
  process.env.DATABASE_URL = "configured-for-test";
  delete process.env.NEON_DATABASE_URL;
  try {
    assert.equal(isMemberAiSelfServiceEnabled(), false);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("the dedicated server opt-in works in production but fails closed without a database", () => {
  const keys = ["NODE_ENV", "MEMBER_AI_SELF_SERVICE_ENABLED", "DATABASE_URL", "NEON_DATABASE_URL"] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.NODE_ENV = "production";
  process.env.MEMBER_AI_SELF_SERVICE_ENABLED = "true";
  process.env.DATABASE_URL = "configured-for-test";
  delete process.env.NEON_DATABASE_URL;
  try {
    assert.equal(isMemberAiSelfServiceEnabled(), true);
    delete process.env.DATABASE_URL;
    assert.equal(isMemberAiSelfServiceEnabled(), false);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});