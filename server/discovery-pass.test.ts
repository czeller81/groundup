import assert from "node:assert/strict";
import test from "node:test";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { discoveryEntitlements, discoveryPasses, formResponses, forms, memberAuditEvents, users } from "@shared/schema";
import { storage } from "./storage";
import { discoveryReservationCountsAsPriorUse, issueDiscoveryPass, missingRequiredBookingForms } from "./member-routes";

test("Discovery Pass treats prior interest and cancelled unused reservations as new-user eligible", () => {
  assert.equal(discoveryReservationCountsAsPriorUse("cancelled", null), false);
  assert.equal(discoveryReservationCountsAsPriorUse("cancelled", "NO_SHOW"), true);
  assert.equal(discoveryReservationCountsAsPriorUse("confirmed", null), true);
  assert.equal(discoveryReservationCountsAsPriorUse("waitlisted", null), true);
});

test("Discovery Pass activation is waiver-gated, exact, seven days, and duplicate-safe", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "fixture activation tests must never run in production");
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const user = await storage.createUser(
    `discovery-claim-${suffix}@example.invalid`,
    "GroundUp-QA-Password-2026",
    "Discovery",
    "Claim",
    "5550000301",
    "en",
  );
  let passId: string | undefined;
  try {
    const requiredForms = await db.select({ id: forms.id }).from(forms).where(eq(forms.requiredBeforeBooking, true));
    assert.ok(requiredForms.length > 0, "seeded required booking forms are needed for the claim test");
    assert.deepEqual(await missingRequiredBookingForms(user.id), requiredForms.map((form) => form.id));

    await assert.rejects(
      () => issueDiscoveryPass(user.id, user.id),
      (error: any) => error.code === "DISCOVERY_FORMS_INCOMPLETE",
    );
    assert.equal((await db.select().from(discoveryPasses).where(eq(discoveryPasses.userId, user.id))).length, 0);

    await db.insert(formResponses).values(requiredForms.map((form) => ({
      userId: user.id,
      formId: form.id,
      answers: {},
      status: "submitted",
      submittedAt: new Date(),
    })));

    const pass = await issueDiscoveryPass(user.id, user.id);
    passId = pass.id;
    assert.equal(pass.status, "CLAIMED");
    assert.equal(pass.activationTimestamp?.getTime(), pass.claimTimestamp.getTime());
    assert.equal(
      pass.expirationTimestamp.getTime() - pass.activationTimestamp!.getTime(),
      7 * 24 * 60 * 60 * 1000,
    );

    const entitlements = await db.select().from(discoveryEntitlements)
      .where(eq(discoveryEntitlements.discoveryPassId, pass.id));
    assert.deepEqual(
      entitlements.map((entitlement) => [entitlement.category, entitlement.status]).sort(),
      [["SKILL", "AVAILABLE"], ["STRENGTH", "AVAILABLE"]],
    );

    await assert.rejects(
      () => issueDiscoveryPass(user.id, user.id),
      (error: any) => error.code === "DISCOVERY_ALREADY_USED",
    );
    assert.equal((await db.select().from(discoveryPasses).where(eq(discoveryPasses.userId, user.id))).length, 1);
  } finally {
    await db.delete(memberAuditEvents).where(eq(memberAuditEvents.userId, user.id));
    await db.delete(formResponses).where(eq(formResponses.userId, user.id));
    if (passId) {
      await db.delete(discoveryEntitlements).where(eq(discoveryEntitlements.discoveryPassId, passId));
      await db.delete(discoveryPasses).where(eq(discoveryPasses.id, passId));
    }
    await db.delete(users).where(eq(users.id, user.id));
  }
});