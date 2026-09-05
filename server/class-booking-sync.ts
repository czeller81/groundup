import type { ClassOccurrence, ClassType } from "@shared/schema";
import { storage } from "./storage";
import {
  GOOGLE_SYNC_WINDOW_DAYS,
  GROUND_UP_TIMEZONE,
  googleDateToDate,
  googleEventTimes,
  listGoogleCalendars,
  listGoogleEvents,
  sanitizeCalendarText,
} from "./google-calendar";
import { sendClassLifecycleEmail } from "./email";

export class CalendarConfigurationError extends Error {
  code = "GOOGLE_CALENDAR_NOT_CONFIGURED";
}

export const FINAL_SCHEDULE_TAXONOMY = {
  adultSkill: "JIU_JITSU_SELF_DEFENSE",
  girlsSkill: "GIRLS_JIU_JITSU_SELF_DEFENSE",
  strength: "STRENGTH_CONDITIONING",
  lowerBody: "LOWER_BODY",
  upperBodyCore: "UPPER_BODY_CORE",
  fullBody: "FULL_BODY",
} as const;

export const FINAL_WEEKLY_SCHEDULE = [
  { day: "Monday", time: "17:00", durationMinutes: 55, canonicalCategory: FINAL_SCHEDULE_TAXONOMY.adultSkill },
  { day: "Monday", time: "18:00", durationMinutes: 55, canonicalCategory: FINAL_SCHEDULE_TAXONOMY.strength, strengthFocus: FINAL_SCHEDULE_TAXONOMY.lowerBody },
  { day: "Tuesday", time: "16:15", durationMinutes: 45, canonicalCategory: FINAL_SCHEDULE_TAXONOMY.girlsSkill },
  { day: "Tuesday", time: "17:00", durationMinutes: 55, canonicalCategory: FINAL_SCHEDULE_TAXONOMY.adultSkill },
  { day: "Tuesday", time: "18:00", durationMinutes: 55, canonicalCategory: FINAL_SCHEDULE_TAXONOMY.strength, strengthFocus: FINAL_SCHEDULE_TAXONOMY.upperBodyCore },
  { day: "Wednesday", time: "17:00", durationMinutes: 55, canonicalCategory: FINAL_SCHEDULE_TAXONOMY.adultSkill },
  { day: "Wednesday", time: "18:00", durationMinutes: 55, canonicalCategory: FINAL_SCHEDULE_TAXONOMY.strength, strengthFocus: FINAL_SCHEDULE_TAXONOMY.lowerBody },
  { day: "Thursday", time: "16:15", durationMinutes: 45, canonicalCategory: FINAL_SCHEDULE_TAXONOMY.girlsSkill },
  { day: "Thursday", time: "17:00", durationMinutes: 55, canonicalCategory: FINAL_SCHEDULE_TAXONOMY.adultSkill },
  { day: "Thursday", time: "18:00", durationMinutes: 55, canonicalCategory: FINAL_SCHEDULE_TAXONOMY.strength, strengthFocus: FINAL_SCHEDULE_TAXONOMY.upperBodyCore },
  { day: "Friday", time: "17:00", durationMinutes: 55, canonicalCategory: FINAL_SCHEDULE_TAXONOMY.adultSkill },
  { day: "Friday", time: "18:00", durationMinutes: 55, canonicalCategory: FINAL_SCHEDULE_TAXONOMY.strength, strengthFocus: FINAL_SCHEDULE_TAXONOMY.fullBody },
  { day: "Saturday", time: "09:00", durationMinutes: 55, canonicalCategory: FINAL_SCHEDULE_TAXONOMY.strength, strengthFocus: FINAL_SCHEDULE_TAXONOMY.fullBody },
] as const;

const CANONICAL_CLASS_TYPES = [
  {
    name: "Jiu-Jitsu / Self-Defense",
    description: "Adult women’s jiu-jitsu and practical self-defense.",
    category: "skill",
    canonicalCategory: FINAL_SCHEDULE_TAXONOMY.adultSkill,
    strengthFocus: null,
    audienceGroup: "ADULT_WOMEN",
    matchPattern: "ground up — jiu-jitsu / self-defense",
    defaultCapacity: 6,
    beginnerFriendly: true,
    firstVisitEligible: true,
    defaultTrainerId: null,
    membershipRequired: false,
    active: true,
    bookingEnabled: true,
  },
  {
    name: "Girls’ Jiu-Jitsu / Self-Defense",
    description: "Girls’ jiu-jitsu and practical self-defense. Guardian workflow required before booking.",
    category: "girls-skill",
    canonicalCategory: FINAL_SCHEDULE_TAXONOMY.girlsSkill,
    strengthFocus: null,
    audienceGroup: "FEMALE_YOUTH",
    matchPattern: "ground up — girls’ jiu-jitsu / self-defense",
    defaultCapacity: 6,
    beginnerFriendly: true,
    firstVisitEligible: false,
    defaultTrainerId: null,
    membershipRequired: true,
    active: true,
    bookingEnabled: false,
  },
  {
    name: "Strength & Conditioning — Lower Body",
    description: "Strength and conditioning with a lower-body focus.",
    category: "strength",
    canonicalCategory: FINAL_SCHEDULE_TAXONOMY.strength,
    strengthFocus: FINAL_SCHEDULE_TAXONOMY.lowerBody,
    audienceGroup: "ADULT_WOMEN",
    matchPattern: "strength & conditioning — lower body",
    defaultCapacity: 6,
    beginnerFriendly: true,
    firstVisitEligible: true,
    defaultTrainerId: null,
    membershipRequired: false,
    active: true,
    bookingEnabled: true,
  },
  {
    name: "Strength & Conditioning — Upper Body + Core",
    description: "Strength and conditioning with an upper-body and core focus.",
    category: "strength",
    canonicalCategory: FINAL_SCHEDULE_TAXONOMY.strength,
    strengthFocus: FINAL_SCHEDULE_TAXONOMY.upperBodyCore,
    audienceGroup: "ADULT_WOMEN",
    matchPattern: "strength & conditioning — upper body + core",
    defaultCapacity: 6,
    beginnerFriendly: true,
    firstVisitEligible: true,
    defaultTrainerId: null,
    membershipRequired: false,
    active: true,
    bookingEnabled: true,
  },
  {
    name: "Strength & Conditioning — Full Body",
    description: "Strength and conditioning with a full-body focus.",
    category: "strength",
    canonicalCategory: FINAL_SCHEDULE_TAXONOMY.strength,
    strengthFocus: FINAL_SCHEDULE_TAXONOMY.fullBody,
    audienceGroup: "ADULT_WOMEN",
    matchPattern: "strength & conditioning — full body",
    defaultCapacity: 6,
    beginnerFriendly: true,
    firstVisitEligible: true,
    defaultTrainerId: null,
    membershipRequired: false,
    active: true,
    bookingEnabled: true,
  },
] satisfies Array<Omit<ClassType, "id" | "createdAt" | "updatedAt">>;

export async function ensureDefaultClassTypes(): Promise<ClassType[]> {
  let types = await storage.getClassTypes();
  for (const classType of CANONICAL_CLASS_TYPES) {
    const existing = types.find((candidate) => candidate.name === classType.name);
    if (existing) {
      await storage.updateClassType(existing.id, {
        canonicalCategory: classType.canonicalCategory,
        strengthFocus: classType.strengthFocus || null,
        audienceGroup: classType.audienceGroup,
        category: classType.category,
        matchPattern: classType.matchPattern,
        bookingEnabled: classType.bookingEnabled,
        firstVisitEligible: classType.firstVisitEligible,
        membershipRequired: classType.membershipRequired,
      });
    } else {
      await storage.createClassType(classType);
    }
  }
  types = await storage.getClassTypes();
  return types;
}

function normalizedTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[—–-]/g, " ")
    .replace(/[\/+&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchClassType(title: string, classTypes: ClassType[]): ClassType | undefined {
  const normalized = normalizedTitle(title);
  const canonical = classTypes.filter((classType) => classType.active && classType.canonicalCategory !== "LEGACY");
  if (normalized.includes("girls") || normalized.includes("girl")) {
    return canonical.find((classType) => classType.canonicalCategory === FINAL_SCHEDULE_TAXONOMY.girlsSkill);
  }
  if (normalized.includes("strength") || normalized.includes("conditioning")) {
    const strength = canonical.filter((classType) => classType.canonicalCategory === FINAL_SCHEDULE_TAXONOMY.strength);
    if (normalized.includes("lower body")) return strength.find((classType) => classType.strengthFocus === FINAL_SCHEDULE_TAXONOMY.lowerBody);
    if (normalized.includes("upper body") || normalized.includes("core")) return strength.find((classType) => classType.strengthFocus === FINAL_SCHEDULE_TAXONOMY.upperBodyCore);
    if (normalized.includes("full body")) return strength.find((classType) => classType.strengthFocus === FINAL_SCHEDULE_TAXONOMY.fullBody);
  }
  if (normalized.includes("self defense") && !normalized.includes("girls")) {
    return canonical.find((classType) => classType.canonicalCategory === FINAL_SCHEDULE_TAXONOMY.adultSkill);
  }
  return classTypes.find((classType) => {
    if (!classType.active) return false;
    const pattern = (classType.matchPattern || classType.name).trim().toLowerCase();
    return pattern.length > 0 && normalized.includes(pattern);
  });
}

export async function availableGoogleCalendars() {
  return listGoogleCalendars();
}

export async function configureGoogleCalendar(calendarId: string) {
  const calendars = await listGoogleCalendars();
  const calendar = calendars.find((candidate) => candidate.id === calendarId);
  if (!calendar) throw new CalendarConfigurationError("Selected calendar is not available to this connection.");
  if (!["owner", "writer", "reader"].includes(calendar.accessRole || "")) {
    throw new CalendarConfigurationError("Selected calendar cannot be read by this connection.");
  }
  return storage.saveCalendarConnection({
    provider: "google",
    calendarId: calendar.id,
    calendarName: calendar.summary || calendar.id,
    timezone: calendar.timeZone || GROUND_UP_TIMEZONE,
    status: "configured",
    lastError: null,
  });
}

export async function syncGoogleClassSchedule(
  now = new Date(),
  providerFixture?: { events: import("./google-calendar").GoogleCalendarEvent[]; nextSyncToken?: string },
) {
  const connection = await storage.getCalendarConnection();
  if (!connection?.calendarId) {
    throw new CalendarConfigurationError("Choose an approved Google Calendar before synchronizing classes.");
  }
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + GOOGLE_SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  await storage.saveCalendarConnection({
    lastAttemptedAt: now,
    status: "syncing",
    lastError: null,
  });

  try {
    const classTypes = await ensureDefaultClassTypes();
    const { events, nextSyncToken } = providerFixture || await listGoogleEvents(connection.calendarId, from, to);
    const seenEventIds: string[] = [];
    let synced = 0;
    let cancelled = 0;
    let unmapped = 0;

    for (const event of events) {
      if (!event.id) continue;
      seenEventIds.push(event.id);
      if (event.status === "cancelled") {
        const existing = await storage.getClassOccurrenceByGoogleEvent(connection.calendarId, event.id);
        if (existing) {
          await storage.upsertClassOccurrence({
            ...stripOccurrenceIdentity(existing),
            status: "cancelled",
            bookingEnabled: false,
            syncState: "synced",
            syncError: null,
            lastSyncedAt: now,
          });
          const reservations = await storage.cancelOccurrenceReservations(existing.id, "The class was cancelled on the academy calendar.");
          for (const reservation of reservations) {
            void sendCancellationEmail(reservation, existing);
          }
          cancelled += 1;
        }
        continue;
      }

      const times = googleEventTimes(event);
      if (!times) continue;
      const title = sanitizeCalendarText(event.summary, 200) || "Untitled class";
      const existing = await storage.getClassOccurrenceByGoogleEvent(connection.calendarId, event.id);
      const mappedType = existing?.syncState === "manual" && existing.classTypeId
        ? classTypes.find((candidate) => candidate.id === existing.classTypeId)
        : undefined;
      const classType = mappedType || matchClassType(title, classTypes);
      const preserveManual = existing?.syncState === "manual";
      const preserveHistory = Boolean(existing && times.start < now);
      const originalStart = googleDateToDate(event.originalStartTime);
      await storage.upsertClassOccurrence({
        calendarConnectionId: connection.id,
        googleCalendarId: connection.calendarId,
        googleEventId: event.id,
        googleRecurringEventId: event.recurringEventId || null,
        googleOriginalStartTime: originalStart,
        title: preserveHistory ? existing!.title : title,
        description: preserveHistory ? existing!.description : sanitizeCalendarText(event.description),
        start: preserveHistory ? existing!.start : times.start,
        end: preserveHistory ? existing!.end : times.end,
        location: preserveHistory ? existing!.location : sanitizeCalendarText(event.location, 300),
        instructorName: preserveHistory || preserveManual ? existing!.instructorName : null,
        trainerId: preserveHistory || preserveManual ? existing!.trainerId : (classType?.defaultTrainerId || null),
        classTypeId: preserveHistory ? existing!.classTypeId : classType?.id || null,
        canonicalCategory: preserveHistory ? existing!.canonicalCategory : classType?.canonicalCategory || "LEGACY",
        strengthFocus: preserveHistory ? existing!.strengthFocus : classType?.strengthFocus || null,
        audienceGroup: preserveHistory ? existing!.audienceGroup : classType?.audienceGroup || "ALL",
        status: preserveHistory ? existing!.status : "active",
        syncState: preserveHistory ? existing!.syncState : preserveManual ? "manual" : classType ? "synced" : "unmapped",
        syncError: preserveHistory ? existing!.syncError : classType ? null : "No class type mapping matched this Google event title.",
        capacity: preserveHistory || preserveManual ? existing!.capacity : (classType?.defaultCapacity || 6),
        firstVisitEligible: preserveHistory || preserveManual ? existing!.firstVisitEligible : (classType?.firstVisitEligible || false),
        bookingEnabled: preserveHistory || preserveManual ? existing!.bookingEnabled : Boolean(classType?.bookingEnabled),
        audience: preserveHistory || preserveManual ? existing!.audience : "all",
        remoteUpdatedAt: event.updated ? new Date(event.updated) : null,
        lastSyncedAt: now,
      });
      classType ? synced++ : unmapped++;
    }

    const removedOccurrences = await storage.reconcileMissingClassOccurrences(connection.calendarId, from, to, seenEventIds);
    for (const occurrence of removedOccurrences) {
      const reservations = await storage.cancelOccurrenceReservations(occurrence.id, "The class was removed from the academy calendar.");
      for (const reservation of reservations) {
        void sendCancellationEmail(reservation, occurrence);
      }
    }
    await storage.saveCalendarConnection({
      status: "healthy",
      lastSuccessfulAt: new Date(),
      lastSyncedEventCount: events.length,
      lastError: null,
      syncToken: nextSyncToken,
    });
    console.info(JSON.stringify({
      event: "google_calendar_sync_completed",
      calendarId: connection.calendarId,
      received: events.length,
      synced,
      unmapped,
      cancelled,
      removed: removedOccurrences.length,
    }));
    return { received: events.length, synced, unmapped, cancelled, removed: removedOccurrences.length, from, to };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Google Calendar synchronization error";
    await storage.saveCalendarConnection({
      status: "error",
      lastError: message.slice(0, 500),
    });
    console.error(JSON.stringify({ event: "google_calendar_sync_failed", message }));
    throw error;
  }
}

async function sendCancellationEmail(
  reservation: { visitorEmail: string | null; visitorFirstName: string | null; waitlistPosition: number | null; locale?: string | null },
  occurrence: { title: string; start: Date },
) {
  if (!reservation.visitorEmail) return;
  try {
    await sendClassLifecycleEmail({
      to: reservation.visitorEmail,
      firstName: reservation.visitorFirstName || "there",
      classTitle: occurrence.title,
      startsAt: occurrence.start,
      status: "cancelled",
      waitlistPosition: reservation.waitlistPosition,
      locale: reservation.locale === "es" ? "es" : "en",
    });
  } catch (error) {
    console.error(JSON.stringify({
      event: "class_cancellation_email_failed",
      error: error instanceof Error ? error.message : "Unknown email error",
    }));
  }
}

function stripOccurrenceIdentity(occurrence: ClassOccurrence): Omit<ClassOccurrence, "id" | "createdAt" | "updatedAt"> {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...data } = occurrence;
  return data;
}