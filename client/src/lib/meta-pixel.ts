import { hasAnalyticsConsent } from "@/lib/analytics";

const META_PIXEL_ID = "1056772796937894";
const SCRIPT_ID = "groundup-meta-pixel";
export const META_DISCOVERY_ACTIVATION_EVENT = "DiscoveryPassActivated";
const SENT_DISCOVERY_EVENTS_KEY = "groundup-meta-discovery-activation-events";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: Window["fbq"];
  }
}

export function initializeMetaPixel() {
  if (typeof window === "undefined" || window.fbq) return;

  const queue: unknown[][] = [];
  const fbq = Object.assign((...args: unknown[]) => {
    queue.push(args);
  }, {
    queue,
    loaded: true,
    version: "2.0",
  });
  window.fbq = fbq;
  window._fbq = fbq;

  if (!document.getElementById(SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  window.fbq("init", META_PIXEL_ID);
}

export function trackMetaPageView() {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "PageView");
  }
}

function sentDiscoveryEventIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = JSON.parse(window.localStorage.getItem(SENT_DISCOVERY_EVENTS_KEY) || "[]");
    return new Set(Array.isArray(stored) ? stored.filter((value): value is string => typeof value === "string") : []);
  } catch {
    return new Set();
  }
}

export function trackMetaDiscoveryPassActivation(eventId: string, locale: "en" | "es"): boolean {
  if (typeof window === "undefined" || !hasAnalyticsConsent() || !eventId.trim()) return false;

  const sentIds = sentDiscoveryEventIds();
  if (sentIds.has(eventId)) return false;

  initializeMetaPixel();
  if (!window.fbq) return false;

  window.fbq(
    "trackCustom",
    META_DISCOVERY_ACTIVATION_EVENT,
    { locale },
    { eventID: eventId },
  );
  sentIds.add(eventId);
  try {
    window.localStorage.setItem(SENT_DISCOVERY_EVENTS_KEY, JSON.stringify(Array.from(sentIds).slice(-100)));
  } catch {
    // Meta tracking must never interrupt the member activation journey.
  }
  return true;
}
