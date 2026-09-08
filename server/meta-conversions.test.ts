import assert from "node:assert/strict";
import test from "node:test";
import {
  deliverMetaDiscoveryTestEvent,
  getMetaServerTestConfig,
  metaServerTestConfigurationState,
} from "./meta-conversions";

test("Meta server test delivery stays disabled without explicit configuration", () => {
  const config = getMetaServerTestConfig({
    NODE_ENV: "production",
    META_CONVERSIONS_API_ACCESS_TOKEN: "server-only-token",
    META_CONVERSIONS_API_PIXEL_ID: "1056772796937894",
    META_CONVERSIONS_API_TEST_EVENT_CODE: "TEST123",
  });
  assert.equal(metaServerTestConfigurationState(config), "disabled");
});

test("Meta server test delivery requires every server-only setting", () => {
  const config = getMetaServerTestConfig({
    META_SERVER_TEST_ENABLED: "true",
    META_CONVERSIONS_API_ACCESS_TOKEN: "server-only-token",
    META_CONVERSIONS_API_PIXEL_ID: "1056772796937894",
  });
  assert.equal(metaServerTestConfigurationState(config), "unconfigured");
});

test("Meta server test delivery sends one minimized synthetic Discovery Pass event", async () => {
  const requests: RequestInit[] = [];
  const result = await deliverMetaDiscoveryTestEvent({
    config: {
      enabled: true,
      accessToken: "server-only-token",
      pixelId: "1056772796937894",
      testEventCode: "TEST123",
      apiVersion: "v21.0",
    },
    locale: "es",
    eventId: "meta-server-test-fixed",
    now: 1_700_000_000_000,
    fetchImpl: async (input, init) => {
      assert.match(String(input), /graph\.facebook\.com\/v21\.0\/1056772796937894\/events/);
      assert.match(String(input), /access_token=server-only-token/);
      requests.push(init || {});
      return new Response(JSON.stringify({ events_received: 1, messages: [], fbtrace_id: "redacted-test" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  assert.equal(requests.length, 1);
  assert.equal(result.accepted, true);
  assert.equal(result.verification.eventId, "meta-server-test-fixed");
  assert.equal(result.verification.eventName, "DiscoveryPassActivated");
  assert.equal(result.verification.emittedCount, 1);
  assert.equal(result.verification.eventsReceived, 1);
  assert.equal(result.verification.exactlyOnce, true);
  assert.deepEqual(result.verification.payloadKeys, ["locale"]);

  const sent = JSON.parse(String(requests[0].body));
  assert.deepEqual(Object.keys(sent), ["data", "test_event_code"]);
  assert.equal(sent.test_event_code, "TEST123");
  assert.deepEqual(Object.keys(sent.data[0]), [
    "event_name",
    "event_time",
    "event_id",
    "action_source",
    "custom_data",
  ]);
  assert.deepEqual(sent.data[0].custom_data, { locale: "es" });
  assert.equal("user_data" in sent.data[0], false);
});

test("Meta server test delivery reports failed exactly-once evidence without leaking upstream data", async () => {
  const result = await deliverMetaDiscoveryTestEvent({
    config: {
      enabled: true,
      accessToken: "server-only-token",
      pixelId: "1056772796937894",
      testEventCode: "TEST123",
      apiVersion: "v21.0",
    },
    locale: "en",
    eventId: "meta-server-test-rejected",
    fetchImpl: async () => new Response(JSON.stringify({ events_received: 0, error: { message: "secret upstream detail" } }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }),
  });

  assert.equal(result.accepted, false);
  assert.equal(result.verification.eventsReceived, 0);
  assert.equal(result.verification.exactlyOnce, false);
  assert.equal("error" in result.verification, false);
  assert.equal(JSON.stringify(result.verification).includes("server-only-token"), false);
});

test("Meta server test delivery does not call a non-2xx response exactly-once success", async () => {
  const result = await deliverMetaDiscoveryTestEvent({
    config: {
      enabled: true,
      accessToken: "server-only-token",
      pixelId: "1056772796937894",
      testEventCode: "TEST123",
      apiVersion: "v21.0",
    },
    locale: "en",
    eventId: "meta-server-test-http-failure",
    fetchImpl: async () => new Response(JSON.stringify({ events_received: 1 }), { status: 500 }),
  });

  assert.equal(result.accepted, false);
  assert.equal(result.verification.eventsReceived, 1);
  assert.equal(result.verification.exactlyOnce, false);
});