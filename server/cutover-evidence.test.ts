import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "./db";
import { storage, ClassBookingError } from "./storage";
import { calendarConnections, classOccurrences, classReservationEvents, classReservations, passwordResetTokens, users } from "@shared/schema";
import { syncGoogleClassSchedule } from "./class-booking-sync";
import { classLifecycleEmailContent, passwordResetEmailContent } from "./email";
import { classDateLabel } from "../client/src/lib/class-booking";

const BASE_URL = process.env.CUTOVER_EVIDENCE_BASE_URL || "http://127.0.0.1:5000";

async function api(path: string, init: RequestInit = {}, cookie?: string) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const text = await response.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch { body = text; }
  return {
    status: response.status,
    body,
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}

async function login(email: string, password: string) {
  const response = await api("/api/portal/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.ok(response.cookie);
  return response.cookie!;
}

function fixtureEvent(id: string, summary: string, start: Date, end: Date, recurringEventId?: string) {
  return {
    id,
    status: "confirmed",
    summary,
    description: "Ground Up QA Fixture",
    location: "Ground Up Studio",
    start: { dateTime: start.toISOString(), timeZone: "America/Los_Angeles" },
    end: { dateTime: end.toISOString(), timeZone: "America/Los_Angeles" },
    updated: new Date().toISOString(),
    recurringEventId,
    originalStartTime: recurringEventId
      ? { dateTime: start.toISOString(), timeZone: "America/Los_Angeles" }
      : undefined,
  };
}

test("cutover evidence: Calendar boundary through booking lifecycle and recovery", async (t) => {
  assert.notEqual(process.env.NODE_ENV, "production", "evidence fixtures must never run in production");

  const suffix = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const emails = {
    a: `ground-up-qa-a-${suffix}@example.invalid`,
    b: `ground-up-qa-b-${suffix}@example.invalid`,
    c: `ground-up-qa-c-${suffix}@example.invalid`,
  };
  const password = "GroundUp-QA-Password-2026";
  const createdUserIds: string[] = [];
  const occurrenceIds: string[] = [];
  const reservationIds: string[] = [];
  const previousConnection = await storage.getCalendarConnection();
  let fixtureConnectionId: string | undefined;

  try {
    const [memberA, memberB, memberC] = await Promise.all([
      storage.createUser(emails.a, password, "English", "Member A", "5550000001", "en"),
      storage.createUser(emails.b, password, "English", "Member B", "5550000002", "en"),
      storage.createUser(emails.c, password, "Spanish", "Member C", "5550000003", "es"),
    ]);
    createdUserIds.push(memberA.id, memberB.id, memberC.id);

    const fixtureCalendarId = `ground-up-qa-calendar-${suffix}`;
    const connection = await storage.saveCalendarConnection({
      provider: "google",
      calendarId: fixtureCalendarId,
      calendarName: "Ground Up QA Calendar",
      timezone: "America/Los_Angeles",
      status: "configured",
      lastError: null,
      syncToken: null,
    });
    fixtureConnectionId = connection.id;

    const base = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const starts = [0, 1, 2].map((offset) => new Date(base.getTime() + offset * 24 * 60 * 60 * 1000));
    const ends = starts.map((start) => new Date(start.getTime() + 90 * 60 * 1000));
    const eventIds = {
      a: `ground-up-qa-class-a-${suffix}`,
      b: `ground-up-qa-class-b-${suffix}`,
      c: `ground-up-qa-class-c-${suffix}`,
    };
    const events = [
      fixtureEvent(eventIds.a, "Women's Jiu-Jitsu [QA Fixture A]", starts[0], ends[0]),
      fixtureEvent(eventIds.b, "Women's Jiu-Jitsu [QA Fixture B]", starts[1], ends[1], `ground-up-qa-recurring-${suffix}`),
      fixtureEvent(eventIds.c, "Women's Jiu-Jitsu [QA Fixture C]", starts[2], ends[2]),
    ];

    const firstSync = await syncGoogleClassSchedule(new Date(), { events, nextSyncToken: `qa-sync-1-${suffix}` });
    assert.equal(firstSync.received, 3);
    assert.equal(firstSync.synced, 3);

    const [classA, classB, classC] = await Promise.all([
      storage.getClassOccurrenceByGoogleEvent(fixtureCalendarId, eventIds.a),
      storage.getClassOccurrenceByGoogleEvent(fixtureCalendarId, eventIds.b),
      storage.getClassOccurrenceByGoogleEvent(fixtureCalendarId, eventIds.c),
    ]);
    assert.ok(classA && classB && classC);
    occurrenceIds.push(classA.id, classB.id, classC.id);
    assert.equal(classB.googleRecurringEventId, `ground-up-qa-recurring-${suffix}`);
    assert.equal(classA.googleEventId, eventIds.a);
    assert.equal(classA.status, "active");
    assert.equal(classA.bookingEnabled, true);

    await Promise.all([
      storage.updateClassOccurrence(classA.id, { capacity: 2 }),
      storage.updateClassOccurrence(classB.id, { capacity: 1 }),
      storage.updateClassOccurrence(classC.id, { capacity: 1 }),
    ]);

    const from = new Date(Date.now() - 60_000);
    const to = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const publicBefore = await api(`/api/classes?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`);
    assert.equal(publicBefore.status, 200);
    assert.equal(publicBefore.body.source, "google_calendar");
    const publicA = publicBefore.body.occurrences.find((item: any) => item.id === classA.id);
    assert.ok(publicA);
    assert.equal(publicA.capacity, 2);
    assert.equal(publicA.spotsRemaining, 2);
    assert.match(classDateLabel(publicA.start, "en"), /[A-Z][a-z]{2}/);
    assert.notEqual(classDateLabel(publicA.start, "en"), classDateLabel(publicA.start, "es"));

    const memberACookie = await login(emails.a, password);
    const authenticatedSchedule = await api(`/api/portal/classes?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`, {}, memberACookie);
    assert.equal(authenticatedSchedule.status, 200);
    assert.ok(authenticatedSchedule.body.some((item: any) => item.id === classA.id));

    const reservationA = await storage.reserveClassOccurrence({
      occurrenceId: classA.id,
      userId: memberA.id,
      firstName: memberA.firstName,
      lastName: memberA.lastName,
      email: memberA.email,
      phone: memberA.phone || "",
      locale: "en",
    });
    reservationIds.push(reservationA.reservation.id);
    assert.equal(reservationA.reservation.status, "confirmed");
    assert.equal(reservationA.reservation.userId, memberA.id);

    const publicAfterBooking = await api(`/api/classes?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`);
    const publicAfterA = publicAfterBooking.body.occurrences.find((item: any) => item.id === classA.id);
    assert.equal(publicAfterA.spotsRemaining, 1);
    const myClasses = await api("/api/portal/my-classes", {}, memberACookie);
    assert.equal(myClasses.status, 200);
    assert.ok(myClasses.body.some((item: any) => item.id === reservationA.reservation.id));

    await assert.rejects(
      () => storage.reserveClassOccurrence({
        occurrenceId: classA.id,
        userId: memberA.id,
        firstName: memberA.firstName,
        lastName: memberA.lastName,
        email: memberA.email,
        phone: memberA.phone || "",
        locale: "en",
      }),
      (error: unknown) => error instanceof ClassBookingError && error.code === "DUPLICATE_RESERVATION",
    );
    const classARosterAfterDuplicate = await storage.getOccurrenceReservations(classA.id);
    assert.equal(classARosterAfterDuplicate.confirmed.filter((item) => item.userId === memberA.id).length, 1);

    const [concurrentA, concurrentB] = await Promise.allSettled([
      storage.reserveClassOccurrence({
        occurrenceId: classB.id,
        userId: memberA.id,
        firstName: memberA.firstName,
        lastName: memberA.lastName,
        email: memberA.email,
        phone: memberA.phone || "",
        locale: "en",
      }),
      storage.reserveClassOccurrence({
        occurrenceId: classB.id,
        userId: memberB.id,
        firstName: memberB.firstName,
        lastName: memberB.lastName,
        email: memberB.email,
        phone: memberB.phone || "",
        locale: "en",
      }),
    ]);
    const concurrentReservations = [concurrentA, concurrentB]
      .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof storage.reserveClassOccurrence>>> => result.status === "fulfilled")
      .map((result) => result.value.reservation);
    reservationIds.push(...concurrentReservations.map((reservation) => reservation.id));
    assert.equal(concurrentReservations.filter((reservation) => reservation.status === "confirmed").length, 1);
    assert.equal(concurrentReservations.filter((reservation) => reservation.status === "waitlisted").length, 1);
    assert.equal((await storage.getOccurrenceReservations(classB.id)).confirmed.length, 1);

    const reservationC1 = await storage.reserveClassOccurrence({
      occurrenceId: classC.id,
      userId: memberA.id,
      firstName: memberA.firstName,
      lastName: memberA.lastName,
      email: memberA.email,
      phone: memberA.phone || "",
      locale: "en",
    });
    const reservationC2 = await storage.reserveClassOccurrence({
      occurrenceId: classC.id,
      userId: memberB.id,
      firstName: memberB.firstName,
      lastName: memberB.lastName,
      email: memberB.email,
      phone: memberB.phone || "",
      locale: "en",
    });
    reservationIds.push(reservationC1.reservation.id, reservationC2.reservation.id);
    assert.equal(reservationC1.reservation.status, "confirmed");
    assert.equal(reservationC2.reservation.status, "waitlisted");
    assert.equal(reservationC2.reservation.waitlistPosition, 1);

    const cancelledC = await storage.cancelClassReservation({ reservationId: reservationC1.reservation.id, userId: memberA.id, reason: "QA cancellation" });
    assert.equal(cancelledC.reservation.status, "cancelled");
    assert.equal(cancelledC.promoted?.id, reservationC2.reservation.id);
    assert.equal(cancelledC.promoted?.status, "confirmed");
    assert.equal((await storage.getOccurrenceReservations(classC.id)).waitlisted.length, 0);
    const lifecycleEvents = await db.select().from(classReservationEvents).where(eq(classReservationEvents.occurrenceId, classC.id));
    assert.ok(lifecycleEvents.some((event) => event.event === "reservation_cancelled"));
    assert.ok(lifecycleEvents.some((event) => event.event === "waitlist_promoted"));

    const cancelledA = await storage.cancelClassReservation({ reservationId: reservationA.reservation.id, userId: memberA.id, reason: "QA cancellation" });
    assert.equal(cancelledA.reservation.status, "cancelled");
    const publicAfterCancellation = await api(`/api/classes?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`);
    const publicAfterCancelA = publicAfterCancellation.body.occurrences.find((item: any) => item.id === classA.id);
    assert.equal(publicAfterCancelA.spotsRemaining, 2);
    const myClassesAfterCancellation = await api("/api/portal/my-classes", {}, memberACookie);
    assert.equal(myClassesAfterCancellation.body.find((item: any) => item.id === reservationA.reservation.id).status, "cancelled");

    const spanishReservation = await storage.reserveClassOccurrence({
      occurrenceId: classA.id,
      userId: memberC.id,
      firstName: memberC.firstName,
      lastName: memberC.lastName,
      email: memberC.email,
      phone: memberC.phone || "",
      locale: "es",
    });
    reservationIds.push(spanishReservation.reservation.id);
    assert.equal(spanishReservation.reservation.locale, "es");
    const spanishCookie = await login(emails.c, password);
    const spanishSchedule = await api(`/api/portal/classes?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`, {}, spanishCookie);
    assert.equal(spanishSchedule.status, 200);
    assert.ok(spanishSchedule.body.some((item: any) => item.id === classA.id));

    const updatedEvents = [
      fixtureEvent(eventIds.a, "Women's Jiu-Jitsu Morning [QA Fixture A]", starts[0], ends[0]),
      { ...events[1], status: "cancelled" as const },
      events[2],
    ];
    const secondSync = await syncGoogleClassSchedule(new Date(), { events: updatedEvents, nextSyncToken: `qa-sync-2-${suffix}` });
    assert.equal(secondSync.cancelled, 1);
    const reconciledA = await storage.getClassOccurrenceByGoogleEvent(fixtureCalendarId, eventIds.a);
    const cancelledB = await storage.getClassOccurrenceByGoogleEvent(fixtureCalendarId, eventIds.b);
    assert.equal(reconciledA?.id, classA.id);
    assert.equal(reconciledA?.title, "Women's Jiu-Jitsu Morning [QA Fixture A]");
    assert.equal(cancelledB?.status, "cancelled");
    assert.equal(cancelledB?.bookingEnabled, false);
    const providerCancelledRoster = await storage.getOccurrenceReservations(classB.id);
    assert.equal(providerCancelledRoster.confirmed.length, 0);
    assert.equal(providerCancelledRoster.waitlisted.length, 0);
    const providerCancelledReservations = await db.select().from(classReservations).where(eq(classReservations.occurrenceId, classB.id));
    assert.ok(providerCancelledReservations.length > 0);
    assert.ok(providerCancelledReservations.every((reservation) => reservation.status === "cancelled"));
    await assert.rejects(
      () => storage.reserveClassOccurrence({
        occurrenceId: classB.id,
        userId: memberC.id,
        firstName: memberC.firstName,
        lastName: memberC.lastName,
        email: memberC.email,
        phone: memberC.phone || "",
        locale: "es",
      }),
      (error: unknown) => error instanceof ClassBookingError && error.code === "OCCURRENCE_UNAVAILABLE",
    );
    const publicAfterProviderCancel = await api(`/api/classes?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`);
    assert.equal(publicAfterProviderCancel.body.occurrences.some((item: any) => item.id === classB.id), false);

    const englishEmail = classLifecycleEmailContent({
      classTitle: "Women's Jiu-Jitsu",
      starts: "Saturday, September 12 at 10:00 AM PDT",
      status: "confirmed",
      locale: "en",
    });
    const spanishEmail = classLifecycleEmailContent({
      classTitle: "Jiu-Jitsu para mujeres",
      starts: "sábado 12 de septiembre a las 10:00",
      status: "cancelled",
      locale: "es",
    });
    assert.match(englishEmail.subject, /You're booked/);
    assert.match(spanishEmail.subject, /Reserva cancelada/);
    assert.match(spanishEmail.body, /ha sido cancelada/);
    const spanishPromotion = classLifecycleEmailContent({
      classTitle: "Jiu-Jitsu para mujeres",
      starts: "sábado 12 de septiembre a las 10:00",
      status: "promoted",
      locale: "es",
    });
    assert.match(spanishPromotion.body, /Pasaste de la lista de espera/);

    const resetToken = `qa-reset-token-${suffix}-${"x".repeat(32)}`;
    const resetHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    await storage.createPasswordResetToken(memberC.id, resetHash, new Date(Date.now() + 60 * 60 * 1000));
    assert.equal(await storage.consumePasswordResetToken(resetHash, "New-Ground-Up-Password-2026"), true);
    assert.equal(await storage.consumePasswordResetToken(resetHash, "Another-Password-2026"), false);
    assert.ok(await storage.validateUserPassword(emails.c, "New-Ground-Up-Password-2026"));
    const expiredToken = crypto.createHash("sha256").update(`expired-${suffix}`).digest("hex");
    await storage.createPasswordResetToken(memberC.id, expiredToken, new Date(Date.now() - 1));
    assert.equal(await storage.consumePasswordResetToken(expiredToken, "Expired-Password-2026"), false);
    assert.match(passwordResetEmailContent("es", "https://example.invalid/reset").subject, /Restablece/);

    t.diagnostic(JSON.stringify({
      boundary: "PROVIDER-BOUNDARY FIXTURE",
      fixtureCalendarId,
      sourceEventIds: eventIds,
      occurrenceIds: { a: classA.id, b: classB.id, c: classC.id },
      capacityBefore: 2,
      capacityAfterMemberABooking: 1,
      concurrency: concurrentReservations.map((reservation) => ({ userId: reservation.userId, status: reservation.status })),
      waitlistPromotion: { cancelled: cancelledC.reservation.id, promoted: cancelledC.promoted?.id },
      providerCancellation: { eventId: eventIds.b, occurrenceStatus: cancelledB?.status, bookingEnabled: cancelledB?.bookingEnabled },
      locale: { english: reservationA.reservation.locale, spanish: spanishReservation.reservation.locale },
    }));
  } finally {
    try {
      if (occurrenceIds.length) {
        await db.delete(classReservationEvents).where(inArray(classReservationEvents.occurrenceId, occurrenceIds));
        await db.delete(classReservations).where(inArray(classReservations.occurrenceId, occurrenceIds));
        await db.delete(classOccurrences).where(inArray(classOccurrences.id, occurrenceIds));
      }
      if (createdUserIds.length) {
        await db.delete(passwordResetTokens).where(inArray(passwordResetTokens.userId, createdUserIds));
        await db.delete(users).where(inArray(users.id, createdUserIds));
      }
    } finally {
      if (previousConnection) {
        await db.update(calendarConnections).set({
          provider: previousConnection.provider,
          calendarId: previousConnection.calendarId,
          calendarName: previousConnection.calendarName,
          timezone: previousConnection.timezone,
          status: previousConnection.status,
          lastAttemptedAt: previousConnection.lastAttemptedAt,
          lastSuccessfulAt: previousConnection.lastSuccessfulAt,
          lastSyncedEventCount: previousConnection.lastSyncedEventCount,
          lastError: previousConnection.lastError,
          syncToken: previousConnection.syncToken,
          updatedAt: new Date(),
        }).where(eq(calendarConnections.id, previousConnection.id));
      } else if (fixtureConnectionId) {
        await db.delete(calendarConnections).where(eq(calendarConnections.id, fixtureConnectionId));
      }
      await pool.end();
    }
  }
});