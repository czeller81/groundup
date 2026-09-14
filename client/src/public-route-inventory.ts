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
  { id: "book", englishPath: "/book", spanishPath: "/es/reservar", englishComponent: "Redirect", spanishComponent: "Redirect" },
  { id: "womens-self-defense", englishPath: "/womens-self-defense", spanishPath: "/es/womens-self-defense", englishComponent: "WomensSelfDefense", spanishComponent: "WomensSelfDefense" },
  { id: "girls", englishPath: "/girls", spanishPath: "/es/girls", englishComponent: "Girls", spanishComponent: "Girls" },
  { id: "adaptive-capacity", englishPath: "/adaptive-capacity", spanishPath: "/es/adaptive-capacity", englishComponent: "AdaptiveCapacity", spanishComponent: "AdaptiveCapacity" },
  { id: "discovery-pass", englishPath: "/discovery-pass", spanishPath: "/es/discovery-pass", englishComponent: "DiscoveryPass", spanishComponent: "DiscoveryPass" },
  { id: "discovery-pass-b", englishPath: "/discovery-pass-b", spanishPath: "/es/discovery-pass-b", englishComponent: "DiscoveryPassB", spanishComponent: "DiscoveryPassB" },
] as const;

/**
 * Public marketing pages whose server-rendered fallback contains a free-entry
 * call to action. Keep both destinations explicit so locale drift is caught
 * alongside the client route inventory.
 */
export const PUBLIC_NO_SCRIPT_DISCOVERY_ROUTES = [
  { englishPath: "/", spanishPath: "/es", englishDestination: "/discovery-pass", spanishDestination: "/es/discovery-pass" },
  { englishPath: "/schedule", spanishPath: "/es/horario", englishDestination: "/discovery-pass", spanishDestination: "/es/discovery-pass" },
  { englishPath: "/pricing", spanishPath: "/es/pricing", englishDestination: "/discovery-pass", spanishDestination: "/es/discovery-pass" },
  { englishPath: "/coaches", spanishPath: "/es/coaches", englishDestination: "/discovery-pass", spanishDestination: "/es/discovery-pass" },
  { englishPath: "/contact", spanishPath: "/es/contacto", englishDestination: "/discovery-pass", spanishDestination: "/es/discovery-pass" },
  { englishPath: "/womens-self-defense", spanishPath: "/es/womens-self-defense", englishDestination: "/discovery-pass", spanishDestination: "/es/discovery-pass" },
] as const;

/**
 * Public pages whose no-script paths intentionally stay outside the Discovery
 * Pass funnel. Keep their important destinations explicit so booking,
 * eligibility, and Adaptive Capacity links do not drift into free entry.
 */
export const PUBLIC_NO_SCRIPT_NON_DISCOVERY_ROUTES = [
  {
    path: "/personal-training",
    requiredLinks: ["/contact"],
  },
  {
    path: "/es/personal-training",
    requiredLinks: ["/es/contacto"],
  },
  {
    path: "/es/reservar",
    requiredLinks: ["/es/horario", "/es/contacto#contact-form"],
  },
  {
    path: "/es/adaptive-capacity",
    requiredLinks: ["#interest-list", "/es"],
  },
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