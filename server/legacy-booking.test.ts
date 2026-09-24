import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import type { Server } from "node:http";
import Stripe from "stripe";
import { eq, or } from "drizzle-orm";
import { db } from "./db";
import { storage, ClassBookingError } from "./storage";
import { registerRoutes } from "./routes";
import { bookings, trainers, users } from "@shared/schema";
import {
  getLegacySessionConfig,
  legacyBookingRequestSchema,
  legacyBookingStatusSchema,
  legacyPaymentIntentRequestSchema,
} from "./legacy-booking";

const fixtureSuffix = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

async function createFixture() {
  const suffix = fixtureSuffix();
  const user = await storage.createUser(
    `legacy-booking-${suffix}@example.invalid`,
    "GroundUp-QA-Password-2026",
    "Legacy",
    "Member",
    "5550000123",
    "en",
    { accountStatus: "legitimate" },
  );
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, user.id));
  const trainer = await storage.createTrainer({
    name: `Legacy Booking Trainer ${suffix}`,
    bio: "Integration fixture",
    photoUrl: "",
    specialties: ["BJJ"],
    beltRank: "Black Belt",
    availability: {},
  });

  return {
    user,
    trainer,
    start: new Date("2099-01-01T18:00:00.000Z"),
  };
}

async function cleanupFixture(fixture: Awaited<ReturnType<typeof createFixture>>) {
  await db.delete(bookings).where(or(
    eq(bookings.userId, fixture.user.id),
    eq(bookings.trainerId, fixture.trainer.id),
  ));
  await db.delete(trainers).where(eq(trainers.id, fixture.trainer.id));
  await db.delete(users).where(eq(users.id, fixture.user.id));
}

function bookingInput(fixture: Awaited<ReturnType<typeof createFixture>>, overrides: Partial<{
  start: Date;
  status: string;
}> = {}) {
  const start = overrides.start || fixture.start;
  return {
    sessionType: "PT60" as const,
    trainerId: fixture.trainer.id,
    start,
    end: new Date(start.getTime() + 60 * 60 * 1000),
    customerName: "Legacy Member",
    customerEmail: fixture.user.email,
    customerPhone: fixture.user.phone || "Not provided",
    notes: "",
    amountCents: 2000,
    currency: "usd",
    status: overrides.status || "pending",
  };
}

async function startTestServer(userId: string, stripe: Stripe | null = null) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = { userId, userRole: "member" } as typeof req.session;
    next();
  });
  const server = await registerRoutes(app, { stripe });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Test server did not expose a TCP address");
  }
  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
  };
}

async function stopTestServer(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

async function postJson(url: string, path: string, body: unknown) {
  return fetch(`${url}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

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

test("concurrent legacy bookings serialize on the trainer and keep one slot", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "fixture evidence must never run in production");
  const fixture = await createFixture();
  try {
    const results = await Promise.allSettled([
      storage.createUserBooking(fixture.user.id, bookingInput(fixture)),
      storage.createUserBooking(fixture.user.id, bookingInput(fixture)),
    ]);
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.ok(
      rejected[0].status === "rejected" &&
      rejected[0].reason instanceof ClassBookingError &&
      rejected[0].reason.code === "TIME_SLOT_UNAVAILABLE",
    );

    const stored = await db.select().from(bookings).where(eq(bookings.trainerId, fixture.trainer.id));
    assert.equal(stored.length, 1);
    assert.equal(stored[0].status, "pending");
  } finally {
    await cleanupFixture(fixture);
  }
});

test("legacy booking rejects overlaps with both pending and paid bookings", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "fixture evidence must never run in production");
  const fixture = await createFixture();
  try {
    const pending = await storage.createUserBooking(fixture.user.id, bookingInput(fixture));
    await assert.rejects(
      () => storage.createUserBooking(fixture.user.id, bookingInput(fixture)),
      (error: unknown) => error instanceof ClassBookingError && error.code === "TIME_SLOT_UNAVAILABLE",
    );

    await storage.updateBookingStatus(pending.id, "canceled");
    const paid = await storage.createUserBooking(fixture.user.id, bookingInput(fixture));
    await storage.updateBookingStatus(paid.id, "paid", "pi_legacy_fixture");
    await assert.rejects(
      () => storage.createUserBooking(fixture.user.id, bookingInput(fixture)),
      (error: unknown) => error instanceof ClassBookingError && error.code === "TIME_SLOT_UNAVAILABLE",
    );
  } finally {
    await cleanupFixture(fixture);
  }
});

test("legacy booking route stores server-owned customer and payment values", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "fixture evidence must never run in production");
  const fixture = await createFixture();
  const testServer = await startTestServer(fixture.user.id);
  try {
    const response = await postJson(testServer.url, "/api/bookings", {
      sessionType: "PT60",
      trainerId: fixture.trainer.id,
      start: fixture.start.toISOString(),
      notes: "A valid note",
      customerName: "Browser Attacker",
      customerEmail: "attacker@example.com",
      customerPhone: "0000000000",
      amountCents: 1,
      currency: "eur",
      status: "paid",
      userId: "attacker-user",
    });
    assert.equal(response.status, 201);
    const created = await response.json() as { id: string };
    const stored = await storage.getBooking(created.id);

    assert.ok(stored);
    assert.equal(stored.userId, fixture.user.id);
    assert.equal(stored.customerName, "Legacy Member");
    assert.equal(stored.customerEmail, fixture.user.email);
    assert.equal(stored.customerPhone, "5550000123");
    assert.equal(stored.amountCents, 2000);
    assert.equal(stored.currency, "usd");
    assert.equal(stored.status, "pending");
    assert.equal(stored.sessionType, "PT60");
  } finally {
    await stopTestServer(testServer.server);
    await cleanupFixture(fixture);
  }
});

test("repeated legacy PaymentIntent requests reuse one booking idempotency key", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "fixture evidence must never run in production");
  const fixture = await createFixture();
  const booking = await storage.createUserBooking(fixture.user.id, bookingInput(fixture));
  const calls: Array<{ params: Record<string, unknown>; options: { idempotencyKey?: string } }> = [];
  const byKey = new Map<string, { id: string; client_secret: string }>();
  let chargeCalls = 0;
  const fakeStripe = {
    paymentIntents: {
      create: async (params: Record<string, unknown>, options: { idempotencyKey?: string }) => {
        calls.push({ params, options });
        const key = options.idempotencyKey || "";
        const existing = byKey.get(key);
        if (existing) return existing;
        const paymentIntent = {
          id: `pi_legacy_${fixture.user.id}`,
          client_secret: `pi_legacy_secret_${fixture.user.id}`,
        };
        byKey.set(key, paymentIntent);
        return paymentIntent;
      },
    },
    charges: {
      create: async () => {
        chargeCalls++;
        throw new Error("Live charges are not allowed in this test");
      },
    },
  } as unknown as Stripe;
  const testServer = await startTestServer(fixture.user.id, fakeStripe);
  try {
    const requestBody = { bookingId: booking.id, sessionType: "PT60" };
    const first = await postJson(testServer.url, "/api/create-payment-intent", requestBody);
    const second = await postJson(testServer.url, "/api/create-payment-intent", requestBody);
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.deepEqual(await first.json(), await second.json());

    assert.equal(calls.length, 2);
    assert.equal(calls[0].options.idempotencyKey, `legacy-booking-payment-intent:${booking.id}`);
    assert.equal(calls[1].options.idempotencyKey, calls[0].options.idempotencyKey);
    assert.equal(calls[0].params.amount, 2000);
    assert.equal(calls[0].params.currency, "usd");
    assert.deepEqual(calls[0].params.metadata, {
      sessionType: "PT60",
      bookingId: booking.id,
    });
    assert.equal(chargeCalls, 0);
  } finally {
    await stopTestServer(testServer.server);
    await cleanupFixture(fixture);
  }
});