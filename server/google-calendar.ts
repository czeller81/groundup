import { ReplitConnectors } from "@replit/connectors-sdk";

export const GROUND_UP_TIMEZONE = "America/Los_Angeles";
export const GOOGLE_SYNC_WINDOW_DAYS = 90;

type GoogleDateValue = {
  dateTime?: string;
  date?: string;
  timeZone?: string;
};

export type GoogleCalendarEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: GoogleDateValue;
  end?: GoogleDateValue;
  updated?: string;
  recurringEventId?: string;
  originalStartTime?: GoogleDateValue;
};

export type GoogleCalendarSummary = {
  id: string;
  summary?: string;
  description?: string;
  primary?: boolean;
  accessRole?: string;
  timeZone?: string;
};

type GoogleListResponse<T> = {
  items?: T[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

function googleProxy() {
  // Construct a fresh client per operation so token refresh is always handled
  // by the Replit connector instead of being cached in application memory.
  return new ReplitConnectors();
}

async function googleRequest<T>(path: string): Promise<T> {
  const response = await googleProxy().proxy("google-calendar", `/calendar/v3${path}`, {
    method: "GET",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google Calendar returned HTTP ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ""}`);
  }
  return response.json() as Promise<T>;
}

export async function listGoogleCalendars(): Promise<GoogleCalendarSummary[]> {
  const calendars: GoogleCalendarSummary[] = [];
  let pageToken: string | undefined;
  do {
    const query = new URLSearchParams({ maxResults: "250" });
    if (pageToken) query.set("pageToken", pageToken);
    const result = await googleRequest<GoogleListResponse<GoogleCalendarSummary>>(
      `/users/me/calendarList?${query.toString()}`,
    );
    calendars.push(...(result.items || []));
    pageToken = result.nextPageToken;
  } while (pageToken);
  return calendars;
}

export async function listGoogleEvents(
  calendarId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<{ events: GoogleCalendarEvent[]; nextSyncToken?: string }> {
  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  do {
    const query = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      timeZone: GROUND_UP_TIMEZONE,
      singleEvents: "true",
      orderBy: "startTime",
      showDeleted: "true",
      maxResults: "2500",
    });
    if (pageToken) query.set("pageToken", pageToken);
    const result = await googleRequest<GoogleListResponse<GoogleCalendarEvent>>(
      `/calendars/${encodeURIComponent(calendarId)}/events?${query.toString()}`,
    );
    events.push(...(result.items || []));
    pageToken = result.nextPageToken;
    nextSyncToken = result.nextSyncToken;
  } while (pageToken);
  return { events, nextSyncToken };
}

export function googleDateToDate(value?: GoogleDateValue): Date | null {
  if (!value) return null;
  if (value.dateTime) {
    const date = new Date(value.dateTime);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (value.date) {
    const date = new Date(`${value.date}T00:00:00-07:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function sanitizeCalendarText(value?: string | null, maxLength = 1000): string | null {
  if (!value) return null;
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength) || null;
}

export function googleEventTimes(event: GoogleCalendarEvent): { start: Date; end: Date } | null {
  const start = googleDateToDate(event.start);
  const end = googleDateToDate(event.end);
  if (!start || !end || end <= start) return null;
  return { start, end };
}