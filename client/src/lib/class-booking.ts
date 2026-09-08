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
  bookable: boolean;
  bookingState: "available" | "waitlist" | "not_available";
  firstVisitEligible: boolean;
  audience: "all" | "members";
  audienceGroup: string;
  girlsClass?: boolean;
  canonicalCategory: string;
  strengthFocus: string | null;
  eligibility?: {
    eligible: boolean;
    code: string;
    message: string;
    waitlistAllowed: boolean;
    source?: "discovery" | "membership";
  } | null;
  classType: {
    id: string;
    name: string;
    canonicalCategory: string;
    strengthFocus: string | null;
    audienceGroup: string;
    beginnerFriendly: boolean;
    membershipRequired: boolean;
  } | null;
};

export function localizedClassTitle(
  occurrence: Pick<LiveClass, "title" | "canonicalCategory" | "strengthFocus">,
  locale: Locale = "en",
) {
  if (locale === "en") return occurrence.title;
  if (occurrence.canonicalCategory === "GIRLS_JIU_JITSU_SELF_DEFENSE") return "Jiu-Jitsu / Defensa Personal para Niñas";
  if (occurrence.canonicalCategory === "JIU_JITSU_SELF_DEFENSE") return "Jiu-Jitsu / Defensa Personal";
  if (occurrence.canonicalCategory === "STRENGTH_CONDITIONING") {
    const focus = occurrence.strengthFocus === "LOWER_BODY"
      ? "Tren Inferior"
      : occurrence.strengthFocus === "UPPER_BODY_CORE"
        ? "Tren Superior + Core"
        : "Cuerpo Completo";
    return `Fuerza y Acondicionamiento — ${focus}`;
  }
  return occurrence.title;
}

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