import { hasAnalyticsConsent } from "@/lib/analytics";

const META_PIXEL_ID = "1056772796937894";
const SCRIPT_ID = "groundup-meta-pixel";
export const META_DISCOVERY_ACTIVATION_EVENT = "DiscoveryPassActivated";
export const META_DISCOVERY_TEST_MODE_PARAM = "meta_test_event";
const SENT_DISCOVERY_EVENTS_KEY = "groundup-meta-discovery-activation-events";
const DISCOVERY_TEST_VERIFICATION_KEY = "groundup-meta-discovery-test-verification";

export interface MetaDiscoveryVerification {
  eventName: typeof META_DISCOVERY_ACTIVATION_EVENT;
  eventId: string;
  consent: "granted" | "denied";
  emittedCount: number;
  duplicateSuppressed: boolean;
  exactlyOnce: boolean | null;
  payloadKeys: string[];
  payloadMinimized: boolean;
  transport: "browser-pixel-test-events" | "server-conversions-api-test";
}

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

function isDevelopmentBuild(): boolean {
  // Vite replaces this at build time. Node's test runner leaves import.meta.env
  // undefined, which is still safe because the test harness has no production
  // bundle or live member journey.
  return import.meta.env?.DEV !== false;
}

export function isMetaDiscoveryTestMode(): boolean {
  if (typeof window === "undefined" || !isDevelopmentBuild()) return false;
  return new URLSearchParams(window.location.search).get(META_DISCOVERY_TEST_MODE_PARAM) === "1";
}

function saveMetaDiscoveryVerification(record: MetaDiscoveryVerification) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DISCOVERY_TEST_VERIFICATION_KEY, JSON.stringify(record));
  } catch {
    // Verification must never interrupt the member activation journey.
  }
}

export function getMetaDiscoveryVerification(): MetaDiscoveryVerification | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DISCOVERY_TEST_VERIFICATION_KEY);
    if (!raw) return null;
    const record = JSON.parse(raw) as MetaDiscoveryVerification;
    return record?.eventName === META_DISCOVERY_ACTIVATION_EVENT ? record : null;
  } catch {
    return null;
  }
}

function trackMetaDiscoveryPassActivationOnce(eventId: string, locale: "en" | "es"): boolean {
  const normalizedEventId = eventId.trim();
  if (typeof window === "undefined" || !hasAnalyticsConsent() || !normalizedEventId) return false;

  const sentIds = sentDiscoveryEventIds();
  if (sentIds.has(normalizedEventId)) return false;

  initializeMetaPixel();
  if (!window.fbq) return false;

  window.fbq(
    "trackCustom",
    META_DISCOVERY_ACTIVATION_EVENT,
    { locale },
    { eventID: normalizedEventId },
  );
  sentIds.add(normalizedEventId);
  try {
    window.localStorage.setItem(SENT_DISCOVERY_EVENTS_KEY, JSON.stringify(Array.from(sentIds).slice(-100)));
  } catch {
    // Meta tracking must never interrupt the member activation journey.
  }
  return true;
}

export function trackMetaDiscoveryPassActivation(eventId: string, locale: "en" | "es"): boolean {
  return trackMetaDiscoveryPassActivationOnce(eventId, locale);
}

function syntheticMetaDiscoveryEventId(): string {
  return `meta-test-${crypto.randomUUID()}`;
}

/**
 * Sends one synthetic Discovery Pass activation while the Meta Events Manager
 * Test Events page is open. This never calls the activation API and is only
 * exposed by a development build with ?meta_test_event=1.
 */
export function sendMetaDiscoveryTestEvent(locale: "en" | "es"): MetaDiscoveryVerification | null {
  if (!isMetaDiscoveryTestMode()) return null;

  const eventId = syntheticMetaDiscoveryEventId();
  const consent = hasAnalyticsConsent() ? "granted" : "denied";
  const firstAttempt = trackMetaDiscoveryPassActivationOnce(eventId, locale);
  const secondAttempt = trackMetaDiscoveryPassActivationOnce(eventId, locale);
  const emittedCount = Number(firstAttempt) + Number(secondAttempt);
  const verification: MetaDiscoveryVerification = {
    eventName: META_DISCOVERY_ACTIVATION_EVENT,
    eventId,
    consent,
    emittedCount,
    duplicateSuppressed: !secondAttempt,
    exactlyOnce: consent === "granted" ? emittedCount === 1 : null,
    payloadKeys: ["locale"],
    payloadMinimized: true,
    transport: "browser-pixel-test-events",
  };
  saveMetaDiscoveryVerification(verification);
  return verification;
}
