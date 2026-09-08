import assert from "node:assert/strict";
import test from "node:test";
import { GROUND_UP_ADDRESS, PORTAL_COPY } from "./locale";

test("portal confirmation copy includes the academy address in English and Spanish", () => {
  assert.match(PORTAL_COPY.en.spotConfirmed, new RegExp(GROUND_UP_ADDRESS));
  assert.match(PORTAL_COPY.es.spotConfirmed, new RegExp(GROUND_UP_ADDRESS));
});

test("portal waitlist and cancellation copy does not include the academy address", () => {
  for (const locale of ["en", "es"] as const) {
    assert.doesNotMatch(PORTAL_COPY[locale].waitlistAdded, new RegExp(GROUND_UP_ADDRESS));
    assert.doesNotMatch(PORTAL_COPY[locale].reservationCancelled, new RegExp(GROUND_UP_ADDRESS));
  }
});