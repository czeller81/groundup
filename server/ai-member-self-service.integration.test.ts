import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import express from "express";
import session from "express-session";
import test from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import {
  calendarConnections,
  classOccurrences,
  classReservationEvents,
  classReservations,
  classTypes,
  entitlementLedger,
  formResponses,
  forms,
  memberAiDelegations,
  memberAuditEvents,
  memberLifecycleEvents,
  memberLifecycles,
  membershipPlans,
  memberships,
  minorProfiles,
  notificationOutbox,
  users,
  waiverAcceptances,
} from "@shared/schema";
import { db, pool } from "./db";
import { registerMemberAiSelfServiceRoutes } from "./ai-member-self-service";
import { evaluateBookingEligibilityWithExecutor } from "./member-entitlements";
import { registerPortalFormRoutes } from "./portal-form-routes";
import { storage } from "./storage";

const testEnabled = process.env.RUN_MEMBER_AI_SELF_SERVICE_E2E === "true"
  && process.env.NODE_ENV !== "production"
  && !process.env.NEON_DATABASE_URL
  && Boolean(process.env.DATABASE_URL)
  && Boolean(process.env.MEMBER_AI_E2E_DATABASE_NAME);

type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
  requestId?: string;
  sessionUserId?: string;
  idempotencyKey?: string;
};

test("member self-service migration and delegated HTTP protections", { skip: !testEnabled }, async () => {
  const [{ database_name: databaseName }] = (await pool.query(
    "SELECT current_database() AS database_name",
  )).rows;
  assert.equal(databaseName, process.env.MEMBER_AI_E2E_DATABASE_NAME);

  const migrationSql = await readFile(
    new URL("../migrations/20260927_member_ai_self_service.sql", import.meta.url),
    "utf8",
  );

  // Exercise the DDL and its constraints in a disposable schema before using
  // the explicitly selected development database's application tables.
  const schemaName = `member_ai_validate_${randomUUID().replaceAll("-", "")}`;
  const migrationClient = await pool.connect();
  try {
    await migrationClient.query(`CREATE SCHEMA "${schemaName}"`);
    await migrationClient.query(`SET search_path TO "${schemaName}", public`);
    await migrationClient.query("CREATE TABLE users (id varchar PRIMARY KEY)");
    await migrationClient.query("CREATE TABLE forms (id varchar PRIMARY KEY)");
    await migrationClient.query(
      "CREATE TABLE form_responses (id varchar PRIMARY KEY, user_id varchar, form_id varchar, status text)",
    );
    await migrationClient.query("INSERT INTO users (id) VALUES ('migration-user')");
    await migrationClient.query("INSERT INTO forms (id) VALUES ('migration-form')");
    await migrationClient.query(
      "INSERT INTO form_responses (id, user_id, form_id, status) VALUES ('legacy-submission', 'migration-user', 'migration-form', 'submitted')",
    );
    await migrationClient.query(migrationSql);

    const [acceptanceCount] = (await migrationClient.query(
      "SELECT count(*)::int AS count FROM waiver_acceptances",
    )).rows;
    assert.equal(acceptanceCount.count, 0, "legacy submitted forms must not become waiver acceptances");

    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    const tokenHash = "a".repeat(64);
    await migrationClient.query(
      `INSERT INTO member_ai_delegations (user_id, token_hash, scopes, expires_at)
       VALUES ($1, $2, $3::jsonb, $4)`,
      ["migration-user", tokenHash, JSON.stringify(["self:profile:read"]), oneHourFromNow],
    );
    await assert.rejects(
      migrationClient.query(
        `INSERT INTO member_ai_delegations (user_id, token_hash, scopes, expires_at)
         VALUES ($1, $2, $3::jsonb, $4)`,
        ["migration-user", "b".repeat(64), JSON.stringify(["admin:all"]), oneHourFromNow],
      ),
      (error: { code?: string }) => error.code === "23514",
    );
    await assert.rejects(
      migrationClient.query(
        `INSERT INTO member_ai_delegations (user_id, token_hash, scopes, expires_at)
         VALUES ($1, $2, $3::jsonb, now() - interval '1 hour')`,
        ["migration-user", "c".repeat(64), JSON.stringify(["self:profile:read"])],
      ),
      (error: { code?: string }) => error.code === "23514",
    );
    await assert.rejects(
      migrationClient.query(
        `INSERT INTO waiver_acceptances (
          user_id, form_id, terms_version_hash, terms_snapshot, evidence,
          signer_name, accepted_at, accepted_via
        ) VALUES ($1, $2, 'version', '{}'::jsonb, '{}'::jsonb, 'Member', now(), 'agent')`,
        ["migration-user", "migration-form"],
      ),
      (error: { code?: string }) => error.code === "23514",
    );
    const { rows: indexRows } = await migrationClient.query(
      `SELECT indexname FROM pg_indexes
       WHERE schemaname = $1
         AND indexname IN (
           'member_ai_delegations_token_hash_unique',
           'waiver_acceptances_user_form_version_unique'
         )`,
      [schemaName],
    );
    assert.equal(indexRows.length, 2, "migration must create unique token and acceptance indexes");
  } finally {
    await migrationClient.query("ROLLBACK").catch(() => undefined);
    await migrationClient.query("SET search_path TO public").catch(() => undefined);
    await migrationClient.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`).catch(() => undefined);
    migrationClient.release();
  }

  if (process.env.MEMBER_AI_MIGRATION_ONLY === "true") return;
  assert.equal(await isDevelopmentSchemaReady(), true, "the development database needs the reviewed migration before HTTP tests");

  const previousFeatureFlag = process.env.MEMBER_AI_SELF_SERVICE_ENABLED;
  process.env.MEMBER_AI_SELF_SERVICE_ENABLED = "true";
  const suffix = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  const emails = [`member-a-${suffix}@example.invalid`, `member-b-${suffix}@example.invalid`];
  const userIds: string[] = [];
  const classTypeIds: string[] = [];
  const occurrenceIds: string[] = [];
  let planId: string | undefined;
  let minorProfileId: string | undefined;
  let calendarConnectionIdToDelete: string | undefined;
  let server: ReturnType<express.Express["listen"]> | undefined;

  const cleanup = async () => {
    if (userIds.length) {
    await db.delete(notificationOutbox).where(inArray(notificationOutbox.recipient, emails));
    await db.delete(memberAuditEvents).where(inArray(memberAuditEvents.userId, userIds));
      await db.delete(memberAuditEvents).where(inArray(memberAuditEvents.actorId, userIds));
      await db.delete(waiverAcceptances).where(inArray(waiverAcceptances.userId, userIds));
      await db.delete(memberAiDelegations).where(inArray(memberAiDelegations.userId, userIds));
      await db.delete(entitlementLedger).where(inArray(entitlementLedger.userId, userIds));
      await db.delete(formResponses).where(inArray(formResponses.userId, userIds));
      await db.delete(memberLifecycleEvents).where(inArray(memberLifecycleEvents.userId, userIds));
      await db.delete(memberLifecycles).where(inArray(memberLifecycles.userId, userIds));
      if (occurrenceIds.length) {
        const reservations = await db.select({ id: classReservations.id })
          .from(classReservations)
          .where(inArray(classReservations.occurrenceId, occurrenceIds));
        const reservationIds = reservations.map(({ id }) => id);
        if (reservationIds.length) {
          await db.delete(classReservationEvents).where(inArray(classReservationEvents.reservationId, reservationIds));
        }
        await db.delete(classReservations).where(inArray(classReservations.occurrenceId, occurrenceIds));
      }
      if (minorProfileId) await db.delete(minorProfiles).where(eq(minorProfiles.id, minorProfileId));
      await db.delete(memberships).where(inArray(memberships.userId, userIds));
      await db.delete(users).where(inArray(users.id, userIds));
    }
    if (occurrenceIds.length) {
      await db.delete(classOccurrences).where(inArray(classOccurrences.id, occurrenceIds));
    }
    if (classTypeIds.length) await db.delete(classTypes).where(inArray(classTypes.id, classTypeIds));
    if (calendarConnectionIdToDelete) {
      await db.delete(calendarConnections).where(eq(calendarConnections.id, calendarConnectionIdToDelete));
    }
    if (planId) await db.delete(membershipPlans).where(eq(membershipPlans.id, planId));
  };

  try {
    const memberA = await storage.createUser(emails[0], "member-ai-integration-only", "Fixture", "Alpha", "5550000111", "en");
    userIds.push(memberA.id);
    const memberB = await storage.createUser(emails[1], "member-ai-integration-only", "Fixture", "Beta", "5550000222", "en");
    userIds.push(memberB.id);
    await db.update(users).set({ accountStatus: "legitimate", emailVerifiedAt: new Date() })
      .where(inArray(users.id, userIds));

    const bookingForms = await db.select().from(forms).where(eq(forms.requiredBeforeBooking, true));
    const waiverForm = bookingForms.find((form) => form.slug === "liability-waiver");
    assert.ok(waiverForm, "the current liability waiver form must exist");
    for (const userId of userIds) {
      for (const form of bookingForms.filter((candidate) => candidate.slug !== "liability-waiver")) {
        await db.insert(formResponses).values({
          userId,
          formId: form.id,
          answers: {},
          status: "submitted",
          submittedAt: new Date(),
        });
      }
    }

    let [calendarConnection] = await db.select().from(calendarConnections).limit(1);
    if (!calendarConnection) {
      [calendarConnection] = await db.insert(calendarConnections).values({
        provider: "member_ai_e2e",
        calendarId: `member-ai-e2e-${suffix}`,
        calendarName: "Temporary member self-service fixture",
        status: "not_configured",
      }).returning();
      calendarConnectionIdToDelete = calendarConnection.id;
    }
    const plan = await db.insert(membershipPlans).values({
      internalKey: `member-ai-e2e-${suffix}`,
      displayName: "Member AI E2E",
      weeklySessionLimit: 4,
      eligibleClassCategories: ["skill"],
      bookingWindowHours: 168,
      weekStartDay: 1,
      timezone: "America/Los_Angeles",
      waitlistAllowed: true,
    }).returning();
    planId = plan[0].id;
    // Give each fixture a plan with explicit waitlist permission.
    for (const userId of userIds) {
      await storage.createMembership({
        userId,
        planId,
        type: plan[0].internalKey,
        status: "active",
        priceCents: 0,
        source: "member_ai_integration_test",
      });
    }

    const classType = await storage.createClassType({
      name: `Member AI E2E ${suffix}`,
      description: "Temporary delegated booking test class",
      category: "skill",
      matchPattern: "member-ai-e2e",
      defaultCapacity: 1,
      beginnerFriendly: true,
      firstVisitEligible: true,
      defaultTrainerId: null,
      membershipRequired: false,
      active: true,
      bookingEnabled: true,
    });
    classTypeIds.push(classType.id);

    const isAllowedDay = (date: Date) => {
      const weekday = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        weekday: "long",
      }).format(date);
      return weekday === "Monday" || weekday === "Wednesday" || weekday === "Friday";
    };
    const start = new Date();
    start.setUTCHours(18, 0, 0, 0);
    while (!isAllowedDay(start) || start.getTime() <= Date.now() + 8 * 60 * 60 * 1000) {
      start.setTime(start.getTime() + 24 * 60 * 60 * 1000);
    }
    const addOccurrence = async (offsetHours: number, title: string) => {
      const occurrenceStart = new Date(start.getTime() + offsetHours * 60 * 60 * 1000);
      const [occurrence] = await db.insert(classOccurrences).values({
        calendarConnectionId: calendarConnection.id,
        googleCalendarId: `member-ai-e2e-${suffix}`,
        googleEventId: `member-ai-e2e-${suffix}-${offsetHours}`,
        title,
        description: "Temporary delegated booking test class",
        start: occurrenceStart,
        end: new Date(occurrenceStart.getTime() + 60 * 60 * 1000),
        location: "Ground Up fixture",
        instructorName: "Fixture Coach",
        classTypeId: classType.id,
        canonicalCategory: "JIU_JITSU_SELF_DEFENSE",
        audienceGroup: "ADULT_WOMEN",
        status: "active",
        syncState: "synced",
        capacity: 1,
        firstVisitEligible: true,
        bookingEnabled: true,
        audience: "members",
        remoteUpdatedAt: new Date(),
        lastSyncedAt: new Date(),
      }).returning();
      occurrenceIds.push(occurrence.id);
      return occurrence;
    };
    const finalSeat = await addOccurrence(0, `Member AI final seat ${suffix}`);
    const differentOccurrence = await addOccurrence(2, `Member AI idempotency mismatch ${suffix}`);

    const app = express();
    app.use(express.json());
    app.use(session({
      secret: "member-ai-integration-session-only",
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false },
    }));
    app.use((req, _res, next) => {
      if (req.path.startsWith("/api/portal/")) {
        req.session.userId = req.get("x-fixture-user-id") || memberA.id;
      }
      next();
    });
    registerPortalFormRoutes(app);
    registerMemberAiSelfServiceRoutes(app);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve, reject) => {
      server?.once("listening", resolve);
      server?.once("error", reject);
    });
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const api = (path: string, options: ApiRequestOptions = {}) => {
      const headers = new Headers();
      if (options.body !== undefined) headers.set("content-type", "application/json");
      if (options.token) headers.set("authorization", `Bearer ${options.token}`);
      if (options.requestId) headers.set("x-request-id", options.requestId);
      if (options.sessionUserId) headers.set("x-fixture-user-id", options.sessionUserId);
      if (options.idempotencyKey) headers.set("idempotency-key", options.idempotencyKey);
      return fetch(`${baseUrl}${path}`, {
        method: options.method || "GET",
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    };
    const createGrant = async (userId: string) => {
      const response = await api("/api/portal/me/ai-delegations", {
        method: "POST",
        sessionUserId: userId,
        body: {
          label: "integration-test",
          scopes: [
            "self:profile:read",
            "self:booking:preview",
            "self:waiver:initiate",
            "self:reservation:create",
          ],
          expiresInHours: 24,
        },
      });
      assert.equal(response.status, 201);
      const payload = await response.json() as { delegation: { id: string }; token: string };
      return payload;
    };

    const grantA = await createGrant(memberA.id);
    const grantB = await createGrant(memberB.id);
    const requestId = randomUUID();
    const previewBeforeAcceptance = await api("/api/ai/member/v1/booking-preview", {
      method: "POST",
      token: grantA.token,
      requestId,
      body: { occurrenceId: finalSeat.id },
    });
    const previewBeforeBody = await previewBeforeAcceptance.json() as Record<string, unknown>;
    assert.equal(previewBeforeAcceptance.status, 200);
    assert.equal(previewBeforeBody.code, "CURRENT_WAIVER_REQUIRED");
    assert.equal(previewBeforeBody.bookingOutcome, null);
    assert.equal(previewBeforeBody.eligible, false);

    const unacceptedBooking = await api("/api/ai/member/v1/reservations", {
      method: "POST",
      token: grantA.token,
      body: { occurrenceId: finalSeat.id, confirm: true },
      idempotencyKey: randomUUID(),
    });
    assert.equal(unacceptedBooking.status, 409);
    assert.equal((await unacceptedBooking.json() as { code: string }).code, "CURRENT_WAIVER_REQUIRED");
    const agentWaiverAttempt = await api("/api/ai/member/v1/waiver", {
      method: "POST",
      token: grantA.token,
      body: { accepted: true, signerName: "Fixture Alpha" },
    });
    assert.equal(agentWaiverAttempt.status, 404, "the delegated API must not expose waiver acceptance");
    assert.equal((await db.select().from(waiverAcceptances).where(inArray(waiverAcceptances.userId, userIds))).length, 0);

    const submitHumanWaiver = async (userId: string, fullName: string) => {
      const date = new Date().toISOString().slice(0, 10);
      const response = await api("/api/portal/forms/liability-waiver/submit", {
        method: "POST",
        sessionUserId: userId,
        body: {
          answers: {
            fullName,
            dateOfBirth: "1990-05-10",
            emergencyContact: "Fixture Contact",
            emergencyPhone: "5550000999",
            riskAcknowledgment: true,
            voluntaryParticipation: true,
            liabilityRelease: true,
            safetyGuidelines: true,
            digitalSignature: fullName,
            signatureDate: date,
          },
        },
      });
      assert.equal(response.status, 200, "human members must accept the current waiver through the portal form route");
      const body = await response.json() as { status: string; currentAcceptance: boolean };
      assert.equal(body.status, "submitted");
      assert.equal(body.currentAcceptance, true);
    };
    await submitHumanWaiver(memberA.id, "Fixture Alpha");
    await submitHumanWaiver(memberB.id, "Fixture Beta");
    const humanWaiverAcceptances = await db.select({
      userId: waiverAcceptances.userId,
      signerName: waiverAcceptances.signerName,
      acceptedVia: waiverAcceptances.acceptedVia,
    }).from(waiverAcceptances).where(inArray(waiverAcceptances.userId, userIds));
    assert.equal(humanWaiverAcceptances.length, 2);
    assert.deepEqual(
      humanWaiverAcceptances.map((acceptance) => acceptance.acceptedVia),
      ["member_portal", "member_portal"],
    );
    assert.deepEqual(
      humanWaiverAcceptances.map((acceptance) => acceptance.signerName).sort(),
      ["Fixture Alpha", "Fixture Beta"],
    );

    const profileResponse = await api("/api/ai/member/v1/me", { token: grantA.token });
    assert.equal(profileResponse.status, 200);
    const profileBody = await profileResponse.json() as Record<string, unknown>;
    assert.equal(profileBody.firstName, "Fixture");
    assert.equal("email" in profileBody, false);
    assert.equal(JSON.stringify(profileBody).includes(emails[0]), false);
    assert.equal((await api("/api/ai/member/v1/reservations", { token: grantA.token })).status, 403);

    const minor = await db.insert(minorProfiles).values({
      guardianUserId: memberA.id,
      firstName: "Fixture",
      lastName: "Dependent",
      dateOfBirth: new Date("2014-01-01T00:00:00Z"),
      emergencyContactName: "Fixture Alpha",
      emergencyContactPhone: "5550000111",
      emergencyContactRelationship: "Guardian",
      consentSignature: "Fixture Alpha",
      consentedAt: new Date(),
    }).returning();
    minorProfileId = minor[0].id;
    const dependentScopeDenied = await api("/api/ai/member/v1/reservations", {
      method: "POST",
      token: grantA.token,
      body: { occurrenceId: finalSeat.id, minorProfileId, confirm: true },
    });
    assert.equal(dependentScopeDenied.status, 403);
    assert.equal((await dependentScopeDenied.json() as { code: string }).code, "DELEGATION_SCOPE_REQUIRED");

    const spoofedIdentity = await api("/api/ai/member/v1/reservations", {
      method: "POST",
      token: grantA.token,
      body: { occurrenceId: finalSeat.id, confirm: true, userId: memberB.id },
    });
    assert.equal(spoofedIdentity.status, 400, "request bodies cannot replace the delegated member identity");

    const bookingRequestIds = [randomUUID(), randomUUID()];
    const idempotencyKeys = [randomUUID(), randomUUID()];
    const simultaneous = await Promise.all([
      api("/api/ai/member/v1/reservations", {
        method: "POST",
        token: grantA.token,
        requestId: bookingRequestIds[0],
        idempotencyKey: idempotencyKeys[0],
        body: { occurrenceId: finalSeat.id, confirm: true },
      }),
      api("/api/ai/member/v1/reservations", {
        method: "POST",
        token: grantB.token,
        requestId: bookingRequestIds[1],
        idempotencyKey: idempotencyKeys[1],
        body: { occurrenceId: finalSeat.id, confirm: true },
      }),
    ]);
    const simultaneousBodies = await Promise.all(simultaneous.map((response) => response.json() as Promise<{
      reservationId: string;
      status: string;
    }>));
    assert.deepEqual(simultaneous.map((response) => response.status).sort(), [201, 202]);
    assert.deepEqual(simultaneousBodies.map((body) => body.status).sort(), ["confirmed", "waitlisted"]);
    const winnerIndex = simultaneous.findIndex((response) => response.status === 201);
    const winnerGrant = winnerIndex === 0 ? grantA : grantB;
    const winnerKey = idempotencyKeys[winnerIndex];
    const winnerRequestId = bookingRequestIds[winnerIndex];
    const replay = await api("/api/ai/member/v1/reservations", {
      method: "POST",
      token: winnerGrant.token,
      requestId: randomUUID(),
      idempotencyKey: winnerKey,
      body: { occurrenceId: finalSeat.id, confirm: true },
    });
    assert.equal(replay.status, 201);
    assert.equal((await replay.json() as { reservationId: string }).reservationId, simultaneousBodies[winnerIndex].reservationId);

    const duplicatePreview = await api("/api/ai/member/v1/booking-preview", {
      method: "POST",
      token: winnerGrant.token,
      body: { occurrenceId: finalSeat.id },
    });
    const duplicatePreviewBody = await duplicatePreview.json() as {
      eligible: boolean;
      code: string;
      bookingOutcome: string | null;
    };
    assert.equal(duplicatePreviewBody.eligible, false);
    assert.equal(duplicatePreviewBody.code, "DUPLICATE_RESERVATION");
    assert.equal(duplicatePreviewBody.bookingOutcome, null);

    const mismatchedReplay = await api("/api/ai/member/v1/reservations", {
      method: "POST",
      token: winnerGrant.token,
      idempotencyKey: winnerKey,
      body: { occurrenceId: differentOccurrence.id, confirm: true },
    });
    assert.equal(mismatchedReplay.status, 409);
    assert.equal((await mismatchedReplay.json() as { code: string }).code, "IDEMPOTENCY_KEY_REUSED");

    await db.insert(classReservations).values({
      occurrenceId: differentOccurrence.id,
      userId: memberB.id,
      visitorFirstName: "Fixture",
      visitorLastName: "Beta",
      visitorEmail: emails[1],
      visitorPhone: "5550000222",
      status: "confirmed",
    });
    const fullPreview = await api("/api/ai/member/v1/booking-preview", {
      method: "POST",
      token: grantA.token,
      body: { occurrenceId: differentOccurrence.id },
    });
    const fullPreviewBody = await fullPreview.json() as {
      eligible: boolean;
      code: string;
      bookingOutcome: string | null;
    };
    const previewReservations = await db.select({
      userId: classReservations.userId,
      status: classReservations.status,
    }).from(classReservations).where(eq(classReservations.occurrenceId, differentOccurrence.id));
    const directEligibility = await evaluateBookingEligibilityWithExecutor(memberA, differentOccurrence, db);
    assert.equal(fullPreviewBody.eligible, true);
    assert.equal(
      fullPreviewBody.bookingOutcome,
      "waitlisted",
      JSON.stringify({
        preview: fullPreviewBody,
        directEligibility: {
          code: directEligibility.code,
          eligible: directEligibility.eligible,
          waitlistAllowed: directEligibility.waitlistAllowed,
        },
        capacity: differentOccurrence.capacity,
        reservations: previewReservations,
      }),
    );

    const ownerIsolation = await api(`/api/portal/me/ai-delegations/${grantA.delegation.id}`, {
      method: "DELETE",
      sessionUserId: memberB.id,
    });
    assert.equal(ownerIsolation.status, 404, "a different member cannot revoke another member's grant");

    const revokedGrant = await createGrant(memberA.id);
    const revokeResponse = await api(`/api/portal/me/ai-delegations/${revokedGrant.delegation.id}`, {
      method: "DELETE",
      sessionUserId: memberA.id,
    });
    assert.equal(revokeResponse.status, 200);
    assert.equal((await api("/api/ai/member/v1/me", { token: revokedGrant.token })).status, 401);

    const expiredGrant = await createGrant(memberA.id);
    const now = Date.now();
    await db.update(memberAiDelegations).set({
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(now - 24 * 60 * 60 * 1000),
    }).where(eq(memberAiDelegations.id, expiredGrant.delegation.id));
    assert.equal((await api("/api/ai/member/v1/me", { token: expiredGrant.token })).status, 401);

    const auditEvents = await db.select().from(memberAuditEvents)
      .where(and(
        inArray(memberAuditEvents.userId, userIds),
        eq(memberAuditEvents.action, "ai_delegated_api_operation"),
      ));
    const successfulBookings = auditEvents
      .filter((event) => bookingRequestIds.includes(String((event.after as Record<string, unknown>)?.requestId)))
      .map((event) => event.after as Record<string, unknown>);
    assert.equal(successfulBookings.length, 2);
    assert.deepEqual(
      successfulBookings.map((event) => event.status).sort(),
      [201, 202],
    );
    const auditText = JSON.stringify(await db.select().from(memberAuditEvents)
      .where(inArray(memberAuditEvents.userId, userIds)));
    assert.equal(auditText.includes(grantA.token), false);
    assert.equal(auditText.includes(grantB.token), false);
    assert.equal(emails.some((email) => auditText.includes(email)), false);
    assert.equal(auditText.includes("member-ai-integration-session-only"), false);
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => error ? reject(error) : resolve());
      });
    }
    try {
      await cleanup();
    } finally {
      if (previousFeatureFlag === undefined) delete process.env.MEMBER_AI_SELF_SERVICE_ENABLED;
      else process.env.MEMBER_AI_SELF_SERVICE_ENABLED = previousFeatureFlag;
    }
  }
});

async function isDevelopmentSchemaReady() {
  try {
    await db.select().from(memberAiDelegations).limit(0);
    await db.select().from(waiverAcceptances).limit(0);
    await db.select().from(memberAuditEvents).limit(0);
    return true;
  } catch {
    return false;
  }
}