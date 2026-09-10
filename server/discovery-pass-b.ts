import { z } from "zod";

export const discoveryPassClaimRequestSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  email: z.string().trim().email("A valid email is required").max(254),
  phone: z.string().trim().regex(/^\+?[\d\s().-]{7,30}$/, "Invalid phone number").optional().or(z.literal("")),
  locale: z.enum(["en", "es"]).default("en"),
  attribution: z.record(z.string().trim().max(200)).refine((value) => Object.keys(value).length <= 12, "Too many attribution fields").default({}),
}).strict();

export function normalizeDiscoveryPassClaimInput(input: z.infer<typeof discoveryPassClaimRequestSchema>) {
  return {
    firstName: input.firstName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    locale: input.locale,
    attribution: input.attribution,
    experimentVariant: "B" as const,
  };
}