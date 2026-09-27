import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bookingInputSchema,
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

test("delegated routes cannot be enabled in production", () => {
  const previousMode = process.env.NODE_ENV;
  const previousFlag = process.env.VITE_MEMBER_AI_SELF_SERVICE_ENABLED;
  process.env.NODE_ENV = "production";
  process.env.VITE_MEMBER_AI_SELF_SERVICE_ENABLED = "true";
  try {
    assert.equal(isMemberAiSelfServiceEnabled(), false);
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
    if (previousFlag === undefined) delete process.env.VITE_MEMBER_AI_SELF_SERVICE_ENABLED;
    else process.env.VITE_MEMBER_AI_SELF_SERVICE_ENABLED = previousFlag;
  }
});

test("delegated routes require the explicit development opt-in", () => {
  const previousMode = process.env.NODE_ENV;
  const previousFlag = process.env.VITE_MEMBER_AI_SELF_SERVICE_ENABLED;
  process.env.NODE_ENV = "development";
  delete process.env.VITE_MEMBER_AI_SELF_SERVICE_ENABLED;
  try {
    assert.equal(isMemberAiSelfServiceEnabled(), false);
    process.env.VITE_MEMBER_AI_SELF_SERVICE_ENABLED = "true";
    assert.equal(isMemberAiSelfServiceEnabled(), true);
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
    if (previousFlag === undefined) delete process.env.VITE_MEMBER_AI_SELF_SERVICE_ENABLED;
    else process.env.VITE_MEMBER_AI_SELF_SERVICE_ENABLED = previousFlag;
  }
});