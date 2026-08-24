import crypto from "crypto";
import Stripe from "stripe";

export function verifyStripeSignature(
  stripe: Stripe,
  rawBody: Buffer,
  signature: string | undefined,
  signingSecret: string | undefined,
): Stripe.Event {
  if (!signature || !signingSecret) throw new Error("Webhook signature is not configured");
  return stripe.webhooks.constructEvent(rawBody, signature, signingSecret);
}

export function verifyCalendlySignature(
  rawBody: Buffer | string,
  signature: string | undefined,
  signingKey: string | undefined,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!signature || !signingKey) return false;
  const parts = Object.fromEntries(
    signature.split(",").map((part) => {
      const [key, value] = part.split("=", 2);
      return [key, value];
    }),
  );
  if (!parts.t || !parts.v1) return false;
  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;

  const expected = crypto
    .createHmac("sha256", signingKey)
    .update(`${parts.t}.${Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody}`)
    .digest("hex");
  const provided = Buffer.from(parts.v1, "utf8");
  const calculated = Buffer.from(expected, "utf8");
  return provided.length === calculated.length && crypto.timingSafeEqual(provided, calculated);
}

export function parseRawJsonBody(rawBody: unknown): unknown {
  if (!Buffer.isBuffer(rawBody)) return rawBody;
  return JSON.parse(rawBody.toString("utf8"));
}