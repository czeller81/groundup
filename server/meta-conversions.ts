import crypto from "node:crypto";

export const META_DISCOVERY_ACTIVATION_EVENT = "DiscoveryPassActivated";
export const META_SERVER_TEST_TRANSPORT = "server-conversions-api-test" as const;

export type MetaTestLocale = "en" | "es";

export interface MetaServerTestConfig {
  enabled: boolean;
  accessToken?: string;
  pixelId?: string;
  testEventCode?: string;
  apiVersion: string;
}

export interface MetaServerTestVerification {
  eventName: typeof META_DISCOVERY_ACTIVATION_EVENT;
  eventId: string;
  consent: "granted";
  emittedCount: number;
  duplicateSuppressed: boolean;
  exactlyOnce: boolean;
  payloadKeys: string[];
  payloadMinimized: true;
  transport: typeof META_SERVER_TEST_TRANSPORT;
  eventsReceived: number | null;
}

export interface MetaServerTestDelivery {
  accepted: boolean;
  verification: MetaServerTestVerification;
}

export function getMetaServerTestConfig(
  env: NodeJS.ProcessEnv = process.env,
): MetaServerTestConfig {
  return {
    enabled: env.META_SERVER_TEST_ENABLED === "true",
    accessToken: env.META_CONVERSIONS_API_ACCESS_TOKEN?.trim() || undefined,
    pixelId: env.META_CONVERSIONS_API_PIXEL_ID?.trim() || undefined,
    testEventCode: env.META_CONVERSIONS_API_TEST_EVENT_CODE?.trim() || undefined,
    apiVersion: env.META_CONVERSIONS_API_VERSION?.trim() || "v21.0",
  };
}

export function metaServerTestConfigurationState(
  config: MetaServerTestConfig,
): "disabled" | "unconfigured" | "ready" {
  if (!config.enabled) return "disabled";
  if (!config.accessToken || !config.pixelId || !config.testEventCode) return "unconfigured";
  return "ready";
}

function syntheticEventId() {
  return `meta-server-test-${crypto.randomUUID()}`;
}

function verificationFor(
  eventId: string,
  eventsReceived: number | null,
  exactlyOnce = eventsReceived === 1,
): MetaServerTestVerification {
  return {
    eventName: META_DISCOVERY_ACTIVATION_EVENT,
    eventId,
    consent: "granted",
    emittedCount: 1,
    duplicateSuppressed: false,
    exactlyOnce,
    payloadKeys: ["locale"],
    payloadMinimized: true,
    transport: META_SERVER_TEST_TRANSPORT,
    eventsReceived,
  };
}

function eventsReceivedFrom(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;
  const value = (body as { events_received?: unknown }).events_received;
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * Sends exactly one synthetic Discovery Pass event to Meta's Test Events API.
 * The caller supplies configuration from server-only environment values.
 * No member identifiers, browser identifiers, or request metadata are added.
 */
export async function deliverMetaDiscoveryTestEvent({
  config,
  locale,
  fetchImpl = fetch,
  eventId = syntheticEventId(),
  now = Date.now(),
}: {
  config: MetaServerTestConfig;
  locale: MetaTestLocale;
  fetchImpl?: typeof fetch;
  eventId?: string;
  now?: number;
}): Promise<MetaServerTestDelivery> {
  if (!config.accessToken || !config.pixelId || !config.testEventCode) {
    throw new Error("Meta server test configuration is incomplete");
  }

  const event = {
    event_name: META_DISCOVERY_ACTIVATION_EVENT,
    event_time: Math.floor(now / 1000),
    event_id: eventId,
    action_source: "website",
    custom_data: { locale },
  };
  const payload = {
    data: [event],
    test_event_code: config.testEventCode,
  };
  const endpoint = new URL(
    `https://graph.facebook.com/${config.apiVersion}/${encodeURIComponent(config.pixelId)}/events`,
  );
  endpoint.searchParams.set("access_token", config.accessToken);

  let response: Response;
  let body: unknown = null;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  } catch {
    return {
      accepted: false,
      verification: verificationFor(eventId, null),
    };
  }

  const eventsReceived = eventsReceivedFrom(body);
  const accepted = response.ok && eventsReceived === 1;
  return {
    accepted,
    verification: verificationFor(eventId, eventsReceived, accepted),
  };
}