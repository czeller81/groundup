import type { Express } from "express";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql, sum } from "drizzle-orm";
import { z } from "zod";
import {
  classOccurrences,
  classReservations,
  classTypes,
  forms,
  formResponses,
  discoveryEntitlements,
  discoveryPasses,
  emergencyContacts,
  entitlementLedger,
  memberAuditEvents,
  memberGoals,
  memberLifecycleEvents,
  memberLifecycles,
  memberships,
  membershipPlans,
  trialLeads,
  users,
} from "@shared/schema";
import { db } from "./db";
import { storage } from "./storage";
import { coachCanManageMember, requireAuth, requireRole } from "./route-security";
import { evaluateBookingEligibility, getMembershipWeekStart } from "./member-entitlements";

const discoveryDurationDays = 7;

function publicPass(pass: typeof discoveryPasses.$inferSelect, entitlements: Array<typeof discoveryEntitlements.$inferSelect>) {
  const statuses = entitlements.map((entitlement) => entitlement.status);
  let displayState = pass.status;
  if (pass.convertedAt) displayState = "CONVERTED";
  else if (pass.expirationTimestamp < new Date() && !statuses.includes("ATTENDED")) displayState = "EXPIRED";
  else if (statuses.every((status) => status === "ATTENDED")) displayState = "COMPLETED";
  else if (statuses.some((status) => status === "BOOKED" || status === "ATTENDED")) {
    displayState = statuses.some((status) => status === "ATTENDED") ? "PARTIALLY_ATTENDED" : "PARTIALLY_BOOKED";
  }
  return { ...pass, displayState, entitlements };
}

async function getPass(userId: string) {
  const [pass] = await db.select().from(discoveryPasses)
    .where(eq(discoveryPasses.userId, userId))
    .orderBy(desc(discoveryPasses.createdAt))
    .limit(1);
  if (!pass) return null;
  const entitlements = await db.select().from(discoveryEntitlements)
    .where(eq(discoveryEntitlements.discoveryPassId, pass.id))
    .orderBy(asc(discoveryEntitlements.category));
  if (pass.expirationTimestamp < new Date() && !pass.convertedAt) {
    await db.transaction(async (tx) => {
      await tx.update(discoveryEntitlements).set({
        status: sql`case when ${discoveryEntitlements.status} = 'AVAILABLE' then 'EXPIRED' else ${discoveryEntitlements.status} end`,
        expiredAt: sql`case when ${discoveryEntitlements.status} = 'AVAILABLE' then now() else ${discoveryEntitlements.expiredAt} end`,
        updatedAt: new Date(),
      }).where(and(
        eq(discoveryEntitlements.discoveryPassId, pass.id),
        eq(discoveryEntitlements.status, "AVAILABLE"),
      ));
      await tx.update(discoveryPasses).set({ status: "EXPIRED", updatedAt: new Date() })
        .where(eq(discoveryPasses.id, pass.id));
    });
    pass.status = "EXPIRED";
    for (const entitlement of entitlements) {
      if (entitlement.status === "AVAILABLE") {
        entitlement.status = "EXPIRED";
        entitlement.expiredAt = new Date();
      }
    }
  }
  return publicPass(pass, entitlements);
}

async function setLifecycle(userId: string, nextState: string, actorId: string | null, reason?: string, source?: string) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(memberLifecycles).where(eq(memberLifecycles.userId, userId));
    const [lifecycle] = existing
      ? await tx.update(memberLifecycles).set({
        currentState: nextState,
        source: source || existing.source,
        convertedAt: nextState === "ACTIVE_MEMBER" ? new Date() : existing.convertedAt,
        updatedAt: new Date(),
      }).where(eq(memberLifecycles.id, existing.id)).returning()
      : await tx.insert(memberLifecycles).values({
        userId,
        currentState: nextState,
        source,
      }).returning();
    await tx.insert(memberLifecycleEvents).values({
      userId,
      actorId,
      previousState: existing?.currentState || null,
      nextState,
      reason: reason || null,
    });
    return lifecycle;
  });
}

async function duplicateDiscoveryReason(userId: string) {
  const user = await storage.getUserById(userId);
  if (!user) return "USER_NOT_FOUND";
  const [existingPass] = await db.select({ id: discoveryPasses.id }).from(discoveryPasses)
    .where(eq(discoveryPasses.userId, userId)).limit(1);
  if (existingPass) return "DISCOVERY_ALREADY_USED";
  const [samePhone] = user.phone
    ? await db.select({ id: users.id }).from(users).where(and(eq(users.phone, user.phone), sql`${users.id} <> ${userId}`)).limit(1)
    : [];
  if (samePhone) return "ADMIN_REVIEW_REQUIRED";
  const [priorReservation] = await db.select({ id: classReservations.id }).from(classReservations)
    .where(or(
      eq(classReservations.userId, userId),
      ilike(classReservations.visitorEmail, user.email),
    )).limit(1);
  if (priorReservation) return "ADMIN_REVIEW_REQUIRED";
  const [priorLead] = await db.select({ id: trialLeads.id }).from(trialLeads)
    .where(ilike(trialLeads.email, user.email)).limit(1);
  if (priorLead) return "ADMIN_REVIEW_REQUIRED";
  return null;
}

async function issueDiscoveryPass(userId: string, actorId: string | null, reason?: string, override = false) {
  const duplicate = await duplicateDiscoveryReason(userId);
  if (duplicate && !override) {
    const error = new Error(duplicate);
    (error as Error & { code?: string }).code = duplicate;
    throw error;
  }
  const now = new Date();
  const expiration = new Date(now.getTime() + discoveryDurationDays * 24 * 60 * 60 * 1000);
  return db.transaction(async (tx) => {
    const [pass] = await tx.insert(discoveryPasses).values({
      userId,
      claimTimestamp: now,
      activationTimestamp: now,
      expirationTimestamp: expiration,
      status: "CLAIMED",
      duplicateCheck: { result: duplicate || "CLEAR", checkedAt: now.toISOString() },
      adminOverrideReason: override ? reason : null,
      createdBy: actorId,
    }).returning();
    await tx.insert(discoveryEntitlements).values([
      { discoveryPassId: pass.id, category: "SKILL", status: "AVAILABLE" },
      { discoveryPassId: pass.id, category: "STRENGTH", status: "AVAILABLE" },
    ]);
    await tx.insert(memberAuditEvents).values({
      actorId,
      userId,
      targetType: "discovery_pass",
      targetId: pass.id,
      action: override ? "discovery_pass_override_issued" : "discovery_pass_claimed",
      after: { expirationTimestamp: expiration.toISOString(), duplicate },
      reason: reason || null,
    });
    return pass;
  });
}

export function registerMemberRoutes(app: Express) {
  app.get("/api/portal/member-program", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUserById(userId);
      if (!user) return res.status(401).json({ code: "USER_NOT_FOUND" });
      const [lifecycle] = await db.select().from(memberLifecycles).where(eq(memberLifecycles.userId, userId));
      const memberRows = await db.select({ membership: memberships, plan: membershipPlans })
        .from(memberships)
        .leftJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
        .where(eq(memberships.userId, userId))
        .orderBy(desc(memberships.startDate));
      const pass = await getPass(userId);
      const activeMembership = memberRows.find(({ membership }) => ["active", "ACTIVE"].includes(membership.status)) || null;
      const effectiveLifecycle = lifecycle || await setLifecycle(
        userId,
        activeMembership ? "ACTIVE_MEMBER" : "PROSPECT",
        null,
        "Deterministic lifecycle default for existing account",
        "system_default",
      );
      let weekly = { weekStart: null as Date | null, reserved: 0, consumed: 0, released: 0, limit: null as number | null };
      if (activeMembership?.plan) {
        const weekStart = getMembershipWeekStart(new Date(), activeMembership.plan.weekStartDay, activeMembership.plan.timezone);
        const [usage] = await db.select({
          reserved: sum(entitlementLedger.reserved),
          consumed: sum(entitlementLedger.consumed),
          released: sum(entitlementLedger.released),
        }).from(entitlementLedger).where(and(
          eq(entitlementLedger.userId, userId),
          eq(entitlementLedger.membershipId, activeMembership.membership.id),
          eq(entitlementLedger.weekStart, weekStart),
        ));
        weekly = {
          weekStart,
          reserved: Number(usage?.reserved || 0),
          consumed: Number(usage?.consumed || 0),
          released: Number(usage?.released || 0),
          limit: activeMembership.plan.weeklySessionLimit,
        };
      }
      res.json({
        lifecycle: effectiveLifecycle,
        membership: activeMembership ? { ...activeMembership.membership, plan: activeMembership.plan } : null,
        memberships: memberRows.map(({ membership, plan }) => ({ ...membership, plan })),
        discoveryPass: pass,
        weekly,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ code: "PROGRAM_LOAD_FAILED", message: "Failed to load your member program." });
    }
  });

  app.get("/api/portal/booking-eligibility/:occurrenceId", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      const occurrence = await storage.getClassOccurrence(req.params.occurrenceId);
      if (!user || !occurrence) return res.status(404).json({ code: "NOT_FOUND" });
      res.json(await evaluateBookingEligibility(user, occurrence));
    } catch (error) {
      res.status(500).json({ code: "ELIGIBILITY_FAILED", message: "Failed to evaluate booking eligibility." });
    }
  });

  app.get("/api/portal/onboarding", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [user] = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        locale: users.locale,
      }).from(users).where(eq(users.id, userId));
      if (!user) return res.status(404).json({ code: "USER_NOT_FOUND" });
      const [lifecycle] = await db.select().from(memberLifecycles).where(eq(memberLifecycles.userId, userId));
      const goals = await db.select().from(memberGoals).where(eq(memberGoals.userId, userId)).orderBy(asc(memberGoals.createdAt));
      const [emergencyContact] = await db.select().from(emergencyContacts).where(eq(emergencyContacts.userId, userId));
      const requiredForms = await db.select({ id: forms.id, title: forms.title, requiredBeforeBooking: forms.requiredBeforeBooking, requiredBeforeAttendance: forms.requiredBeforeAttendance })
        .from(forms).where(eq(forms.isRequired, true));
      const responses = await db.select({ formId: formResponses.formId, status: formResponses.status })
        .from(formResponses).where(eq(formResponses.userId, userId));
      const responseMap = new Map(responses.map((response) => [response.formId, response.status]));
      res.json({
        step: emergencyContact && goals.length ? requiredForms.every((form) => responseMap.get(form.id) === "submitted") ? 5 : 3 : 1,
        user,
        lifecycle: lifecycle || null,
        goals,
        emergencyContact: emergencyContact || null,
        forms: requiredForms.map((form) => ({ ...form, status: responseMap.get(form.id) || "not_started" })),
        discoveryPass: await getPass(userId),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ code: "ONBOARDING_LOAD_FAILED" });
    }
  });

  app.put("/api/portal/onboarding", requireAuth, async (req, res) => {
    try {
      const data = z.object({
        firstName: z.string().trim().min(1).max(80).optional(),
        lastName: z.string().trim().min(1).max(80).optional(),
        phone: z.string().trim().min(7).max(30).nullable().optional(),
        locale: z.enum(["en", "es"]).optional(),
        goals: z.array(z.string().trim().min(1).max(160)).max(10).optional(),
        emergencyContact: z.object({
          name: z.string().trim().min(1).max(120),
          relationship: z.string().trim().min(1).max(80),
          phone: z.string().trim().min(7).max(30),
        }).nullable().optional(),
      }).strict().parse(req.body);
      const userId = req.session.userId!;
      await db.transaction(async (tx) => {
        if (data.firstName || data.lastName || data.phone !== undefined || data.locale) {
          await tx.update(users).set({
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            locale: data.locale,
          }).where(eq(users.id, userId));
        }
        if (data.goals) {
          await tx.delete(memberGoals).where(eq(memberGoals.userId, userId));
          if (data.goals.length) await tx.insert(memberGoals).values(
            Array.from(new Set(data.goals)).map((goal) => ({ userId, goal })),
          );
        }
        if (data.emergencyContact !== undefined) {
          await tx.delete(emergencyContacts).where(eq(emergencyContacts.userId, userId));
          if (data.emergencyContact) {
            await tx.insert(emergencyContacts).values({ userId, ...data.emergencyContact });
          }
        }
        await tx.insert(memberAuditEvents).values({
          actorId: userId,
          userId,
          targetType: "onboarding",
          action: "onboarding_profile_saved",
          after: {
            goalsUpdated: data.goals !== undefined,
            emergencyContactUpdated: data.emergencyContact !== undefined,
          },
        });
      });
      res.json({ ok: true });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ code: "INVALID_REQUEST", errors: error.flatten() });
      res.status(500).json({ code: "ONBOARDING_SAVE_FAILED" });
    }
  });

  app.post("/api/portal/discovery/claim", requireAuth, async (req, res) => {
    try {
      const pass = await issueDiscoveryPass(req.session.userId!, req.session.userId!);
      await setLifecycle(req.session.userId!, "DISCOVERY_PASS", req.session.userId!, "Discovery Pass claimed", "member_claim");
      res.status(201).json(await getPass(req.session.userId!));
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      if (code === "DISCOVERY_ALREADY_USED" || code === "ADMIN_REVIEW_REQUIRED") {
        return res.status(409).json({ code, message: code === "DISCOVERY_ALREADY_USED" ? "You have already used a Discovery Pass." : "An admin review is required before another pass can be issued." });
      }
      console.error(error);
      res.status(500).json({ code: "DISCOVERY_CLAIM_FAILED", message: "Failed to claim your Discovery Pass." });
    }
  });

  app.get("/api/portal/admin/membership-plans", requireRole("admin"), async (_req, res) => {
    res.json(await db.select().from(membershipPlans).orderBy(asc(membershipPlans.displayName)));
  });

  app.post("/api/portal/admin/membership-plans", requireRole("admin"), async (req, res) => {
    try {
      const data = z.object({
        internalKey: z.string().trim().min(2).max(80),
        displayName: z.string().trim().min(2).max(120),
        active: z.boolean().optional(),
        weeklySessionLimit: z.number().int().nonnegative().nullable().optional(),
        eligibleClassCategories: z.array(z.string().min(1)).optional(),
        bookingWindowHours: z.number().int().positive().max(8760).optional(),
        weekStartDay: z.number().int().min(0).max(6).optional(),
        timezone: z.string().min(1).max(80).optional(),
        waitlistAllowed: z.boolean().optional(),
        cancellationCutoffHours: z.number().int().nonnegative().max(168).optional(),
        lateCancelPolicy: z.string().min(1).max(40).optional(),
        noShowPolicy: z.string().min(1).max(40).optional(),
        privateSessionsPerMonth: z.number().int().nonnegative().optional(),
        personalizedProgram: z.boolean().optional(),
        displayPriceCents: z.number().int().nonnegative().nullable().optional(),
      }).strict().parse(req.body);
      const [plan] = await db.insert(membershipPlans).values(data).returning();
      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ code: "INVALID_REQUEST", errors: error.flatten() });
      res.status(409).json({ code: "PLAN_CREATE_FAILED", message: "Could not create membership plan." });
    }
  });

  app.patch("/api/portal/admin/membership-plans/:id", requireRole("admin"), async (req, res) => {
    try {
      const data = z.object({
        displayName: z.string().trim().min(2).max(120).optional(),
        active: z.boolean().optional(),
        weeklySessionLimit: z.number().int().nonnegative().nullable().optional(),
        eligibleClassCategories: z.array(z.string().min(1)).optional(),
        bookingWindowHours: z.number().int().positive().max(8760).optional(),
        waitlistAllowed: z.boolean().optional(),
        cancellationCutoffHours: z.number().int().nonnegative().max(168).optional(),
        lateCancelPolicy: z.string().min(1).max(40).optional(),
        noShowPolicy: z.string().min(1).max(40).optional(),
        privateSessionsPerMonth: z.number().int().nonnegative().optional(),
        personalizedProgram: z.boolean().optional(),
        displayPriceCents: z.number().int().nonnegative().nullable().optional(),
      }).strict().parse(req.body);
      const [plan] = await db.update(membershipPlans).set({ ...data, updatedAt: new Date() })
        .where(eq(membershipPlans.id, req.params.id)).returning();
      if (!plan) return res.status(404).json({ code: "PLAN_NOT_FOUND" });
      res.json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ code: "INVALID_REQUEST", errors: error.flatten() });
      res.status(500).json({ code: "PLAN_UPDATE_FAILED" });
    }
  });

  app.post("/api/portal/admin/discovery/:userId/issue", requireRole("admin"), async (req, res) => {
    try {
      const data = z.object({ reason: z.string().trim().min(5).max(500).optional(), override: z.boolean().default(false) }).strict().parse(req.body);
      const pass = await issueDiscoveryPass(req.params.userId, req.session.userId!, data.reason, data.override);
      await setLifecycle(req.params.userId, "DISCOVERY_PASS", req.session.userId!, data.reason || "Admin issued Discovery Pass", "admin_issue");
      res.status(201).json(await getPass(req.params.userId));
      void pass;
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      if (code === "DISCOVERY_ALREADY_USED" || code === "ADMIN_REVIEW_REQUIRED") return res.status(409).json({ code, message: "A Discovery Pass already exists or requires admin review." });
      if (error instanceof z.ZodError) return res.status(400).json({ code: "INVALID_REQUEST", errors: error.flatten() });
      res.status(500).json({ code: "DISCOVERY_ISSUE_FAILED" });
    }
  });

  app.patch("/api/portal/admin/discovery/:passId", requireRole("admin"), async (req, res) => {
    try {
      const data = z.object({
        action: z.enum(["extend", "cancel", "convert", "follow_up", "restore"]),
        reason: z.string().trim().min(5).max(500),
        category: z.enum(["SKILL", "STRENGTH"]).optional(),
        days: z.number().int().positive().max(90).optional(),
        followUpState: z.string().trim().min(1).max(80).optional(),
      }).strict().parse(req.body);
      const [before] = await db.select().from(discoveryPasses).where(eq(discoveryPasses.id, req.params.passId));
      if (!before) return res.status(404).json({ code: "DISCOVERY_NOT_FOUND" });
      const updated = await db.transaction(async (tx) => {
        if (data.action === "restore") {
          if (!data.category) throw new Error("CATEGORY_REQUIRED");
          const [entitlement] = await tx.select().from(discoveryEntitlements).where(and(
            eq(discoveryEntitlements.discoveryPassId, before.id),
            eq(discoveryEntitlements.category, data.category),
          ));
          if (!entitlement) throw new Error("ENTITLEMENT_NOT_FOUND");
          await tx.update(discoveryEntitlements).set({
            status: "AVAILABLE",
            reservationId: null,
            cancelledAt: null,
            expiredAt: null,
            updatedAt: new Date(),
          }).where(eq(discoveryEntitlements.id, entitlement.id));
        }
        const [pass] = await tx.update(discoveryPasses).set({
          expirationTimestamp: data.action === "extend"
            ? new Date(before.expirationTimestamp.getTime() + (data.days || discoveryDurationDays) * 24 * 60 * 60 * 1000)
            : before.expirationTimestamp,
          status: data.action === "cancel" ? "CANCELLED" : data.action === "convert" ? "CONVERTED" : before.status,
          convertedAt: data.action === "convert" ? new Date() : before.convertedAt,
          followUpState: data.action === "follow_up" ? data.followUpState || "PENDING" : before.followUpState,
          updatedAt: new Date(),
        }).where(eq(discoveryPasses.id, before.id)).returning();
        await tx.insert(memberAuditEvents).values({
          actorId: req.session.userId!,
          userId: before.userId,
          targetType: "discovery_pass",
          targetId: before.id,
          action: `discovery_${data.action}`,
          before: { status: before.status, expirationTimestamp: before.expirationTimestamp.toISOString() },
          after: { status: pass.status, expirationTimestamp: pass.expirationTimestamp.toISOString(), category: data.category },
          reason: data.reason,
        });
        return pass;
      });
      if (data.action === "convert") {
        await setLifecycle(before.userId, "ACTIVE_MEMBER", req.session.userId!, data.reason, "discovery_conversion");
      }
      res.json(await getPass(updated.userId));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ code: "INVALID_REQUEST", errors: error.flatten() });
      if ((error as Error).message === "CATEGORY_REQUIRED") return res.status(400).json({ code: "CATEGORY_REQUIRED" });
      res.status(500).json({ code: "DISCOVERY_UPDATE_FAILED" });
    }
  });

  app.get("/api/portal/coach/members/:userId/program", requireRole("admin", "coach"), async (req, res) => {
    try {
      const member = await storage.getUserById(req.params.userId);
      if (!member || (req.session.userRole === "coach" && !coachCanManageMember(member, req.session.userId))) {
        return res.status(404).json({ code: "MEMBER_NOT_FOUND" });
      }
      const [lifecycle] = await db.select().from(memberLifecycles).where(eq(memberLifecycles.userId, member.id));
      const goals = await db.select().from(memberGoals).where(eq(memberGoals.userId, member.id));
      const [contact] = await db.select().from(emergencyContacts).where(eq(emergencyContacts.userId, member.id));
      const recentAttendance = await db.select({
        reservation: classReservations,
        occurrence: classOccurrences,
      }).from(classReservations)
        .innerJoin(classOccurrences, eq(classReservations.occurrenceId, classOccurrences.id))
        .where(and(eq(classReservations.userId, member.id), sql`${classReservations.attendance} is not null`))
        .orderBy(desc(classOccurrences.start)).limit(10);
      res.json({
        member: { id: member.id, firstName: member.firstName, lastName: member.lastName, email: member.email, locale: member.locale },
        lifecycle: lifecycle || null,
        goals,
        emergencyContact: contact || null,
        discoveryPass: await getPass(member.id),
        recentAttendance,
        sessionNotes: await storage.getSessionNotes(member.id),
      });
    } catch (error) {
      res.status(500).json({ code: "COACH_PROGRAM_LOAD_FAILED" });
    }
  });

  app.patch("/api/portal/admin/class-booking/reservations/:id/attendance", requireRole("admin", "coach"), async (req, res) => {
    try {
      const data = z.object({
        attendance: z.enum(["PRESENT", "NO_SHOW", "LATE_CANCEL", "EXCUSED", ""]).transform((value) => value || null),
        reason: z.string().trim().max(500).optional(),
      }).strict().parse(req.body);
      const existing = await storage.getClassReservation(req.params.id);
      if (!existing) return res.status(404).json({ code: "RESERVATION_NOT_FOUND" });
      if (req.session.userRole === "coach" && !coachCanManageMember(await storage.getUserById(existing.userId || ""), req.session.userId)) {
        return res.status(404).json({ code: "RESERVATION_NOT_FOUND" });
      }
      const reservation = await storage.updateClassReservation(req.params.id, { attendance: data.attendance }, req.session.userId, data.reason);
      res.json(reservation);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ code: "INVALID_REQUEST", errors: error.flatten() });
      res.status(500).json({ code: "ATTENDANCE_UPDATE_FAILED" });
    }
  });
}