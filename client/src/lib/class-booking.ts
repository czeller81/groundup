import type { Locale } from "./locale";

export type LiveClass = {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  location: string | null;
  instructorName: string | null;
  capacity: number;
  confirmedCount: number;
  waitlistCount: number;
  spotsRemaining: number;
  bookingState: "available" | "waitlist";
  firstVisitEligible: boolean;
  audience: "all" | "members";
  classType: {
    id: string;
    name: string;
    beginnerFriendly: boolean;
    membershipRequired: boolean;
  } | null;
};

export type ClassScheduleResponse = {
  timezone: string;
  source: "google_calendar";
  sync: {
    configured: boolean;
    healthy: boolean;
    lastSuccessfulAt: string | null;
  };
  occurrences: LiveClass[];
};

export function classDateLabel(value: string, locale: Locale = "en") {
  return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function classTimeLabel(start: string, end: string, locale: Locale = "en") {
  const formatter = new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${formatter.format(new Date(start))}–${formatter.format(new Date(end))}`;
}