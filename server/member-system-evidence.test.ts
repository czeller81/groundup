import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "./db";
import { storage } from "./storage";
import { evaluateBookingEligibility } from "./member-entitlements";
import { issueDiscoveryPass } from "./member-routes";
import {
  calendarConnections,
  classOccurrences,
  classReservationEvents,
  classReservations,
  classTypes,
  discoveryEntitlements,
  discoveryPasses,
  entitlementLedger,
  forms,
  formResponses,
  memberAuditEvents,
  memberLifecycleEvents,
  memberLifecycles,
  membershipPlans,
  memberships,
  minorProfiles,
  users,
} from "@shared/schema";

test("member system evidence: Discovery to membership with weekly limits, waitlist, attendance, and correction audit", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "fixture evidence must never run in production");
  const suffix = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const emails = [`member-a-${suffix}@example.invalid`, `member-b-${suffix}@example.invalid`, `exception-${suffix}@example.invalid`];
  const userIds: string[] = [];
  const occurrenceIds: string[] = [];
  const passIds: string[] = [];
  let planId = "";
  let classTypeSkillId = "";
  let classTypeStrengthId = "";
  let classTypeGirlsId = "";
  const [connection] = await db.select().from(calendarConnections).limit(1);
  assert.ok(connection, "a Calendar connection is required for fixture occurrences");

  try {
    const member = await storage.createUser(emails[0], "GroundUp-QA-Password-2026", "Member", "A", "5550000101", "en");
    const discoveryMember = await storage.createUser(emails[1], "GroundUp-QA-Password-2026", "Discovery", "B", "5550000102", "en");
    const exceptionMember = await storage.createUser(emails[2], "GroundUp-QA-Password-2026", "Exception", "C", "5550000103", "en");
    userIds.push(member.id, discoveryMember.id, exceptionMember.id);
    const bookingForms = await db.select({ id: forms.id, slug: forms.slug })
      .from(forms)
      .where(eq(forms.requiredBeforeBooking, true));
    assert.deepEqual(new Set(bookingForms.map((form) => form.slug)), new Set(["liability-waiver", "gym-rules"]));

    const [plan] = await db.insert(membershipPlans).values({
      internalKey: `qa-plan-${suffix}`,
      displayName: "QA 2x weekly",
      weeklySessionLimit: 2,
      eligibleClassCategories: ["skill", "strength"],
      bookingWindowHours: 8760,
      weekStartDay: 1,
      timezone: "America/Los_Angeles",
      waitlistAllowed: true,
    }).returning();
    planId = plan.id;
    const memberMembership = await storage.createMembership({
      userId: member.id,
      planId,
      type: plan.internalKey,
      status: "active",
      priceCents: 0,
      source: "fixture_evidence",
    });

    const skillType = await storage.createClassType({
      name: `QA Skill ${suffix}`,
      description: "Fixture",
      category: "skill",
      matchPattern: "skill",
      defaultCapacity: 1,
      beginnerFriendly: true,
      firstVisitEligible: true,
      defaultTrainerId: null,
      membershipRequired: false,
      active: true,
      bookingEnabled: true,
    });
    const strengthType = await storage.createClassType({
      name: `QA Strength ${suffix}`,
      description: "Fixture",
      category: "strength",
      matchPattern: "strength",
      defaultCapacity: 4,
      beginnerFriendly: true,
      firstVisitEligible: true,
      defaultTrainerId: null,
      membershipRequired: false,
      active: true,
      bookingEnabled: true,
    });
    const girlsType = await storage.createClassType({
      name: `QA Girls ${suffix}`,
      description: "Fixture",
      category: "girls_skill",
      canonicalCategory: "GIRLS_JIU_JITSU_SELF_DEFENSE",
      strengthFocus: null,
      audienceGroup: "FEMALE_YOUTH",
      matchPattern: "girls",
      defaultCapacity: 4,
      beginnerFriendly: true,
      firstVisitEligible: false,
      defaultTrainerId: null,
      membershipRequired: true,
      active: true,
      bookingEnabled: true,
    });
    classTypeSkillId = skillType.id;
    classTypeStrengthId = strengthType.id;
    classTypeGirlsId = girlsType.id;

    // Anchor the fixture to the next Monday so day 0, 1, 2, and 3 all share
    // the configured membership week regardless of the day the suite runs.
    const base = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
    base.setUTCHours(20, 0, 0, 0);
    base.setUTCDate(base.getUTCDate() + (1 - base.getUTCDay() + 7) % 7);
    const makeOccurrence = async (typeId: string, offsetDays: number, title: string, capacity: number) => {
      const start = new Date(base.getTime() + offsetDays * 24 * 60 * 60 * 1000);
      const canonicalCategory = typeId === classTypeSkillId
        ? "JIU_JITSU_SELF_DEFENSE"
        : typeId === classTypeStrengthId
        ? "STRENGTH_CONDITIONING"
        : "GIRLS_JIU_JITSU_SELF_DEFENSE";
      const [occurrence] = await db.insert(classOccurrences).values({
        calendarConnectionId: connection.id,
        googleCalendarId: `qa-calendar-${suffix}`,
        googleEventId: `qa-event-${suffix}-${offsetDays}`,
        title,
        description: "Ground Up fixture evidence",
        start,
        end: new Date(start.getTime() + 60 * 60 * 1000),
        location: "Ground Up fixture",
        instructorName: "Fixture Coach",
        classTypeId: typeId,
        canonicalCategory,
        audienceGroup: typeId === classTypeGirlsId ? "FEMALE_YOUTH" : "ADULT_WOMEN",
        status: "active",
        syncState: "synced",
        capacity,
        firstVisitEligible: true,
        bookingEnabled: true,
        audience: "members",
        remoteUpdatedAt: new Date(),
        lastSyncedAt: new Date(),
      }).returning();
      occurrenceIds.push(occurrence.id);
      return occurrence;
    };
    const skill = await makeOccurrence(classTypeSkillId, 0, "QA Skill Class", 1);
    const strength = await makeOccurrence(classTypeStrengthId, 1, "QA Strength Class", 4);
    const extra = await makeOccurrence(classTypeSkillId, 2, "QA Extra Skill Class", 4);
    const limitCheck = await makeOccurrence(classTypeSkillId, 3, "QA Limit Check Class", 4);
    const outsideMemberWindow = await makeOccurrence(classTypeSkillId, 8, "QA Future Skill Class", 4);
    const discoveryReplacement = await makeOccurrence(classTypeSkillId, 9, "QA Discovery Replacement", 4);
    const minorOriginalOccurrence = await makeOccurrence(classTypeGirlsId, 4, "QA Girls Original", 4);
    const minorReplacementOccurrence = await makeOccurrence(classTypeGirlsId, 5, "QA Girls Replacement", 4);

    await db.insert(formResponses).values(bookingForms.map((form) => ({
      userId: discoveryMember.id,
      formId: form.id,
      answers: {},
      status: "submitted",
      submittedAt: new Date(),
    })));
    const prospectWithoutEntitlement = await evaluateBookingEligibility(discoveryMember, skill);
    assert.equal(
      prospectWithoutEntitlement.code,
      "MEMBERSHIP_INACTIVE",
      "a prospect without a Discovery Pass or active membership must not reserve a member class",
    );
    await db.delete(formResponses).where(eq(formResponses.userId, discoveryMember.id));

    const now = new Date();
    const [pass] = await db.insert(discoveryPasses).values({
      userId: discoveryMember.id,
      claimTimestamp: now,
      activationTimestamp: now,
      expirationTimestamp: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: "CLAIMED",
      duplicateCheck: { result: "CLEAR" },
      createdBy: discoveryMember.id,
    }).returning();
    passIds.push(pass.id);
    await db.insert(discoveryEntitlements).values([
      { discoveryPassId: pass.id, category: "SKILL", status: "AVAILABLE" },
      { discoveryPassId: pass.id, category: "STRENGTH", status: "AVAILABLE" },
    ]);

    await assert.rejects(
      () => storage.reserveClassOccurrence({
        occurrenceId: skill.id, userId: discoveryMember.id, firstName: "Discovery", lastName: "B", email: emails[1], phone: "5550000102",
      }),
      (error: any) => error.code === "REQUIRED_FORM_INCOMPLETE",
    );
    await db.insert(formResponses).values(bookingForms.flatMap((form) => [
      {
        userId: member.id,
        formId: form.id,
        answers: {},
        status: "submitted",
        submittedAt: new Date(),
      },
      {
        userId: discoveryMember.id,
        formId: form.id,
        answers: {},
        status: "submitted",
        submittedAt: new Date(),
      },
    ]));

    await assert.rejects(
      () => storage.reserveClassOccurrence({
        occurrenceId: outsideMemberWindow.id,
        userId: member.id,
        firstName: "Member",
        lastName: "A",
        email: emails[0],
        phone: "5550000101",
      }),
      (error: any) => error.code === "BOOKING_WINDOW_CLOSED",
      "authenticated members cannot bypass the seven-day window with a direct reservation request",
    );

    const memberSkill = await storage.reserveClassOccurrence({
      occurrenceId: skill.id, userId: member.id, firstName: "Member", lastName: "A", email: emails[0], phone: "5550000101",
    });
    const discoveryWaitlist = await storage.reserveClassOccurrence({
      occurrenceId: skill.id, userId: discoveryMember.id, firstName: "Discovery", lastName: "B", email: emails[1], phone: "5550000102",
    });
    assert.equal(memberSkill.reservation.status, "confirmed");
    assert.equal(discoveryWaitlist.reservation.status, "waitlisted");
    const initialRoster = await storage.getOccurrenceReservations(skill.id);
    assert.deepEqual(initialRoster.confirmed.map((reservation) => reservation.id), [memberSkill.reservation.id]);
    assert.deepEqual(initialRoster.waitlisted.map((reservation) => reservation.id), [discoveryWaitlist.reservation.id]);
    const adminProfile = await storage.getUserProfile(member.id);
    assert.equal(adminProfile?.classReservations.length, 1, "admin member profiles must include current class reservations");
    assert.equal(adminProfile?.classReservations[0].occurrence.id, skill.id);
    assert.equal(adminProfile?.classReservations[0].status, "confirmed");
    const otherAdminProfile = await storage.getUserProfile(discoveryMember.id);
    assert.deepEqual(
      otherAdminProfile?.classReservations.map((reservation) => reservation.id),
      [discoveryWaitlist.reservation.id],
      "admin member profiles must not leak another member's reservations",
    );
    const [availableSkill] = await db.select().from(discoveryEntitlements).where(and(
      eq(discoveryEntitlements.discoveryPassId, pass.id),
      eq(discoveryEntitlements.category, "SKILL"),
    ));
    assert.equal(availableSkill.status, "AVAILABLE", "waitlisted Discovery reservations must not consume entitlements");

    const promoted = await storage.cancelClassReservation({
      reservationId: memberSkill.reservation.id,
      userId: member.id,
      reason: "Fixture cancellation releases the seat",
    });
    assert.equal(promoted.promoted?.id, discoveryWaitlist.reservation.id);
    const [bookedSkill] = await db.select().from(discoveryEntitlements).where(eq(discoveryEntitlements.id, availableSkill.id));
    assert.equal(bookedSkill.status, "BOOKED", "promotion should reserve the Discovery entitlement");

    const memberStrength = await storage.reserveClassOccurrence({
      occurrenceId: strength.id, userId: member.id, firstName: "Member", lastName: "A", email: emails[0], phone: "5550000101",
    });
    const memberExtra = await storage.reserveClassOccurrence({
      occurrenceId: extra.id, userId: member.id, firstName: "Member", lastName: "A", email: emails[0], phone: "5550000101",
    });
    await storage.updateClassReservation(memberStrength.reservation.id, { attendance: "PRESENT" }, member.id, "Fixture attendance");
    await storage.updateClassReservation(promoted.promoted!.id, { attendance: "PRESENT" }, member.id, "Fixture Discovery attendance");

    const weeklyLimit = await evaluateBookingEligibility(member, limitCheck);
    assert.equal(weeklyLimit.code, "WEEKLY_LIMIT_REACHED", "2x membership must stop a third weekly booking");
    const cancelledForSchedule = await storage.cancelOccurrenceReservations(extra.id, "Google Calendar removed the original class");
    assert.equal(cancelledForSchedule.some((reservation) => reservation.id === memberExtra.reservation.id), true);
    const movedMembership = await storage.moveClassReservation({
      reservationId: memberExtra.reservation.id,
      replacementOccurrenceId: limitCheck.id,
      actorId: member.id,
      reason: "Move the calendar-cancelled membership reservation.",
    });
    assert.equal(movedMembership.reservation.status, "confirmed");
    const membershipUsage = await db.select().from(entitlementLedger).where(and(
      eq(entitlementLedger.userId, member.id),
      eq(entitlementLedger.membershipId, memberMembership.id),
      inArray(entitlementLedger.reservationId, [memberExtra.reservation.id, movedMembership.reservation.id]),
    ));
    assert.equal(
      membershipUsage.reduce((total, entry) => total + entry.reserved - entry.released, 0),
      1,
      "moving an occurrence-cancelled reservation must transfer rather than duplicate membership usage",
    );
    await db.update(discoveryPasses)
      .set({ expirationTimestamp: new Date(Date.now() - 60 * 1000) })
      .where(eq(discoveryPasses.id, pass.id));
    const expiredDiscovery = await evaluateBookingEligibility(discoveryMember, limitCheck);
    assert.equal(expiredDiscovery.code, "DISCOVERY_EXPIRED", "expired Discovery Passes must stop new bookings");

    const movedDiscovery = await storage.cancelClassReservation({
      reservationId: promoted.promoted!.id,
      userId: discoveryMember.id,
      reason: "Original occurrence was cancelled",
    });
    assert.equal(movedDiscovery.reservation.status, "cancelled");
    const moveReason = "Move the cancelled reservation to the matching replacement class.";
    const moved = await storage.moveClassReservation({
      reservationId: movedDiscovery.reservation.id,
      replacementOccurrenceId: discoveryReplacement.id,
      actorId: member.id,
      reason: moveReason,
    });
    assert.equal(moved.reservation.status, "confirmed");
    assert.equal(moved.discoveryExceptionApplied, true);
    const [movedPass] = await db.select().from(discoveryPasses).where(eq(discoveryPasses.id, pass.id));
    assert.equal(movedPass.expirationTimestamp.getTime(), discoveryReplacement.end.getTime(), "the exception must end with the replacement class");
    const [movedEntitlement] = await db.select().from(discoveryEntitlements).where(and(
      eq(discoveryEntitlements.discoveryPassId, pass.id),
      eq(discoveryEntitlements.category, "SKILL"),
    ));
    assert.equal(movedEntitlement.reservationId, moved.reservation.id);
    assert.equal(movedEntitlement.status, "BOOKED");
    const moveAudit = await db.select().from(memberAuditEvents).where(and(
      eq(memberAuditEvents.userId, discoveryMember.id),
      eq(memberAuditEvents.targetId, moved.reservation.id),
    ));
    assert.ok(moveAudit.some((event) => event.action === "class_reservation_moved" && event.actorId === member.id && event.reason === moveReason));
    await assert.rejects(
      () => storage.moveClassReservation({
        reservationId: movedDiscovery.reservation.id,
        replacementOccurrenceId: extra.id,
        actorId: member.id,
        reason: "A repeated move must not create another reservation.",
      }),
      (error: any) => error.code === "RESERVATION_ALREADY_MOVED",
    );
    const movedFromEvents = await db.select().from(classReservationEvents).where(and(
      eq(classReservationEvents.reservationId, movedDiscovery.reservation.id),
      eq(classReservationEvents.event, "reservation_moved_from"),
    ));
    assert.equal(movedFromEvents.length, 1);

    const corrected = await storage.updateClassReservation(memberStrength.reservation.id, { attendance: "NO_SHOW" }, member.id, "Coach corrected mistaken present mark");
    assert.equal(corrected?.attendance, "NO_SHOW");
    const audit = await db.select().from(memberAuditEvents).where(and(
      eq(memberAuditEvents.userId, member.id),
      eq(memberAuditEvents.targetType, "class_reservation"),
      eq(memberAuditEvents.targetId, memberStrength.reservation.id),
    ));
    assert.ok(audit.some((event) => event.reason === "Coach corrected mistaken present mark"));

    const [minor] = await db.insert(minorProfiles).values({
      guardianUserId: member.id,
      firstName: "Minor",
      lastName: "Participant",
      dateOfBirth: new Date("2014-01-01T00:00:00Z"),
      emergencyContactName: "Member A",
      emergencyContactPhone: "5550000101",
      emergencyContactRelationship: "Guardian",
      consentSignature: "Member A",
      consentedAt: new Date(),
    }).returning();
    const [minorReservation] = await db.insert(classReservations).values({
      occurrenceId: minorOriginalOccurrence.id,
      userId: member.id,
      minorProfileId: minor.id,
      visitorFirstName: "Member",
      visitorLastName: "A",
      visitorEmail: emails[0],
      visitorPhone: "5550000101",
      status: "cancelled",
      cancelledAt: new Date(),
    }).returning();
    const minorRoster = await storage.getOccurrenceReservations(minorOriginalOccurrence.id);
    assert.equal(minorRoster.cancelled[0].minorProfile?.firstName, "Minor");
    const movedMinor = await storage.moveClassReservation({
      reservationId: minorReservation.id,
      replacementOccurrenceId: minorReplacementOccurrence.id,
      actorId: member.id,
      reason: "Move the minor to the matching girls class.",
    });
    assert.equal(movedMinor.reservation.minorProfileId, minor.id);
    assert.equal(movedMinor.reservation.status, "confirmed");
    const movedMinorRoster = await storage.getOccurrenceReservations(minorReplacementOccurrence.id);
    assert.equal(movedMinorRoster.confirmed[0].minorProfile?.firstName, "Minor");
    assert.equal(movedMinorRoster.confirmed[0].minorProfile?.lastName, "Participant");

    const [exceptionReservation] = await db.insert(classReservations).values({
      occurrenceId: limitCheck.id,
      userId: exceptionMember.id,
      visitorFirstName: "Exception",
      visitorLastName: "C",
      visitorEmail: emails[2],
      visitorPhone: "5550000103",
      status: "waitlisted",
      waitlistPosition: 1,
    }).returning();
    const exceptionPass = await issueDiscoveryPass(
      exceptionMember.id,
      member.id,
      "Honor the confirmed class after the prospect booking eligibility defect.",
      true,
      exceptionReservation.id,
    );
    passIds.push(exceptionPass.id);
    assert.equal(exceptionPass.status, "PARTIALLY_BOOKED");
    assert.ok(exceptionPass.expirationTimestamp.getTime() >= limitCheck.end.getTime());
    const exceptionEntitlements = await db.select().from(discoveryEntitlements)
      .where(eq(discoveryEntitlements.discoveryPassId, exceptionPass.id));
    assert.deepEqual(
      exceptionEntitlements.map((entitlement) => [entitlement.category, entitlement.status, entitlement.reservationId]).sort(),
      [["SKILL", "BOOKED", exceptionReservation.id], ["STRENGTH", "AVAILABLE", null]],
    );
    const exceptionAudit = await db.select().from(memberAuditEvents).where(and(
      eq(memberAuditEvents.userId, exceptionMember.id),
      eq(memberAuditEvents.targetId, exceptionPass.id),
    ));
    assert.ok(exceptionAudit.some((event) => event.action === "discovery_pass_reservation_exception_recorded"));
    await storage.cancelClassReservation({
      reservationId: exceptionReservation.id,
      userId: exceptionMember.id,
      reason: "Fixture verifies waitlist exception release",
    });
    const releasedExceptionEntitlements = await db.select().from(discoveryEntitlements)
      .where(eq(discoveryEntitlements.discoveryPassId, exceptionPass.id));
    assert.deepEqual(
      releasedExceptionEntitlements.map((entitlement) => [entitlement.category, entitlement.status, entitlement.reservationId]).sort(),
      [["SKILL", "AVAILABLE", null], ["STRENGTH", "AVAILABLE", null]],
    );
    const [releasedExceptionPass] = await db.select().from(discoveryPasses).where(eq(discoveryPasses.id, exceptionPass.id));
    assert.equal(releasedExceptionPass.status, "CLAIMED");

    await db.insert(formResponses).values(bookingForms.map((form) => ({
      userId: exceptionMember.id,
      formId: form.id,
      answers: {},
      status: "submitted",
      submittedAt: new Date(),
    })));
    await storage.createMembership({
      userId: exceptionMember.id,
      planId: null,
      type: "legacy-unconfigured",
      status: "active",
      priceCents: 0,
      source: "fixture_evidence",
    });
    await db.update(discoveryEntitlements).set({
      status: "BOOKED",
      reservationId: exceptionReservation.id,
    })
      .where(and(
        eq(discoveryEntitlements.discoveryPassId, exceptionPass.id),
        eq(discoveryEntitlements.category, "SKILL"),
      ));
    const legacyMemberWithUsedPass = await evaluateBookingEligibility(exceptionMember, extra);
    assert.equal(
      legacyMemberWithUsedPass.code,
      "ELIGIBLE",
      "an active legacy member must not be blocked by a used Discovery entitlement",
    );

    await db.update(discoveryPasses).set({ status: "CANCELLED" }).where(eq(discoveryPasses.id, exceptionPass.id));
    await db.update(classReservations).set({
      status: "waitlisted",
      waitlistPosition: 1,
      cancelledAt: null,
    }).where(eq(classReservations.id, exceptionReservation.id));
    await storage.cancelClassReservation({
      reservationId: exceptionReservation.id,
      userId: exceptionMember.id,
      reason: "Fixture verifies revoked pass remains revoked",
    });
    const [revokedPassAfterCancellation] = await db.select().from(discoveryPasses)
      .where(eq(discoveryPasses.id, exceptionPass.id));
    const [revokedEntitlementAfterCancellation] = await db.select().from(discoveryEntitlements)
      .where(and(
        eq(discoveryEntitlements.discoveryPassId, exceptionPass.id),
        eq(discoveryEntitlements.category, "SKILL"),
      ));
    assert.equal(revokedPassAfterCancellation.status, "CANCELLED");
    assert.equal(revokedEntitlementAfterCancellation.status, "BOOKED");
    assert.equal(revokedEntitlementAfterCancellation.reservationId, exceptionReservation.id);
  } finally {
    if (occurrenceIds.length) await db.delete(entitlementLedger).where(inArray(entitlementLedger.occurrenceId, occurrenceIds));
    if (passIds.length) await db.delete(discoveryEntitlements).where(inArray(discoveryEntitlements.discoveryPassId, passIds));
    if (occurrenceIds.length) await db.delete(classReservationEvents).where(inArray(classReservationEvents.occurrenceId, occurrenceIds));
    if (occurrenceIds.length) await db.delete(classReservations).where(inArray(classReservations.occurrenceId, occurrenceIds));
    if (userIds.length) await db.delete(formResponses).where(inArray(formResponses.userId, userIds));
    if (passIds.length) await db.delete(discoveryPasses).where(inArray(discoveryPasses.id, passIds));
    if (userIds.length) await db.delete(memberAuditEvents).where(inArray(memberAuditEvents.userId, userIds));
    if (userIds.length) await db.delete(memberLifecycleEvents).where(inArray(memberLifecycleEvents.userId, userIds));
    if (userIds.length) await db.delete(memberLifecycles).where(inArray(memberLifecycles.userId, userIds));
    if (userIds.length) await db.delete(memberships).where(inArray(memberships.userId, userIds));
    if (userIds.length) await db.delete(minorProfiles).where(inArray(minorProfiles.guardianUserId, userIds));
    if (planId) await db.delete(membershipPlans).where(eq(membershipPlans.id, planId));
    if (occurrenceIds.length) await db.delete(classOccurrences).where(inArray(classOccurrences.id, occurrenceIds));
    if (classTypeSkillId) await db.delete(classTypes).where(inArray(classTypes.id, [classTypeSkillId, classTypeStrengthId, classTypeGirlsId]));
    if (userIds.length) await db.delete(users).where(inArray(users.id, userIds));
    await pool.end();
  }
});