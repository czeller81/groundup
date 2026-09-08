import assert from "node:assert/strict";
import test from "node:test";

type Storage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function createBrowserHarness(consent: "granted" | "denied", search = "?meta_test_event=1") {
  const values = new Map<string, string>([["groundup-analytics-consent", consent]]);
  const sessionValues = new Map<string, string>();
  const calls: unknown[][] = [];
  const storage: Storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
  const sessionStorage: Storage = {
    getItem: (key) => sessionValues.get(key) || null,
    setItem: (key, value) => sessionValues.set(key, value),
  };
  const fbq = (...args: unknown[]) => calls.push(args);

  (globalThis as any).window = {
    localStorage: storage,
    sessionStorage,
    location: { search },
    fbq,
    _fbq: fbq,
  };
  (globalThis as any).document = {
    getElementById: () => ({ id: "groundup-meta-pixel" }),
    createElement: () => ({}) as any,
    head: { appendChild: () => undefined },
  };

  return { calls, values };
}

test("Meta Discovery activation emits once with a pass event ID and no sensitive data", async () => {
  const { calls } = createBrowserHarness("granted");
  const { META_DISCOVERY_ACTIVATION_EVENT, trackMetaDiscoveryPassActivation } = await import("./meta-pixel");

  assert.equal(trackMetaDiscoveryPassActivation("pass-123", "es"), true);
  assert.equal(trackMetaDiscoveryPassActivation("pass-123", "es"), false);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], [
    "trackCustom",
    META_DISCOVERY_ACTIVATION_EVENT,
    { locale: "es" },
    { eventID: "pass-123" },
  ]);
  assert.deepEqual(Object.keys(calls[0]?.[2] as object), ["locale"]);
});

test("Meta Discovery activation is blocked without advertising consent", async () => {
  const { calls } = createBrowserHarness("denied");
  const { trackMetaDiscoveryPassActivation } = await import("./meta-pixel");

  assert.equal(trackMetaDiscoveryPassActivation("pass-denied", "en"), false);
  assert.equal(calls.length, 0);
});

test("Meta Discovery test event records a synthetic, exactly-once verification", async () => {
  const { calls } = createBrowserHarness("granted");
  const {
    META_DISCOVERY_ACTIVATION_EVENT,
    getMetaDiscoveryVerification,
    sendMetaDiscoveryTestEvent,
  } = await import("./meta-pixel");

  const verification = sendMetaDiscoveryTestEvent("en");

  assert.ok(verification);
  assert.equal(verification.eventName, META_DISCOVERY_ACTIVATION_EVENT);
  assert.match(verification.eventId, /^meta-test-/);
  assert.equal(verification.consent, "granted");
  assert.equal(verification.emittedCount, 1);
  assert.equal(verification.duplicateSuppressed, true);
  assert.equal(verification.exactlyOnce, true);
  assert.deepEqual(verification.payloadKeys, ["locale"]);
  assert.equal(verification.payloadMinimized, true);
  assert.equal(verification.transport, "browser-pixel-test-events");
  assert.equal(calls.filter(([command]) => command === "trackCustom").length, 1);
  assert.deepEqual(getMetaDiscoveryVerification(), verification);
});

test("Meta Discovery test event records denied consent without emitting", async () => {
  const { calls } = createBrowserHarness("denied");
  const { sendMetaDiscoveryTestEvent } = await import("./meta-pixel");

  const verification = sendMetaDiscoveryTestEvent("en");

  assert.ok(verification);
  assert.equal(verification.consent, "denied");
  assert.equal(verification.emittedCount, 0);
  assert.equal(verification.duplicateSuppressed, true);
  assert.equal(verification.exactlyOnce, null);
  assert.equal(calls.length, 0);
});

test("Meta Discovery test event requires the explicit test-mode URL", async () => {
  createBrowserHarness("granted", "");
  const { isMetaDiscoveryTestMode, sendMetaDiscoveryTestEvent } = await import("./meta-pixel");

  assert.equal(isMetaDiscoveryTestMode(), false);
  assert.equal(sendMetaDiscoveryTestEvent("en"), null);
});