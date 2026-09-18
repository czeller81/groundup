export type BookingLocale = "en" | "es";

export const BOOKING_OPERATIONS = {
  location: {
    address: "2364 Sturgis Rd, Unit A, Oxnard, CA 93030",
    street: "2364 Sturgis Rd, Unit A",
    city: "Oxnard",
    state: "CA",
    zip: "93030",
  },
  timezone: "America/Los_Angeles",
  cancellationCutoffHours: 4,
  guidance: {
    en: {
      arrival: "Arrive 15 minutes early for your first class so the team can give you a quick tour and answer questions.",
      whatToBring: "Wear comfortable athletic clothing. No gear is required for your first class; bring water.",
      accessParking: null,
    },
    es: {
      arrival: "Llega 15 minutos antes de tu primera clase para que el equipo pueda mostrarte el espacio y responder tus preguntas.",
      whatToBring: "Usa ropa deportiva cómoda. No necesitas equipo para tu primera clase; trae agua.",
      accessParking: null,
    },
  },
  policy: {
    en: `Cancel at least 4 hours before class start to avoid using your session entitlement.`,
    es: `Cancela al menos 4 horas antes del inicio de la clase para evitar consumir tu sesión.`,
  },
} as const;

export function bookingOperationsForLocale(locale: BookingLocale) {
  return {
    timezone: BOOKING_OPERATIONS.timezone,
    address: BOOKING_OPERATIONS.location.address,
    cancellationCutoffHours: BOOKING_OPERATIONS.cancellationCutoffHours,
    ...BOOKING_OPERATIONS.guidance[locale],
    cancellationPolicy: BOOKING_OPERATIONS.policy[locale],
  };
}

export function formatBookingDateTime(
  value: Date | string,
  locale: BookingLocale,
  options: Intl.DateTimeFormatOptions = {},
) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
    timeZone: BOOKING_OPERATIONS.timezone,
    ...options,
  }).format(new Date(value));
}

export function formatBookingDuration(start: Date | string, end: Date | string) {
  const minutes = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours} hour${hours === 1 ? "" : "s"}`;
}