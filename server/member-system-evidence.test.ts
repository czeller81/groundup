import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "./db";
import { storage } from "./storage";
import { evaluateBookingEligibility } from "./member-entitlements";
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
  const emails = [`member-a-${suffix}@example.invalid`, `member-b-${suffix}@example.invalid`];
  const userIds: string[] = [];
  const occurrenceIds: string[] = [];
  const passIds: string[] = [];
  let planId = "";
  let classTypeSkillId = "";
  let classTypeStrengthId = "";
  const [connection] = await db.select().from(calendarConnections).limit(1);
  assert.ok(connection, "a Calendar connection is required for fixture occurrences");

  try {
    const member = await storage.createUser(emails[0], "GroundUp-QA-Password-2026", "Member", "A", "5550000101", "en");
    const discoveryMember = await storage.createUser(emails[1], "GroundUp-QA-Password-2026", "Discovery", "B", "5550000102", "en");
    userIds.push(member.id, discoveryMember.id);
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
    await storage.createMembership({
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
    classTypeSkillId = skillType.id;
    classTypeStrengthId = strengthType.id;

    const base = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    base.setUTCHours(20, 0, 0, 0);
    const makeOccurrence = async (typeId: string, offsetDays: number, title: string, capacity: number) => {
      const start = new Date(base.getTime() + offsetDays * 24 * 60 * 60 * 1000);
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
    await storage.reserveClassOccurrence({
      occurrenceId: extra.id, userId: member.id, firstName: "Member", lastName: "A", email: emails[0], phone: "5550000101",
    });
    await storage.updateClassReservation(memberStrength.reservation.id, { attendance: "PRESENT" }, member.id, "Fixture attendance");
    await storage.updateClassReservation(promoted.promoted!.id, { attendance: "PRESENT" }, member.id, "Fixture Discovery attendance");

    const weeklyLimit = await evaluateBookingEligibility(member, limitCheck);
    assert.equal(weeklyLimit.code, "WEEKLY_LIMIT_REACHED", "2x membership must stop a third weekly booking");
    await db.update(discoveryPasses)
      .set({ expirationTimestamp: new Date(Date.now() - 60 * 1000) })
      .where(eq(discoveryPasses.id, pass.id));
    const expiredDiscovery = await evaluateBookingEligibility(discoveryMember, limitCheck);
    assert.equal(expiredDiscovery.code, "DISCOVERY_EXPIRED", "expired Discovery Passes must stop new bookings");

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
    await db.insert(classReservations).values({
      occurrenceId: limitCheck.id,
      userId: member.id,
      minorProfileId: minor.id,
      visitorFirstName: "Member",
      visitorLastName: "A",
      visitorEmail: emails[0],
      visitorPhone: "5550000101",
      status: "confirmed",
    });
    const minorRoster = await storage.getOccurrenceReservations(limitCheck.id);
    assert.equal(minorRoster.confirmed[0].minorProfile?.firstName, "Minor");
    assert.equal(minorRoster.confirmed[0].minorProfile?.lastName, "Participant");
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
    if (classTypeSkillId) await db.delete(classTypes).where(inArray(classTypes.id, [classTypeSkillId, classTypeStrengthId]));
    if (userIds.length) await db.delete(users).where(inArray(users.id, userIds));
    await pool.end();
  }
});