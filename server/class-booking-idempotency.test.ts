import assert from "node:assert/strict";
import { test } from "node:test";
import { reservationReplayMatches } from "./class-booking-idempotency";

const publicRequest = {
  occurrenceId: "occurrence-a",
  firstName: "Taylor",
  lastName: "Member",
  email: "taylor@example.test",
  phone: "+1 (805) 555-0199",
};

test("public reservation idempotency replays only for the same visitor identity", () => {
  assert.equal(reservationReplayMatches(publicRequest, {
    ...publicRequest,
    firstName: "  TAYLOR ",
    lastName: "Member",
    email: "TAYLOR@EXAMPLE.TEST",
    phone: "8055550199",
  }), true);

  for (const change of [
    { email: "attacker@example.test" },
    { firstName: "Different" },
    { lastName: "Person" },
    { phone: "8055550000" },
  ]) {
    assert.equal(reservationReplayMatches(publicRequest, { ...publicRequest, ...change }), false);
  }
});

test("member idempotency binds occurrence, account, and dependent identity", () => {
  const existing = {
    ...publicRequest,
    userId: "member-a",
    minorProfileId: "minor-a",
  };
  assert.equal(reservationReplayMatches(existing, {
    ...existing,
    email: "updated@example.test",
    phone: "8055550100",
  }), true);
  assert.equal(reservationReplayMatches(existing, { ...existing, userId: "member-b" }), false);
  assert.equal(reservationReplayMatches(existing, { ...existing, minorProfileId: "minor-b" }), false);
  assert.equal(reservationReplayMatches(existing, { ...existing, occurrenceId: "occurrence-b" }), false);
});
