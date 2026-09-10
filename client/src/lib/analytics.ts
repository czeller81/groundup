export type Funnel = "training" | "adaptive_capacity";
export type AnalyticsEvent =
  | "page_view"
  | "cta_click"
  | "funnel_step"
  | "lead_form_started"
  | "lead_form_submitted"
  | "lead_form_succeeded"
  | "lead_form_failed"
  | "reservation_succeeded"
  | "reservation_failed"
  | "discovery_page_view"
  | "discovery_cta_click"
  | "discovery_claim_started"
  | "discovery_claim_submitted"
  | "discovery_continue_to_account"
  | "discovery_account_created"
  | "discovery_waiver_completed"
  | "discovery_forms_started"
  | "discovery_required_forms_completed"
  | "discovery_pass_activated"
  | "discovery_class_booked";

export type ProjectAnalyticsEvent =
  | "schedule_viewed"
  | "booking_started"
  | "booking_completed"
  | "booking_failed"
  | "member_login_completed"
  | "member_signup_completed"
  | "minor_profile_created"
  | "consent_updated"
  | "discovery_page_view"
  | "discovery_cta_click"
  | "discovery_claim_started"
  | "discovery_claim_submitted"
  | "discovery_continue_to_account"
  | "discovery_account_created"
  | "discovery_waiver_completed"
  | "discovery_forms_started"
  | "discovery_required_forms_completed"
  | "discovery_pass_activated"
  | "discovery_class_booked"
  | "discovery_first_attendance"
  | "discovery_second_attendance"
  | "discovery_membership_started";

type AnalyticsData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: {
      track(name: string, data?: AnalyticsData): void;
    };
  }
}

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  landing_path?: string;
  referrer?: string;
}

const CONSENT_KEY = "groundup-analytics-consent";
const ATTRIBUTION_KEY = "groundup-attribution";
const SESSION_KEY = "groundup-analytics-session";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

export function hasAnalyticsConsent(): boolean {
  return typeof window !== "undefined" && window.localStorage.getItem(CONSENT_KEY) === "granted";
}

export function getConsent(): "granted" | "denied" | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(CONSENT_KEY);
  return value === "granted" || value === "denied" ? value : null;
}

export function setAnalyticsConsent(value: "granted" | "denied") {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_KEY, value);
  if (value === "granted") captureAttribution();
}

export function getAttribution(): Attribution {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return {};
  try {
    return JSON.parse(window.localStorage.getItem(ATTRIBUTION_KEY) || "{}");
  } catch {
    return {};
  }
}

export function captureAttribution(): Attribution {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return {};
  const params = new URLSearchParams(window.location.search);
  const attribution: Attribution = { landing_path: window.location.pathname, referrer: document.referrer || undefined };
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) attribution[key] = value.slice(0, 200);
  }
  const existing = getAttribution();
  const merged = { ...existing, ...attribution };
  window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(merged));
  return merged;
}

export function trackEvent(name: ProjectAnalyticsEvent, data: AnalyticsData = {}): void {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return;

  try {
    window.umami?.track(name, data);
  } catch {
    // Analytics must never interrupt the user journey.
  }
}

function sessionId(): string {
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function track(event: AnalyticsEvent, funnel: Funnel, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return;
  void fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({ event, funnel, sessionId: sessionId(), path: window.location.pathname, properties: { ...getAttribution(), ...properties } }),
  }).catch(() => undefined);
}