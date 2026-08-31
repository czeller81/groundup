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

export class CalendarConfigurationError extends Error {
  code = "GOOGLE_CALENDAR_NOT_CONFIGURED";
}

const DEFAULT_CLASS_TYPES = [
  {
    name: "Women's Jiu-Jitsu",
    description: "Beginner-friendly women-focused jiu-jitsu class.",
    category: "jiu-jitsu",
    matchPattern: "women",
    defaultCapacity: 6,
    beginnerFriendly: true,
    firstVisitEligible: true,
    defaultTrainerId: null,
    membershipRequired: false,
    active: true,
    bookingEnabled: true,
  },
  {
    name: "Adult Jiu-Jitsu",
    description: "Adult jiu-jitsu class.",
    category: "jiu-jitsu",
    matchPattern: "adult",
    defaultCapacity: 6,
    beginnerFriendly: true,
    firstVisitEligible: true,
    defaultTrainerId: null,
    membershipRequired: false,
    active: true,
    bookingEnabled: true,
  },
  {
    name: "Kids Jiu-Jitsu",
    description: "Youth jiu-jitsu class.",
    category: "jiu-jitsu",
    matchPattern: "kids",
    defaultCapacity: 6,
    beginnerFriendly: true,
    firstVisitEligible: true,
    defaultTrainerId: null,
    membershipRequired: false,
    active: true,
    bookingEnabled: true,
  },
  {
    name: "Strength & Conditioning",
    description: "Strength and conditioning class.",
    category: "fitness",
    matchPattern: "strength",
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
  if (types.length) return types;
  for (const classType of DEFAULT_CLASS_TYPES) {
    await storage.createClassType(classType);
  }
  types = await storage.getClassTypes();
  return types;
}

function matchClassType(title: string, classTypes: ClassType[]): ClassType | undefined {
  const normalized = title.toLowerCase();
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

export async function syncGoogleClassSchedule(now = new Date()) {
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
    const { events, nextSyncToken } = await listGoogleEvents(connection.calendarId, from, to);
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
      const originalStart = googleDateToDate(event.originalStartTime);
      await storage.upsertClassOccurrence({
        calendarConnectionId: connection.id,
        googleCalendarId: connection.calendarId,
        googleEventId: event.id,
        googleRecurringEventId: event.recurringEventId || null,
        googleOriginalStartTime: originalStart,
        title,
        description: sanitizeCalendarText(event.description),
        start: times.start,
        end: times.end,
        location: sanitizeCalendarText(event.location, 300),
        instructorName: preserveManual ? existing.instructorName : null,
        trainerId: preserveManual ? existing.trainerId : (classType?.defaultTrainerId || null),
        classTypeId: classType?.id || null,
        status: "active",
        syncState: preserveManual ? "manual" : classType ? "synced" : "unmapped",
        syncError: classType ? null : "No class type mapping matched this Google event title.",
        capacity: preserveManual ? existing.capacity : (classType?.defaultCapacity || 6),
        firstVisitEligible: preserveManual ? existing.firstVisitEligible : (classType?.firstVisitEligible || false),
        bookingEnabled: preserveManual ? existing.bookingEnabled : Boolean(classType?.bookingEnabled),
        audience: preserveManual ? existing.audience : classType?.membershipRequired ? "members" : "all",
        remoteUpdatedAt: event.updated ? new Date(event.updated) : null,
        lastSyncedAt: now,
      });
      classType ? synced++ : unmapped++;
    }

    const removed = await storage.reconcileMissingClassOccurrences(connection.calendarId, from, to, seenEventIds);
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
      removed,
    }));
    return { received: events.length, synced, unmapped, cancelled, removed, from, to };
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

function stripOccurrenceIdentity(occurrence: ClassOccurrence): Omit<ClassOccurrence, "id" | "createdAt" | "updatedAt"> {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...data } = occurrence;
  return data;
}