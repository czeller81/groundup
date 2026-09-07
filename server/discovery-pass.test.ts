import assert from "node:assert/strict";
import test from "node:test";
import { discoveryReservationCountsAsPriorUse } from "./member-routes";

test("Discovery Pass treats prior interest and cancelled unused reservations as new-user eligible", () => {
  assert.equal(discoveryReservationCountsAsPriorUse("cancelled", null), false);
  assert.equal(discoveryReservationCountsAsPriorUse("cancelled", "NO_SHOW"), true);
  assert.equal(discoveryReservationCountsAsPriorUse("confirmed", null), true);
  assert.equal(discoveryReservationCountsAsPriorUse("waitlisted", null), true);
});