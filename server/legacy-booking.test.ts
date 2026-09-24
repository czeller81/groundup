import assert from "node:assert/strict";
import test from "node:test";
import {
  getLegacySessionConfig,
  legacyBookingRequestSchema,
  legacyBookingStatusSchema,
  legacyPaymentIntentRequestSchema,
} from "./legacy-booking";

test("legacy booking input ignores browser-supplied financial and identity fields", () => {
  const parsed = legacyBookingRequestSchema.parse({
    sessionType: "PT60",
    trainerId: "trainer-1",
    start: "2099-01-01T18:00:00.000Z",
    customerName: "Browser supplied name",
    customerEmail: "browser@example.com",
    customerPhone: "555-0100",
    amountCents: 1,
    currency: "eur",
    status: "paid",
  });

  assert.deepEqual(parsed, {
    sessionType: "PT60",
    trainerId: "trainer-1",
    start: new Date("2099-01-01T18:00:00.000Z"),
  });
});

test("legacy pricing and duration come from the server configuration", () => {
  assert.deepEqual(getLegacySessionConfig("PT60"), {
    name: "60-Minute 1:1 Training",
    duration: 60,
    price: 20,
  });
  assert.equal(getLegacySessionConfig("UNLIMITED").price, 280);
});

test("payment intents require a booking and reject unknown fields", () => {
  assert.throws(() => legacyPaymentIntentRequestSchema.parse({ sessionType: "PT60" }));
  assert.throws(() => legacyPaymentIntentRequestSchema.parse({
    bookingId: "booking-1",
    amountCents: 1,
  }));
  assert.deepEqual(
    legacyPaymentIntentRequestSchema.parse({ bookingId: "booking-1" }),
    { bookingId: "booking-1" },
  );
});

test("paid legacy status updates require a Stripe reference", () => {
  assert.throws(() => legacyBookingStatusSchema.parse({ status: "paid" }));
  assert.throws(() => legacyBookingStatusSchema.parse({
    status: "paid",
    stripeSessionId: "not-a-stripe-id",
  }));
  assert.deepEqual(
    legacyBookingStatusSchema.parse({ status: "paid", stripeSessionId: "pi_123" }),
    { status: "paid", stripeSessionId: "pi_123" },
  );
});