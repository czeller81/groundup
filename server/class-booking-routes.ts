import { createHash, randomBytes } from "crypto";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { ClassBookingError, storage } from "./storage";
import { createPublicRateLimit, requireAuth, requireRole } from "./route-security";
import {
  availableGoogleCalendars,
  CalendarConfigurationError,
  configureGoogleCalendar,
  ensureDefaultClassTypes,
  syncGoogleClassSchedule,
} from "./class-booking-sync";
import { evaluateBookingEligibility, isGirlsClass } from "./member-entitlements";
import { sendClassLifecycleEmail } from "./email";

const reservationSchema = z.object({
  occurrenceId: z.string().uuid(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(30),
  experience: z.string().trim().max(500).optional(),
  locale: z.enum(["en", "es"]).optional(),
}).strict();

const cancelSchema = z.object({
  manageToken: z.string().min(32).max(200).optional(),
  reason: z.string().trim().max(240).optional(),
}).strict();

function hashManageToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function dateRange(req: Request) {
  const now = new Date();
  const from = typeof req.query.from === "string" ? new Date(req.query.from) : now;
  const to = typeof req.query.to === "string"
    ? new Date(req.query.to)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
    throw new ClassBookingError("INVALID_DATE_RANGE", "Choose a valid schedule date range.");
  }
  const maximum = 120 * 24 * 60 * 60 * 1000;
  if (to.getTime() - from.getTime() > maximum) {
    throw new ClassBookingError("DATE_RANGE_TOO_LARGE", "Schedule range cannot exceed 120 days.");
  }
  return { from, to };
}

type PublicOccurrenceSource = Omit<
  Awaited<ReturnType<typeof storage.listClassOccurrences>>[number],
  "confirmedCount" | "waitlistCount"
> & Partial<Pick<Awaited<ReturnType<typeof storage.listClassOccurrences>>[number], "confirmedCount" | "waitlistCount">>;

function publicOccurrence(occurrence: PublicOccurrenceSource) {
  const confirmedCount = occurrence.confirmedCount || 0;
  return {
    id: occurrence.id,
    title: occurrence.title,
    description: occurrence.description,
    start: occurrence.start,
    end: occurrence.end,
    location: occurrence.location,
    instructorName: occurrence.instructorName || occurrence.trainer?.name || null,
    capacity: occurrence.capacity,
    bookable: occurrence.bookingEnabled,
    bookingState: !occurrence.bookingEnabled ? "not_available" : confirmedCount >= occurrence.capacity ? "waitlist" : "available",
    firstVisitEligible: occurrence.firstVisitEligible,
    audience: occurrence.audience,
    audienceGroup: occurrence.audienceGroup,
    girlsClass: isGirlsClass(occurrence),
    canonicalCategory: occurrence.canonicalCategory,
    strengthFocus: occurrence.strengthFocus,
    classType: occurrence.classType ? {
      id: occurrence.classType.id,
      name: occurrence.classType.name,
      canonicalCategory: occurrence.classType.canonicalCategory,
      strengthFocus: occurrence.classType.strengthFocus,
      audienceGroup: occurrence.classType.audienceGroup,
      beginnerFriendly: occurrence.classType.beginnerFriendly,
      membershipRequired: occurrence.classType.membershipRequired,
    } : null,
  };
}

function safeReservation<T extends { manageTokenHash?: string | null }>(reservation: T) {
  const { manageTokenHash: _manageTokenHash, ...safe } = reservation;
  if ("minorProfile" in safe && safe.minorProfile) {
    const profile = safe.minorProfile as { id: string; firstName: string; lastName: string };
    return {
      ...safe,
      minorProfile: { id: profile.id, firstName: profile.firstName, lastName: profile.lastName },
    };
  }
  return safe;
}

function respondError(res: Response, error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ code: "INVALID_REQUEST", message: "Please check the highlighted fields.", errors: error.flatten() });
  }
  if (error instanceof ClassBookingError) {
    return res.status(error.status).json({ code: error.code, message: error.message });
  }
  if (error instanceof CalendarConfigurationError) {
    return res.status(409).json({ code: error.code, message: error.message });
  }
  console.error(error);
  return res.status(500).json({ code: "INTERNAL_ERROR", message: fallback });
}

async function notifyReservation(
  reservation: { visitorEmail: string | null; visitorFirstName: string | null; status: string; waitlistPosition: number | null; locale?: string | null },
  occurrence: { title: string; start: Date },
  status?: "confirmed" | "waitlisted" | "cancelled" | "promoted",
) {
  if (!reservation.visitorEmail) return;
  try {
    await sendClassLifecycleEmail({
      to: reservation.visitorEmail,
      firstName: reservation.visitorFirstName || "there",
      classTitle: occurrence.title,
      startsAt: occurrence.start,
      status: status || (reservation.status === "waitlisted" ? "waitlisted" : "confirmed"),
      waitlistPosition: reservation.waitlistPosition,
      locale: reservation.locale === "es" ? "es" : "en",
    });
  } catch (error) {
    console.error(JSON.stringify({
      event: "class_email_failed",
      reservationStatus: reservation.status,
      error: error instanceof Error ? error.message : "Unknown email error",
    }));
  }
}

export function registerClassBookingRoutes(app: Express) {
  const publicBookingLimit = createPublicRateLimit(10, 15 * 60 * 1000);

  app.get("/api/classes", async (req, res) => {
    try {
      const { from, to } = dateRange(req);
      const occurrences = await storage.listClassOccurrences(from, to, req.query.firstVisit === "true", false, "all");
      const connection = await storage.getCalendarConnection();
      res.json({
        timezone: "America/Los_Angeles",
        source: "google_calendar",
        sync: {
          configured: Boolean(connection?.calendarId),
          healthy: connection?.status === "healthy",
          lastSuccessfulAt: connection?.lastSuccessfulAt || null,
        },
        occurrences: occurrences.map(publicOccurrence),
      });
    } catch (error) {
      respondError(res, error, "Failed to load classes.");
    }
  });

  app.post("/api/classes/reservations", publicBookingLimit, async (req, res) => {
    try {
      const data = reservationSchema.parse(req.body);
      const manageToken = randomBytes(32).toString("base64url");
      const result = await storage.reserveClassOccurrence({
        ...data,
        manageTokenHash: hashManageToken(manageToken),
      });
      void notifyReservation(result.reservation, result.occurrence);
      res.status(201).json({
        reservation: safeReservation(result.reservation),
        occurrence: publicOccurrence({
          ...result.occurrence,
          confirmedCount: result.reservation.status === "waitlisted" ? result.occurrence.capacity : 1,
          trainer: null,
          classType: null,
          canonicalCategory: "LEGACY",
          strengthFocus: null,
          audienceGroup: "ALL",
        }),
        manageToken,
      });
    } catch (error) {
      respondError(res, error, "Failed to reserve this class.");
    }
  });

  app.post("/api/classes/reservations/:id/cancel", publicBookingLimit, async (req, res) => {
    try {
      const data = cancelSchema.parse(req.body);
      if (!data.manageToken) {
        throw new ClassBookingError("MANAGE_TOKEN_REQUIRED", "A reservation management token is required.", 401);
      }
      const existing = await storage.getClassReservation(req.params.id);
      const result = await storage.cancelClassReservation({
        reservationId: req.params.id,
        manageTokenHash: hashManageToken(data.manageToken),
        reason: data.reason,
      });
      if (existing) void notifyReservation(result.reservation, existing.occurrence, "cancelled");
      if (result.promoted && existing) void notifyReservation(result.promoted, existing.occurrence, "promoted");
      res.json(safeReservation(result.reservation));
    } catch (error) {
      respondError(res, error, "Failed to cancel this reservation.");
    }
  });

  app.get("/api/portal/classes", requireAuth, async (req, res) => {
    try {
      const { from, to } = dateRange(req);
      const occurrences = await storage.listClassOccurrences(from, to);
      const user = await storage.getUserById(req.session.userId!);
      res.json(await Promise.all(occurrences.map(async (occurrence) => ({
        ...publicOccurrence(occurrence),
        eligibility: user ? await evaluateBookingEligibility(user, occurrence) : null,
      }))));
    } catch (error) {
      respondError(res, error, "Failed to load classes.");
    }
  });

  app.post("/api/portal/class-reservations", requireAuth, async (req, res) => {
    try {
      const data = z.object({
        occurrenceId: z.string().uuid(),
        minorProfileId: z.string().uuid().optional(),
      }).strict().parse(req.body);
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });
      const result = await storage.reserveClassOccurrence({
        occurrenceId: data.occurrenceId,
        userId: user.id,
        minorProfileId: data.minorProfileId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || "Not provided",
        locale: user.locale === "es" ? "es" : "en",
      });
      void notifyReservation(result.reservation, result.occurrence);
      res.status(201).json(safeReservation(result.reservation));
    } catch (error) {
      respondError(res, error, "Failed to reserve this class.");
    }
  });

  app.get("/api/portal/my-classes", requireAuth, async (req, res) => {
    try {
      const reservations = await storage.getUserClassReservations(req.session.userId!);
      res.json(reservations.map(safeReservation));
    } catch (error) {
      respondError(res, error, "Failed to load your classes.");
    }
  });

  app.post("/api/portal/class-reservations/:id/cancel", requireAuth, async (req, res) => {
    try {
      const data = z.object({ reason: z.string().trim().max(240).optional() }).strict().parse(req.body);
      const existing = await storage.getClassReservation(req.params.id);
      const result = await storage.cancelClassReservation({
        reservationId: req.params.id,
        userId: req.session.userId!,
        reason: data.reason,
      });
      if (existing) void notifyReservation(result.reservation, existing.occurrence, "cancelled");
      if (result.promoted && existing) void notifyReservation(result.promoted, existing.occurrence, "promoted");
      res.json(safeReservation(result.reservation));
    } catch (error) {
      respondError(res, error, "Failed to cancel this reservation.");
    }
  });

  app.get("/api/portal/admin/class-booking/status", requireRole("admin"), async (_req, res) => {
    try {
      res.json({
        connection: await storage.getCalendarConnection(),
        classTypes: await ensureDefaultClassTypes(),
      });
    } catch (error) {
      respondError(res, error, "Failed to load synchronization status.");
    }
  });

  app.get("/api/portal/admin/class-booking/calendars", requireRole("admin"), async (_req, res) => {
    try {
      const calendars = await availableGoogleCalendars();
      res.json(calendars.map(({ id, summary, accessRole, timeZone, primary }) => ({ id, summary, accessRole, timeZone, primary })));
    } catch (error) {
      respondError(res, error, "Google Calendar is connected but its calendars could not be loaded.");
    }
  });

  app.put("/api/portal/admin/class-booking/calendar", requireRole("admin"), async (req, res) => {
    try {
      const { calendarId } = z.object({ calendarId: z.string().min(1).max(500) }).strict().parse(req.body);
      res.json(await configureGoogleCalendar(calendarId));
    } catch (error) {
      respondError(res, error, "Failed to configure Google Calendar.");
    }
  });

  app.post("/api/portal/admin/class-booking/sync", requireRole("admin"), async (_req, res) => {
    try {
      res.json(await syncGoogleClassSchedule());
    } catch (error) {
      respondError(res, error, "Google Calendar synchronization failed. Last-known-good classes remain available.");
    }
  });

  app.get("/api/portal/admin/class-booking/occurrences", requireRole("admin"), async (req, res) => {
    try {
      const { from, to } = dateRange(req);
      res.json(await storage.listClassOccurrences(from, to, false, true));
    } catch (error) {
      respondError(res, error, "Failed to load occurrences.");
    }
  });

  app.patch("/api/portal/admin/class-booking/occurrences/:id", requireRole("admin"), async (req, res) => {
    try {
      const data = z.object({
        classTypeId: z.string().uuid().nullable().optional(),
        trainerId: z.string().uuid().nullable().optional(),
        instructorName: z.string().trim().max(100).nullable().optional(),
        capacity: z.number().int().min(1).max(200).optional(),
        firstVisitEligible: z.boolean().optional(),
        bookingEnabled: z.boolean().optional(),
        audience: z.enum(["all", "members"]).optional(),
      }).strict().parse(req.body);
      if (data.classTypeId) {
        const classType = await storage.getClassType(data.classTypeId);
        if (!classType) return res.status(400).json({ message: "Class type not found." });
      }
      const occurrence = await storage.updateClassOccurrence(req.params.id, {
        ...data,
        syncState: data.classTypeId ? "manual" : undefined,
        syncError: data.classTypeId ? null : undefined,
      });
      if (!occurrence) return res.status(404).json({ message: "Occurrence not found." });
      res.json(occurrence);
    } catch (error) {
      respondError(res, error, "Failed to update occurrence.");
    }
  });

  app.get("/api/portal/admin/class-booking/occurrences/:id/roster", requireRole("admin"), async (req, res) => {
    try {
      const occurrence = await storage.getClassOccurrence(req.params.id);
      if (!occurrence) return res.status(404).json({ message: "Occurrence not found." });
      const roster = await storage.getOccurrenceReservations(occurrence.id);
      res.json({
        confirmed: roster.confirmed.map(safeReservation),
        waitlisted: roster.waitlisted.map(safeReservation),
      });
    } catch (error) {
      respondError(res, error, "Failed to load the class roster.");
    }
  });

  app.patch("/api/portal/admin/class-booking/reservations/:id", requireRole("admin"), async (req, res) => {
    try {
      const data = z.object({
        attendance: z.enum(["PRESENT", "NO_SHOW", "LATE_CANCEL", "EXCUSED", "present", "absent", "late", "excused"]).nullable().optional()
          .transform((value) => value === null || value === undefined ? value : ({
            present: "PRESENT",
            absent: "NO_SHOW",
            late: "LATE_CANCEL",
            excused: "EXCUSED",
          } as Record<string, string>)[value] || value),
        reason: z.string().trim().max(240).optional(),
      }).strict().parse(req.body);
      const reservation = await storage.updateClassReservation(
        req.params.id,
        { attendance: data.attendance },
        req.session.userId,
        data.reason,
      );
      if (!reservation) return res.status(404).json({ message: "Reservation not found." });
      res.json(safeReservation(reservation));
    } catch (error) {
      respondError(res, error, "Failed to update attendance.");
    }
  });
}