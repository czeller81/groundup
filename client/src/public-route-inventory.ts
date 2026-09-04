/**
 * Every public page has one English route and one Spanish equivalent.
 *
 * Keep this inventory in sync with Router in App.tsx. The public route check
 * intentionally reads both files so adding a route without its locale pair
 * fails before it can become another drifting implementation.
 */
export const PUBLIC_ROUTE_INVENTORY = [
  { id: "home", englishPath: "/", spanishPath: "/es", englishComponent: "Home", spanishComponent: "SpanishHome" },
  { id: "personal-training", englishPath: "/personal-training", spanishPath: "/es/personal-training", englishComponent: "PersonalTraining", spanishComponent: "PersonalTraining" },
  { id: "coaches", englishPath: "/coaches", spanishPath: "/es/coaches", englishComponent: "Coaches", spanishComponent: "Coaches" },
  { id: "pricing", englishPath: "/pricing", spanishPath: "/es/pricing", englishComponent: "Pricing", spanishComponent: "Pricing" },
  { id: "contact", englishPath: "/contact", spanishPath: "/es/contacto", englishComponent: "Contact", spanishComponent: "SpanishContact" },
  { id: "privacy", englishPath: "/privacy", spanishPath: "/es/privacidad", englishComponent: "Privacy", spanishComponent: "SpanishPrivacy" },
  { id: "schedule", englishPath: "/schedule", spanishPath: "/es/horario", englishComponent: "LiveSchedule", spanishComponent: "SpanishSchedule" },
  { id: "book", englishPath: "/book", spanishPath: "/es/reservar", englishComponent: "FirstVisitBooking", spanishComponent: "SpanishBooking" },
  { id: "womens-self-defense", englishPath: "/womens-self-defense", spanishPath: "/es/womens-self-defense", englishComponent: "WomensSelfDefense", spanishComponent: "WomensSelfDefense" },
  { id: "girls", englishPath: "/girls", spanishPath: "/es/girls", englishComponent: "Girls", spanishComponent: "Girls" },
  { id: "adaptive-capacity", englishPath: "/adaptive-capacity", spanishPath: "/es/adaptive-capacity", englishComponent: "AdaptiveCapacity", spanishComponent: "AdaptiveCapacity" },
] as const;

/**
 * Public URLs kept for backwards compatibility. They must not render a
 * second page implementation.
 */
export const PUBLIC_ROUTE_ALIASES = [
  { path: "/es/programas", canonicalPath: "/es/pricing" },
  { path: "/kids", canonicalPath: "/girls" },
  { path: "/es/kids", canonicalPath: "/es/girls" },
] as const;