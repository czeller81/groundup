import { z } from "zod";

export const LEGACY_SESSION_TYPES = {
  PT60: { name: "60-Minute 1:1 Training", duration: 60, price: 20 },
  UNLIMITED: { name: "Monthly Unlimited", duration: 0, price: 280 },
} as const;

export type LegacySessionType = keyof typeof LEGACY_SESSION_TYPES;

export const legacyBookingRequestSchema = z.object({
  sessionType: z.enum(["PT60", "UNLIMITED"]),
  trainerId: z.string().trim().min(1).max(100),
  start: z.coerce.date(),
  notes: z.string().trim().max(2000).optional(),
}).strip();

export const legacyPaymentIntentRequestSchema = z.object({
  bookingId: z.string().trim().min(1).max(100),
  sessionType: z.enum(["PT60", "UNLIMITED"]).optional(),
}).strict();

export const legacyBookingStatusSchema = z.object({
  status: z.enum(["pending", "paid", "canceled"]),
  stripeSessionId: z.string().trim().regex(/^(pi|cs)_[A-Za-z0-9_]+$/, "Invalid Stripe payment reference").optional(),
}).strict().superRefine((value, ctx) => {
  if (value.status === "paid" && !value.stripeSessionId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["stripeSessionId"],
      message: "A Stripe payment reference is required before marking a booking paid.",
    });
  }
});

export const legacyPortalBookingRequestSchema = z.object({
  trainerId: z.string().trim().min(1).max(100),
  sessionType: z.enum(["PT60", "UNLIMITED"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid booking date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid booking time"),
  notes: z.string().trim().max(2000).optional(),
}).strict();

export function getLegacySessionConfig(sessionType: LegacySessionType) {
  return LEGACY_SESSION_TYPES[sessionType];
}
