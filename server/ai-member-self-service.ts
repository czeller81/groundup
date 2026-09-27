import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Router, type Express, type NextFunction, type Request, type Response } from "express";
import { and, asc, desc, eq, gt, inArray, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  classOccurrences,
  classReservations,
  forms,
  memberAiDelegations,
  memberAuditEvents,
  minorProfiles,
  users,
  type User,
} from "@shared/schema";
import { db } from "./db";
import { ClassBookingError, storage } from "./storage";
import {
  evaluateBookingEligibilityWithExecutor,
  evaluateMinorBookingEligibilityWithExecutor,
  minorAgeAt,
} from "./member-entitlements";
import { accountCanUseMemberFeatures, requireAuth } from "./route-security";
import { getWaiverTermsVersionHash } from "./waiver-acceptance";

const MEMBER_AI_API_PREFIX = "/api/ai/member/v1";
const MEMBER_AI_FEATURE_FLAG = "VITE_MEMBER_AI_SELF_SERVICE_ENABLED";

export function isMemberAiSelfServiceEnabled() {
  return process.env.NODE_ENV === "development"
    && process.env[MEMBER_AI_FEATURE_FLAG] === "true";
}

export const MEMBER_AI_SCOPES = [
  "self:profile:read",
  "self:schedule:read",
  "self:reservations:read",
  "self:dependents:read",
  "self:booking:preview",
  "self:waiver:initiate",
  "self:reservation:create",
] as const;
export type MemberAiScope = typeof MEMBER_AI_SCOPES[number];

export function hasDependentBookingScope(scopes: ReadonlySet<MemberAiScope>, minorProfileId?: string) {
  return !minorProfileId || scopes.has("self:dependents:read");
}

export const createDelegationSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  scopes: z.array(z.enum(MEMBER_AI_SCOPES)).min(1).max(MEMBER_AI_SCOPES.length),
  expiresInHours: z.number().int().min(1).max(168),
}).strict().superRefine((value, context) => {
  if (new Set(value.scopes).size !== value.scopes.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["scopes"],
      message: "Scopes cannot be repeated.",
    });
  }
});

export const bookingInputSchema = z.object({
  occurrenceId: z.string().uuid(),
  minorProfileId: z.string().uuid().optional(),
}).strict();

export const confirmedBookingInputSchema = bookingInputSchema.extend({
  confirm: z.literal(true),
}).strict();

type DelegationContext = {
  grantId: string;
  user: User;
  scopes: ReadonlySet<MemberAiScope>;
};

class MemberAiRouteError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function hashDelegationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getBearerToken(req: Request) {
  const match = (req.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function requestIdFor(req: Request) {
  const provided = req.get("x-request-id")?.trim();
  return provided && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(provided)
    ? provided
    : randomUUID();
}

function sendError(res: Response, status: number, code: string, message: string) {
  return res.status(status).json({ code, message, requestId: res.locals.memberAiRequestId });
}

function safeDatabaseError(res: Response, error: unknown, message: string) {
  const code = (error as { code?: string } | null)?.code;
  if (code === "42P01" || code === "42703") {
    return sendError(
      res,
      503,
      "MEMBER_SELF_SERVICE_SCHEMA_NOT_READY",
      "Member self-service is not ready in this development database.",
    );
  }
  return sendError(res, 500, "MEMBER_SELF_SERVICE_FAILED", message);
}

function serializeDelegation(
  grant: typeof memberAiDelegations.$inferSelect,
  now = new Date(),
) {
  return {
    id: grant.id,
    label: grant.label,
    scopes: Array.isArray(grant.scopes) ? grant.scopes : [],
    expiresAt: grant.expiresAt,
    revokedAt: grant.revokedAt,
    createdAt: grant.createdAt,
    lastUsedAt: grant.lastUsedAt,
    active: !grant.revokedAt && grant.expiresAt > now,
  };
}

function normalizeLocale(locale: string | null | undefined): "en" | "es" {
  return locale === "es" ? "es" : "en";
}

function currentWaiverUrl(locale: "en" | "es") {
  return `${locale === "es" ? "/es" : ""}/portal/forms/liability-waiver`;
}

async function getCurrentWaiver(userId: string) {
  const [form] = await db.select().from(forms)
    .where(eq(forms.slug, "liability-waiver"))
    .limit(1);
  if (!form) return { form: undefined, acceptance: undefined, versionHash: undefined };
  const acceptance = await storage.getCurrentWaiverAcceptance(userId, form);
  return { form, acceptance, versionHash: getWaiverTermsVersionHash(form) };
}

async function requireOwnedMinor(userId: string, minorProfileId: string) {
  const [minor] = await db.select().from(minorProfiles).where(and(
    eq(minorProfiles.id, minorProfileId),
    eq(minorProfiles.guardianUserId, userId),
  )).limit(1);
  return minor;
}

function delegationContext(res: Response): DelegationContext {
  return res.locals.memberAiDelegation as DelegationContext;
}

function requireScope(scope: MemberAiScope) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!delegationContext(res).scopes.has(scope)) {
      return sendError(res, 403, "DELEGATION_SCOPE_REQUIRED", "This delegated access does not include the required permission.");
    }
    next();
  };
}

function isValidStoredScopeList(value: unknown): value is MemberAiScope[] {
  return Array.isArray(value)
    && value.every((scope) => MEMBER_AI_SCOPES.includes(scope as MemberAiScope))
    && new Set(value).size === value.length;
}

async function authenticateDelegation(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token) return sendError(res, 401, "DELEGATION_INVALID", "A valid member delegation is required.");

  try {
    const [row] = await db.select({
      grant: memberAiDelegations,
      user: users,
    }).from(memberAiDelegations)
      .innerJoin(users, eq(memberAiDelegations.userId, users.id))
      .where(eq(memberAiDelegations.tokenHash, hashDelegationToken(token)))
      .limit(1);

    const now = new Date();
    if (!row || row.grant.revokedAt || row.grant.expiresAt <= now || !isValidStoredScopeList(row.grant.scopes)) {
      return sendError(res, 401, "DELEGATION_INVALID", "A valid member delegation is required.");
    }
    if (row.user.role !== "member" || !accountCanUseMemberFeatures(row.user)) {
      return sendError(res, 403, "MEMBER_ACCOUNT_UNAVAILABLE", "This member account cannot use delegated access.");
    }

    const [usedGrant] = await db.update(memberAiDelegations)
      .set({ lastUsedAt: now })
      .where(and(
        eq(memberAiDelegations.id, row.grant.id),
        isNull(memberAiDelegations.revokedAt),
        gt(memberAiDelegations.expiresAt, new Date()),
      ))
      .returning({ id: memberAiDelegations.id });
    if (!usedGrant) {
      return sendError(res, 401, "DELEGATION_INVALID", "A valid member delegation is required.");
    }
    res.locals.memberAiDelegation = {
      grantId: row.grant.id,
      user: row.user,
      scopes: new Set(row.grant.scopes),
    } satisfies DelegationContext;
    next();
  } catch (error) {
    safeDatabaseError(res, error, "Unable to validate delegated access.");
  }
}

function addRateLimit(router: Router) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  router.use((req, res, next) => {
    const key = req.ip || "unknown";
    const now = Date.now();
    if (buckets.size > 10_000) {
      buckets.forEach((bucket, bucketKey) => {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      });
    }
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
      return next();
    }
    if (current.count >= 60) {
      res.set("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
      return sendError(res, 429, "MEMBER_AI_RATE_LIMITED", "Too many delegated requests.");
    }
    current.count++;
    next();
  });
}

export function registerMemberAiSelfServiceRoutes(app: Express) {
  // Keep the integration surface disabled until a development database has the
  // additive tables. Production never registers delegated endpoints.
  if (!isMemberAiSelfServiceEnabled()) return;

  const portalRouter = Router();
  portalRouter.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  portalRouter.get("/me/ai-delegations", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user || user.role !== "member" || !accountCanUseMemberFeatures(user)) {
        return sendError(res, 403, "MEMBER_ACCOUNT_UNAVAILABLE", "This member account cannot manage delegated access.");
      }
      const grants = await db.select().from(memberAiDelegations)
        .where(eq(memberAiDelegations.userId, userId))
        .orderBy(desc(memberAiDelegations.createdAt))
        .limit(25);
      res.json({ delegations: grants.map((grant) => serializeDelegation(grant)) });
    } catch (error) {
      safeDatabaseError(res, error, "Unable to load delegated access.");
    }
  });

  portalRouter.post("/me/ai-delegations", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const parsed = createDelegationSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "INVALID_DELEGATION_REQUEST", "Choose valid permissions and an expiration of up to seven days.");
    }
    try {
      const created = await db.transaction(async (tx) => {
        const [user] = await tx.select().from(users)
          .where(eq(users.id, userId))
          .for("update")
          .limit(1);
        if (!user || user.role !== "member" || !accountCanUseMemberFeatures(user)) {
          throw new MemberAiRouteError(403, "MEMBER_ACCOUNT_UNAVAILABLE", "This member account cannot manage delegated access.");
        }
        const now = new Date();
        const active = await tx.select({ id: memberAiDelegations.id })
          .from(memberAiDelegations)
          .where(and(
            eq(memberAiDelegations.userId, userId),
            isNull(memberAiDelegations.revokedAt),
            gt(memberAiDelegations.expiresAt, now),
          ))
          .limit(5);
        if (active.length >= 5) {
          throw new MemberAiRouteError(409, "ACTIVE_DELEGATION_LIMIT", "Revoke an existing grant before creating another.");
        }
        const token = `member_ai_${randomBytes(32).toString("base64url")}`;
        const [grant] = await tx.insert(memberAiDelegations).values({
          userId,
          label: parsed.data.label || null,
          tokenHash: hashDelegationToken(token),
          scopes: parsed.data.scopes,
          expiresAt: new Date(now.getTime() + parsed.data.expiresInHours * 60 * 60 * 1000),
        }).returning();
        await tx.insert(memberAuditEvents).values({
          actorId: userId,
          userId,
          targetType: "member_ai_delegation",
          targetId: grant.id,
          action: "ai_delegation_created",
          after: { scopes: parsed.data.scopes, expiresAt: grant.expiresAt.toISOString() },
        });
        return { grant, token, now };
      });
      res.status(201).json({ delegation: serializeDelegation(created.grant, created.now), token: created.token });
    } catch (error) {
      if (error instanceof MemberAiRouteError) {
        return sendError(res, error.status, error.code, error.message);
      }
      safeDatabaseError(res, error, "Unable to create delegated access.");
    }
  });

  portalRouter.delete("/me/ai-delegations/:id", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    try {
      const revoked = await db.transaction(async (tx) => {
        const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user || user.role !== "member" || !accountCanUseMemberFeatures(user)) {
          throw new MemberAiRouteError(403, "MEMBER_ACCOUNT_UNAVAILABLE", "This member account cannot manage delegated access.");
        }
        const [grant] = await tx.select().from(memberAiDelegations).where(and(
          eq(memberAiDelegations.id, req.params.id),
          eq(memberAiDelegations.userId, userId),
        )).for("update").limit(1);
        if (!grant) {
          throw new MemberAiRouteError(404, "DELEGATION_NOT_FOUND", "Delegated access was not found.");
        }
        if (grant.revokedAt) return false;
        const revokedAt = new Date();
        await tx.update(memberAiDelegations).set({ revokedAt })
          .where(and(
            eq(memberAiDelegations.id, grant.id),
            eq(memberAiDelegations.userId, userId),
            isNull(memberAiDelegations.revokedAt),
          ));
        await tx.insert(memberAuditEvents).values({
          actorId: userId,
          userId,
          targetType: "member_ai_delegation",
          targetId: grant.id,
          action: "ai_delegation_revoked",
          after: { revokedAt: revokedAt.toISOString() },
        });
        return true;
      });
      res.json({ success: true, revoked });
    } catch (error) {
      if (error instanceof MemberAiRouteError) {
        return sendError(res, error.status, error.code, error.message);
      }
      safeDatabaseError(res, error, "Unable to revoke delegated access.");
    }
  });
  app.use("/api/portal", portalRouter);

  const apiRouter = Router();
  apiRouter.use((_req, res, next) => {
    res.locals.memberAiRequestId = requestIdFor(_req);
    res.set("Cache-Control", "no-store");
    next();
  });
  addRateLimit(apiRouter);

  apiRouter.get("/openapi.json", (_req, res) => {
    res.json({
      openapi: "3.1.0",
      info: { title: "Ground Up Member Self-Service API", version: "1.0.0" },
      servers: [{ url: MEMBER_AI_API_PREFIX }],
      components: {
        securitySchemes: {
          memberDelegation: { type: "http", scheme: "bearer", bearerFormat: "member delegation token" },
        },
      },
      paths: {
        "/me": { get: { security: [{ memberDelegation: [] }], "x-required-scopes": ["self:profile:read"], responses: { "200": { description: "Minimal member profile" } } } },
        "/schedule": { get: { security: [{ memberDelegation: [] }], "x-required-scopes": ["self:schedule:read"], responses: { "200": { description: "Classes within the rolling seven-day member window" } } } },
        "/reservations": {
          get: { security: [{ memberDelegation: [] }], "x-required-scopes": ["self:reservations:read"], responses: { "200": { description: "The delegated member's reservations" } } },
          post: {
            security: [{ memberDelegation: [] }],
            "x-required-scopes": ["self:reservation:create"],
            parameters: [{ in: "header", name: "Idempotency-Key", required: true, schema: { type: "string", format: "uuid" } }],
            responses: {
              "201": { description: "Confirmed reservation" },
              "202": { description: "Waitlisted reservation" },
            },
          },
        },
        "/dependents": { get: { security: [{ memberDelegation: [] }], "x-required-scopes": ["self:dependents:read"], responses: { "200": { description: "Eligible dependent names only" } } } },
        "/booking-preview": { post: { security: [{ memberDelegation: [] }], "x-required-scopes": ["self:booking:preview"], responses: { "200": { description: "Eligibility and current-waiver readiness; does not reserve a class" } } } },
        "/waiver": { get: { security: [{ memberDelegation: [] }], "x-required-scopes": ["self:waiver:initiate"], responses: { "200": { description: "Current waiver status and member-portal URL" } } } },
      },
    });
  });

  apiRouter.use(authenticateDelegation);
  apiRouter.get("/me", requireScope("self:profile:read"), (_req, res) => {
    const { user } = delegationContext(res);
    res.json({
      firstName: user.firstName,
      lastName: user.lastName,
      locale: normalizeLocale(user.locale),
    });
  });

  apiRouter.get("/schedule", requireScope("self:schedule:read"), async (req, res) => {
    const now = new Date();
    const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const requestedFrom = typeof req.query.from === "string" ? new Date(req.query.from) : now;
    const requestedTo = typeof req.query.to === "string" ? new Date(req.query.to) : horizon;
    if (Number.isNaN(requestedFrom.getTime()) || Number.isNaN(requestedTo.getTime())) {
      return sendError(res, 400, "INVALID_DATE_RANGE", "from and to must be valid ISO date values.");
    }
    const from = requestedFrom < now ? now : requestedFrom;
    const to = requestedTo > horizon ? horizon : requestedTo;
    if (to <= from) return sendError(res, 400, "INVALID_DATE_RANGE", "Schedule range must be within the next seven days.");
    try {
      const occurrences = await storage.listClassOccurrences(from, to, false, false);
      res.json({
        timezone: "America/Los_Angeles",
        from,
        to,
        occurrences: occurrences
          .filter((occurrence) => occurrence.start >= from
            && occurrence.start <= to
            && occurrence.status === "active"
            && occurrence.bookingEnabled)
          .map((occurrence) => ({
            id: occurrence.id,
            title: occurrence.title,
            description: occurrence.description,
            start: occurrence.start,
            end: occurrence.end,
            location: occurrence.location,
            instructorName: occurrence.instructorName,
            canonicalCategory: occurrence.canonicalCategory,
            audienceGroup: occurrence.audienceGroup,
            capacity: occurrence.capacity,
          })),
      });
    } catch (error) {
      safeDatabaseError(res, error, "Unable to load the member schedule.");
    }
  });

  apiRouter.get("/reservations", requireScope("self:reservations:read"), async (_req, res) => {
    const { user } = delegationContext(res);
    const canReadDependentNames = delegationContext(res).scopes.has("self:dependents:read");
    try {
      const reservations = await db.select({
        id: classReservations.id,
        occurrenceId: classReservations.occurrenceId,
        status: classReservations.status,
        waitlistPosition: classReservations.waitlistPosition,
        createdAt: classReservations.createdAt,
        start: classOccurrences.start,
        end: classOccurrences.end,
        title: classOccurrences.title,
        minorFirstName: minorProfiles.firstName,
        minorLastName: minorProfiles.lastName,
      }).from(classReservations)
        .innerJoin(classOccurrences, eq(classReservations.occurrenceId, classOccurrences.id))
        .leftJoin(minorProfiles, eq(classReservations.minorProfileId, minorProfiles.id))
        .where(and(
          eq(classReservations.userId, user.id),
          inArray(classReservations.status, ["confirmed", "waitlisted", "cancelled"]),
        ))
        .orderBy(desc(classReservations.createdAt))
        .limit(50);
      res.json({
        reservations: reservations.map((reservation) => ({
          id: reservation.id,
          occurrenceId: reservation.occurrenceId,
          status: reservation.status,
          waitlistPosition: reservation.waitlistPosition,
          createdAt: reservation.createdAt,
          start: reservation.start,
          end: reservation.end,
          title: reservation.title,
          participant: !reservation.minorFirstName
            ? "member"
            : canReadDependentNames
              ? `${reservation.minorFirstName} ${reservation.minorLastName || ""}`.trim()
              : "dependent",
        })),
      });
    } catch (error) {
      safeDatabaseError(res, error, "Unable to load member reservations.");
    }
  });

  apiRouter.get("/dependents", requireScope("self:dependents:read"), async (_req, res) => {
    const { user } = delegationContext(res);
    try {
      const now = new Date();
      const profiles = await db.select({
        id: minorProfiles.id,
        firstName: minorProfiles.firstName,
        lastName: minorProfiles.lastName,
        dateOfBirth: minorProfiles.dateOfBirth,
        consentSignature: minorProfiles.consentSignature,
        emergencyContactName: minorProfiles.emergencyContactName,
        emergencyContactPhone: minorProfiles.emergencyContactPhone,
      }).from(minorProfiles).where(and(
        eq(minorProfiles.guardianUserId, user.id),
        isNull(minorProfiles.consentRevokedAt),
        isNotNull(minorProfiles.consentedAt),
      )).orderBy(asc(minorProfiles.firstName));
      res.json({
        dependents: profiles
          .filter((profile) => minorAgeAt(profile.dateOfBirth, now) >= 0
            && minorAgeAt(profile.dateOfBirth, now) < 18
            && Boolean(profile.consentSignature?.trim())
            && Boolean(profile.emergencyContactName?.trim())
            && Boolean(profile.emergencyContactPhone?.trim()))
          .map(({ id, firstName, lastName }) => ({ id, firstName, lastName })),
      });
    } catch (error) {
      safeDatabaseError(res, error, "Unable to load eligible dependents.");
    }
  });

  apiRouter.get("/waiver", requireScope("self:waiver:initiate"), async (_req, res) => {
    const { user } = delegationContext(res);
    try {
      const { form, acceptance, versionHash } = await getCurrentWaiver(user.id);
      if (!form || !versionHash) {
        return sendError(res, 503, "CURRENT_WAIVER_UNAVAILABLE", "The current member waiver is unavailable.");
      }
      res.json({
        title: form.title,
        current: Boolean(acceptance),
        acceptedAt: acceptance?.acceptedAt || null,
        termsVersionHash: versionHash,
        requiresHumanAction: !acceptance,
        url: currentWaiverUrl(normalizeLocale(user.locale)),
      });
    } catch (error) {
      safeDatabaseError(res, error, "Unable to check current waiver status.");
    }
  });

  apiRouter.post("/booking-preview", requireScope("self:booking:preview"), async (req, res) => {
    const { user } = delegationContext(res);
    const parsed = bookingInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "INVALID_BOOKING_PREVIEW", "Provide a class occurrence and, optionally, an eligible dependent.");
    }
    if (!hasDependentBookingScope(delegationContext(res).scopes, parsed.data.minorProfileId)) {
      return sendError(res, 403, "DELEGATION_SCOPE_REQUIRED", "Reading eligible dependents is required to preview dependent bookings.");
    }
    try {
      const [occurrence] = await db.select().from(classOccurrences)
        .where(eq(classOccurrences.id, parsed.data.occurrenceId))
        .limit(1);
      if (!occurrence) return sendError(res, 404, "OCCURRENCE_NOT_FOUND", "This class occurrence does not exist.");

      const waiver = await getCurrentWaiver(user.id);
      if (!waiver.form || !waiver.versionHash) {
        return sendError(res, 503, "CURRENT_WAIVER_UNAVAILABLE", "The current member waiver is unavailable.");
      }
      if (!waiver.acceptance) {
        return res.json({
          eligible: false,
          code: "CURRENT_WAIVER_REQUIRED",
          message: "Complete the current waiver in the member portal before booking.",
          requiresHumanAction: true,
          waiverUrl: currentWaiverUrl(normalizeLocale(user.locale)),
          requiresExplicitConfirmation: true,
        });
      }

      let eligibility;
      if (parsed.data.minorProfileId) {
        const minor = await requireOwnedMinor(user.id, parsed.data.minorProfileId);
        if (!minor) return sendError(res, 404, "DEPENDENT_NOT_FOUND", "This eligible dependent was not found.");
        eligibility = await evaluateMinorBookingEligibilityWithExecutor(minor, occurrence, db);
      } else {
        eligibility = await evaluateBookingEligibilityWithExecutor(user, occurrence, db);
      }
      res.json({
        eligible: eligibility.eligible,
        code: eligibility.code,
        message: eligibility.message,
        waitlistAllowed: eligibility.waitlistAllowed,
        bookingOutcome: eligibility.code === "CLASS_FULL_WAITLIST_AVAILABLE" ? "waitlisted" : "confirmed",
        requiresExplicitConfirmation: true,
        currentWaiverAccepted: true,
      });
    } catch (error) {
      safeDatabaseError(res, error, "Unable to check booking eligibility.");
    }
  });

  apiRouter.post("/reservations", requireScope("self:reservation:create"), async (req, res) => {
    const { user, grantId } = delegationContext(res);
    const parsed = confirmedBookingInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "BOOKING_CONFIRMATION_REQUIRED", "A valid class occurrence and explicit confirmation are required.");
    }
    if (!hasDependentBookingScope(delegationContext(res).scopes, parsed.data.minorProfileId)) {
      return sendError(res, 403, "DELEGATION_SCOPE_REQUIRED", "Reading eligible dependents is required to book for a dependent.");
    }
    const clientKey = z.string().uuid().safeParse(req.get("idempotency-key"));
    if (!clientKey.success) {
      return sendError(res, 400, "IDEMPOTENCY_KEY_REQUIRED", "Send a unique UUID in the Idempotency-Key header.");
    }
    try {
      const idempotencyKey = createHash("sha256")
        .update(`member-ai:${grantId}:${clientKey.data}`)
        .digest("hex");
      const result = await storage.reserveClassOccurrence({
        occurrenceId: parsed.data.occurrenceId,
        userId: user.id,
        delegationId: grantId,
        minorProfileId: parsed.data.minorProfileId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || "",
        locale: normalizeLocale(user.locale),
        idempotencyKey,
        source: "member_ai_self_service",
        requireCurrentWaiver: true,
      });
      const confirmed = result.reservation.status === "confirmed";
      res.status(confirmed ? 201 : 202).json({
        reservationId: result.reservation.id,
        occurrenceId: result.occurrence.id,
        status: result.reservation.status,
        waitlistPosition: result.reservation.waitlistPosition,
        start: result.occurrence.start,
        end: result.occurrence.end,
        confirmed,
      });
    } catch (error) {
      if (error instanceof ClassBookingError) {
        return sendError(res, error.status, error.code, error.message);
      }
      safeDatabaseError(res, error, "Unable to create the class reservation.");
    }
  });

  app.use(MEMBER_AI_API_PREFIX, apiRouter);
}