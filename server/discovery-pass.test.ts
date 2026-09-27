import assert from "node:assert/strict";
import test from "node:test";
import { and, eq } from "drizzle-orm";
import { isAllowedClassWeekday } from "@shared/booking-operations";
import { db } from "./db";
import { calendarConnections, classOccurrences, classReservationEvents, classReservations, classTypes, discoveryEntitlements, discoveryPassClaims, discoveryPasses, formResponses, forms, insertAnalyticsEventSchema, memberAuditEvents, memberLifecycleEvents, memberLifecycles, users } from "@shared/schema";
import { storage } from "./storage";
import { discoveryReservationCountsAsPriorUse, issueDiscoveryPass, missingRequiredBookingForms } from "./member-routes";
import { discoveryPassClaimRequestSchema, normalizeDiscoveryPassClaimInput } from "./discovery-pass-b";
import { canRestoreDiscoveryEntitlement, evaluateBookingEligibility } from "./member-entitlements";

test("Discovery Pass treats prior interest and cancelled unused reservations as new-user eligible", () => {
  assert.equal(discoveryReservationCountsAsPriorUse("cancelled", null), false);
  assert.equal(discoveryReservationCountsAsPriorUse("cancelled", "NO_SHOW"), true);
  assert.equal(discoveryReservationCountsAsPriorUse("confirmed", null), true);
  assert.equal(discoveryReservationCountsAsPriorUse("waitlisted", null), true);
});

test("Discovery Pass entitlement restoration requires an active, unconverted pass", () => {
  const at = new Date("2026-09-27T12:00:00Z");
  const pass = {
    convertedAt: null,
    status: "PARTIALLY_BOOKED",
    expirationTimestamp: new Date("2026-09-28T12:00:00Z"),
  };

  assert.equal(canRestoreDiscoveryEntitlement(pass, at), true);
  assert.equal(canRestoreDiscoveryEntitlement({ ...pass, expirationTimestamp: at }, at), false);
  assert.equal(canRestoreDiscoveryEntitlement({ ...pass, convertedAt: at }, at), false);
  assert.equal(canRestoreDiscoveryEntitlement({ ...pass, status: "EXPIRED" }, at), false);
});

test("Discovery funnel event contract preserves consented attribution fields", () => {
  const event = insertAnalyticsEventSchema.parse({
    event: "discovery_required_forms_completed",
    funnel: "training",
    sessionId: "qa-discovery-session",
    path: "/discovery-pass",
    properties: {
      funnel_kind: "discovery_pass",
      locale: "es",
      utm_source: "meta",
      utm_campaign: "discovery-september",
      landing_path: "/discovery-pass",
    },
  });
  assert.equal(event.event, "discovery_required_forms_completed");
  assert.equal(event.properties.funnel_kind, "discovery_pass");
  assert.equal(event.properties.utm_source, "meta");
});

test("Variant B claim validation and duplicate handling stay account-free", async () => {
  assert.equal(discoveryPassClaimRequestSchema.safeParse({ firstName: "A", email: "bad", phone: "not-a-phone", locale: "en", attribution: {} }).success, false);
  assert.notEqual(process.env.NODE_ENV, "production", "fixture claim tests must never run in production");
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `discovery-variant-b-${suffix}@example.invalid`;
  try {
    const input = normalizeDiscoveryPassClaimInput(discoveryPassClaimRequestSchema.parse({
      firstName: "Variant",
      email,
      phone: "555-000-0199",
      locale: "es",
      attribution: { utm_source: "test", fbclid: "click-id" },
    }));
    const first = await storage.createOrGetDiscoveryPassClaim(input);
    const second = await storage.createOrGetDiscoveryPassClaim(input);
    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(first.claim.id, second.claim.id);
    assert.equal(second.claim.continuationState, "claim_submitted");
    assert.equal(await storage.getUserByEmail(email), undefined);
    assert.equal((await db.select().from(discoveryPasses).where(eq(discoveryPasses.userId, first.claim.id))).length, 0);
  } finally {
    await db.delete(discoveryPassClaims).where(eq(discoveryPassClaims.email, email));
  }
});

test("Discovery bookings bypass membership after activation and provider cancellations restore valid credit", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "fixture activation tests must never run in production");
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const user = await storage.createUser(
    `discovery-booking-${suffix}@example.invalid`,
    "GroundUp-QA-Password-2026",
    "Discovery",
    "Booking",
    "5550000399",
    "en",
  );
  let passId: string | undefined;
  let skillTypeId: string | undefined;
  let strengthTypeId: string | undefined;
  const occurrenceIds: string[] = [];
  try {
    const requiredForms = await db.select({ id: forms.id }).from(forms).where(eq(forms.requiredBeforeBooking, true));
    await db.insert(formResponses).values(requiredForms.map((form) => ({
      userId: user.id,
      formId: form.id,
      answers: {},
      status: "submitted",
      submittedAt: new Date(),
    })));
    const [skillType] = await db.insert(classTypes).values({
      name: `Discovery QA Skill ${suffix}`,
      description: "Fixture",
      category: "skill",
      matchPattern: "skill",
      defaultCapacity: 4,
      beginnerFriendly: true,
      firstVisitEligible: true,
      membershipRequired: false,
      active: true,
      bookingEnabled: true,
    }).returning();
    const [strengthType] = await db.insert(classTypes).values({
      name: `Discovery QA Strength ${suffix}`,
      description: "Fixture",
      category: "strength",
      matchPattern: "strength",
      defaultCapacity: 4,
      beginnerFriendly: true,
      firstVisitEligible: true,
      membershipRequired: false,
      active: true,
      bookingEnabled: true,
    }).returning();
    skillTypeId = skillType.id;
    strengthTypeId = strengthType.id;
    const occurrence = (classTypeId: string) => ({
      id: `fixture-${suffix}`,
      start: new Date(Date.now() + 24 * 60 * 60 * 1000),
      end: new Date(Date.now() + 25 * 60 * 60 * 1000),
      status: "active",
      bookingEnabled: true,
      classTypeId,
    } as any);

    assert.equal((await evaluateBookingEligibility(user, occurrence(skillType.id))).code, "MEMBERSHIP_INACTIVE");
    await storage.markDiscoveryOnboarding(user.id);
    assert.equal((await evaluateBookingEligibility(user, occurrence(skillType.id))).code, "DISCOVERY_ACTIVATION_REQUIRED");

    const pass = await issueDiscoveryPass(user.id, user.id);
    passId = pass.id;
    const skillEligibility = await evaluateBookingEligibility(user, occurrence(skillType.id));
    const strengthEligibility = await evaluateBookingEligibility(user, occurrence(strengthType.id));
    assert.equal(skillEligibility.code, "ELIGIBLE");
    assert.equal(skillEligibility.source, "discovery");
    assert.equal(strengthEligibility.code, "ELIGIBLE");
    assert.equal(strengthEligibility.source, "discovery");

    const [connection] = await db.select().from(calendarConnections).limit(1);
    assert.ok(connection, "a calendar connection is required for booking fixtures");
    const makeOccurrence = async (classTypeId: string, label: string, dayOffset: number) => {
      const [created] = await db.insert(classOccurrences).values({
        calendarConnectionId: connection.id,
        googleCalendarId: connection.calendarId || "discovery-qa-calendar",
        googleEventId: `discovery-qa-${suffix}-${label}`,
        title: `Discovery QA ${label}`,
        description: "Fixture",
        start: new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000),
        end: new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        classTypeId,
        canonicalCategory: label === "Skill" ? "JIU_JITSU_SELF_DEFENSE" : "STRENGTH_CONDITIONING",
        capacity: 4,
        firstVisitEligible: true,
        bookingEnabled: true,
        audience: "members",
        remoteUpdatedAt: new Date(),
        lastSyncedAt: new Date(),
      }).returning();
      occurrenceIds.push(created.id);
      return created;
    };
    const allowedDayOffsets: number[] = [];
    for (let dayOffset = 1; dayOffset <= 6 && allowedDayOffsets.length < 2; dayOffset += 1) {
      const candidate = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
      if (isAllowedClassWeekday(candidate)) allowedDayOffsets.push(dayOffset);
    }
    assert.equal(allowedDayOffsets.length, 2, "two allowed class days must fit inside the booking horizon");
    const skillOccurrence = await makeOccurrence(skillType.id, "Skill", allowedDayOffsets[0]);
    const strengthOccurrence = await makeOccurrence(strengthType.id, "Strength", allowedDayOffsets[1]);
    const skillReservation = await storage.reserveClassOccurrence({
      occurrenceId: skillOccurrence.id,
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || "5550000399",
    });
    const strengthReservation = await storage.reserveClassOccurrence({
      occurrenceId: strengthOccurrence.id,
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || "5550000399",
    });
    const bookedEntitlements = await db.select().from(discoveryEntitlements)
      .where(eq(discoveryEntitlements.discoveryPassId, pass.id));
    assert.deepEqual(
      bookedEntitlements.map((entitlement) => [entitlement.category, entitlement.status]).sort(),
      [["SKILL", "BOOKED"], ["STRENGTH", "BOOKED"]],
    );
    const [passBeforeProviderCancellation] = await db.select().from(discoveryPasses).where(eq(discoveryPasses.id, pass.id));

    const cancelledReservations = await storage.cancelOccurrenceReservations(
      skillOccurrence.id,
      "The class was cancelled on the academy calendar.",
    );
    assert.ok(cancelledReservations.some((reservation) => reservation.id === skillReservation.reservation.id));
    const [restoredSkill] = await db.select().from(discoveryEntitlements).where(and(
      eq(discoveryEntitlements.discoveryPassId, pass.id),
      eq(discoveryEntitlements.category, "SKILL"),
    ));
    assert.equal(restoredSkill.status, "AVAILABLE");
    assert.equal(restoredSkill.reservationId, null);
    assert.ok(restoredSkill.cancelledAt);
    const [passAfterFirstCancellation] = await db.select().from(discoveryPasses).where(eq(discoveryPasses.id, pass.id));
    assert.equal(passAfterFirstCancellation.status, passBeforeProviderCancellation.status);

    const cancelledStrengthReservations = await storage.cancelOccurrenceReservations(
      strengthOccurrence.id,
      "The class was cancelled on the academy calendar.",
    );
    assert.ok(cancelledStrengthReservations.some((reservation) => reservation.id === strengthReservation.reservation.id));
    const [restoredStrength] = await db.select().from(discoveryEntitlements).where(and(
      eq(discoveryEntitlements.discoveryPassId, pass.id),
      eq(discoveryEntitlements.category, "STRENGTH"),
    ));
    assert.equal(restoredStrength.status, "AVAILABLE");
    assert.equal(restoredStrength.reservationId, null);
    const [restoredPass] = await db.select().from(discoveryPasses).where(eq(discoveryPasses.id, pass.id));
    assert.equal(restoredPass.status, passBeforeProviderCancellation.status);
  } finally {
    await db.delete(memberAuditEvents).where(eq(memberAuditEvents.userId, user.id));
    await db.delete(memberLifecycleEvents).where(eq(memberLifecycleEvents.userId, user.id));
    await db.delete(memberLifecycles).where(eq(memberLifecycles.userId, user.id));
    await db.delete(formResponses).where(eq(formResponses.userId, user.id));
    if (passId) {
      await db.delete(discoveryEntitlements).where(eq(discoveryEntitlements.discoveryPassId, passId));
      await db.delete(discoveryPasses).where(eq(discoveryPasses.id, passId));
    }
    if (occurrenceIds.length) {
      const reservations = await db.select({ id: classReservations.id })
        .from(classReservations)
        .where(eq(classReservations.userId, user.id));
      if (reservations.length) {
        await db.delete(classReservationEvents).where(eq(classReservationEvents.reservationId, reservations[0].id));
        if (reservations.length > 1) {
          await db.delete(classReservationEvents).where(eq(classReservationEvents.reservationId, reservations[1].id));
        }
      }
      await db.delete(classReservations).where(eq(classReservations.userId, user.id));
    }
    if (occurrenceIds.length) await db.delete(classOccurrences).where(eq(classOccurrences.id, occurrenceIds[0]));
    if (occurrenceIds.length > 1) await db.delete(classOccurrences).where(eq(classOccurrences.id, occurrenceIds[1]));
    if (skillTypeId) await db.delete(classTypes).where(eq(classTypes.id, skillTypeId));
    if (strengthTypeId) await db.delete(classTypes).where(eq(classTypes.id, strengthTypeId));
    await db.delete(users).where(eq(users.id, user.id));
  }
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

test("Discovery Pass allows a shared phone when the other account has no prior use", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "fixture activation tests must never run in production");
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const phone = `555${String(Date.now()).slice(-7)}`;
  const existingUser = await storage.createUser(
    `discovery-shared-existing-${suffix}@example.invalid`,
    "GroundUp-QA-Password-2026",
    "Existing",
    "Account",
    phone,
    "en",
  );
  const newUser = await storage.createUser(
    `discovery-shared-new-${suffix}@example.invalid`,
    "GroundUp-QA-Password-2026",
    "New",
    "Account",
    phone,
    "en",
  );
  let passId: string | undefined;
  try {
    const requiredForms = await db.select({ id: forms.id }).from(forms).where(eq(forms.requiredBeforeBooking, true));
    await db.insert(formResponses).values(requiredForms.map((form) => ({
      userId: newUser.id,
      formId: form.id,
      answers: {},
      status: "submitted",
      submittedAt: new Date(),
    })));

    const pass = await issueDiscoveryPass(newUser.id, newUser.id);
    passId = pass.id;
    assert.equal(pass.userId, newUser.id);
  } finally {
    await db.delete(memberAuditEvents).where(eq(memberAuditEvents.userId, newUser.id));
    await db.delete(formResponses).where(eq(formResponses.userId, newUser.id));
    if (passId) {
      await db.delete(discoveryEntitlements).where(eq(discoveryEntitlements.discoveryPassId, passId));
      await db.delete(discoveryPasses).where(eq(discoveryPasses.id, passId));
    }
    await db.delete(users).where(eq(users.id, existingUser.id));
    await db.delete(users).where(eq(users.id, newUser.id));
  }
});