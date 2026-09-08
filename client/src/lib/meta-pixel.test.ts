import assert from "node:assert/strict";
import test from "node:test";

type Storage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function createBrowserHarness(consent: "granted" | "denied") {
  const values = new Map<string, string>([["groundup-analytics-consent", consent]]);
  const calls: unknown[][] = [];
  const storage: Storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
  const fbq = (...args: unknown[]) => calls.push(args);

  (globalThis as any).window = { localStorage: storage, fbq, _fbq: fbq };
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