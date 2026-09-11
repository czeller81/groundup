import { and, asc, count, eq, gte, inArray, isNull, lte, or, sql, sum } from "drizzle-orm";
import {
  classOccurrences,
  classReservations,
  classTypes,
  discoveryEntitlements,
  discoveryPasses,
  entitlementLedger,
  forms,
  formResponses,
  memberships,
  membershipPlans,
  memberLifecycles,
  discoveryPassClaims,
  type MinorProfile,
  type ClassOccurrence,
  type MembershipPlan,
  type User,
} from "@shared/schema";
import { db } from "./db";

export const DISCOVERY_CATEGORIES = ["SKILL", "STRENGTH"] as const;
export type DiscoveryCategory = typeof DISCOVERY_CATEGORIES[number];

export const MEMBER_BOOKING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function isWithinMemberBookingWindow(start: Date, now = new Date()) {
  return start.getTime() <= now.getTime() + MEMBER_BOOKING_WINDOW_MS;
}

export type BookingEligibilityCode =
  | "ELIGIBLE"
  | "WEEKLY_LIMIT_REACHED"
  | "CLASS_FULL_WAITLIST_AVAILABLE"
  | "BOOKING_WINDOW_CLOSED"
  | "PLAN_NOT_ELIGIBLE"
  | "MEMBERSHIP_INACTIVE"
  | "DISCOVERY_ACTIVATION_REQUIRED"
  | "DISCOVERY_SKILL_ALREADY_USED"
  | "DISCOVERY_STRENGTH_ALREADY_USED"
  | "DISCOVERY_EXPIRED"
  | "REQUIRED_FORM_INCOMPLETE"
  | "DUPLICATE_RESERVATION"
  | "OVERLAPPING_RESERVATION"
  | "MINOR_PROFILE_REQUIRED"
  | "MINOR_CONSENT_REQUIRED"
  | "MINOR_CONSENT_REVOKED"
  | "MINOR_AGE_RESTRICTED"
  | "GIRLS_CLASS_ONLY"
  | "MINOR_DUPLICATE_RESERVATION"
  | "MINOR_OVERLAPPING_RESERVATION";

export type BookingEligibility = {
  eligible: boolean;
  code: BookingEligibilityCode;
  message: string;
  waitlistAllowed: boolean;
  source: "legacy" | "membership" | "discovery" | "minor";
  membershipId?: string;
  plan?: MembershipPlan;
  discoveryEntitlementId?: string;
  minorProfileId?: string;
  weekStart?: Date;
};

type SelectExecutor = {
  select: typeof db.select;
};

const messages: Record<BookingEligibilityCode, string> = {
  ELIGIBLE: "This class is available to book.",
  WEEKLY_LIMIT_REACHED: "Your weekly session limit has been reached.",
  CLASS_FULL_WAITLIST_AVAILABLE: "This class is full, but the waitlist is available.",
  BOOKING_WINDOW_CLOSED: "This class is outside your booking window.",
  PLAN_NOT_ELIGIBLE: "Your plan does not include this class category.",
  MEMBERSHIP_INACTIVE: "You do not have an active membership for this class.",
  DISCOVERY_ACTIVATION_REQUIRED: "Complete your Discovery Pass activation before booking this class.",
  DISCOVERY_SKILL_ALREADY_USED: "Your Discovery skill entitlement has already been used.",
  DISCOVERY_STRENGTH_ALREADY_USED: "Your Discovery strength entitlement has already been used.",
  DISCOVERY_EXPIRED: "Your Discovery Pass has expired.",
  REQUIRED_FORM_INCOMPLETE: "Complete the required forms before booking this class.",
  DUPLICATE_RESERVATION: "You already have a reservation for this class.",
  OVERLAPPING_RESERVATION: "You already have another class during this time.",
  MINOR_PROFILE_REQUIRED: "A guardian must select an approved minor profile for this girls' class.",
  MINOR_CONSENT_REQUIRED: "Guardian consent and emergency contact details are required before booking.",
  MINOR_CONSENT_REVOKED: "Guardian consent for this participant has been revoked.",
  MINOR_AGE_RESTRICTED: "This class is reserved for participants under 18.",
  GIRLS_CLASS_ONLY: "This participant profile can only be used for a girls' class.",
  MINOR_DUPLICATE_RESERVATION: "This participant is already reserved for this class.",
  MINOR_OVERLAPPING_RESERVATION: "This participant already has another class during this time.",
};

export const GIRLS_CLASS_CATEGORY = "GIRLS_JIU_JITSU_SELF_DEFENSE";

export function isGirlsClass(occurrence: Pick<ClassOccurrence, "canonicalCategory" | "audienceGroup">) {
  return occurrence.canonicalCategory === GIRLS_CLASS_CATEGORY || occurrence.audienceGroup === "FEMALE_YOUTH";
}

export function minorAgeAt(dateOfBirth: Date, at: Date) {
  let age = at.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const month = at.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (month < 0 || (month === 0 && at.getUTCDate() < dateOfBirth.getUTCDate())) age -= 1;
  return age;
}

function result(
  code: BookingEligibilityCode,
  extra: Partial<BookingEligibility> = {},
): BookingEligibility {
  return {
    eligible: code === "ELIGIBLE" || code === "CLASS_FULL_WAITLIST_AVAILABLE",
    code,
    message: messages[code],
    waitlistAllowed: false,
    source: "legacy",
    ...extra,
  };
}

function zonedDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

export function getMembershipWeekStart(
  occurrenceStart: Date,
  weekStartDay = 1,
  timezone = "America/Los_Angeles",
) {
  const { year, month, day } = zonedDateParts(occurrenceStart, timezone);
  const localNoon = new Date(Date.UTC(year, month - 1, day, 12));
  const daysSinceWeekStart = (localNoon.getUTCDay() - weekStartDay + 7) % 7;
  localNoon.setUTCDate(localNoon.getUTCDate() - daysSinceWeekStart);
  return localNoon;
}

function normalizedClassCategories(classType: typeof classTypes.$inferSelect | null) {
  if (!classType) return [];
  if (classType.canonicalCategory === "GIRLS_JIU_JITSU_SELF_DEFENSE") {
    return ["girls_skill", "GIRLS_JIU_JITSU_SELF_DEFENSE"];
  }
  if (classType.canonicalCategory === "JIU_JITSU_SELF_DEFENSE") {
    return ["skill", "jiu_jitsu_self_defense", "JIU_JITSU_SELF_DEFENSE"];
  }
  if (classType.canonicalCategory === "STRENGTH_CONDITIONING") {
    return ["strength", "strength_conditioning", "STRENGTH_CONDITIONING"];
  }
  const text = [classType.category, classType.name, classType.matchPattern]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[-_]/g, " ");
  const categories: string[] = [];
  if (text.includes("strength") || text.includes("fitness") || text.includes("conditioning")) {
    categories.push("strength", "strength_conditioning", "STRENGTH_CONDITIONING");
  }
  if (text.includes("jiu") || text.includes("self defense") || text.includes("skill")) {
    categories.push("skill", "jiu_jitsu_self_defense", "JIU_JITSU_SELF_DEFENSE");
  }
  if (!categories.length && classType.category) categories.push(classType.category.toLowerCase());
  return categories;
}

function discoveryCategory(classType: typeof classTypes.$inferSelect | null): DiscoveryCategory | null {
  const categories = normalizedClassCategories(classType);
  if (categories.some((category) => ["skill", "jiu_jitsu_self_defense", "JIU_JITSU_SELF_DEFENSE"].includes(category))) {
    return "SKILL";
  }
  if (categories.some((category) => ["strength", "strength_conditioning", "STRENGTH_CONDITIONING"].includes(category))) {
    return "STRENGTH";
  }
  return null;
}

function includesCategory(eligibleCategories: unknown, categories: string[]) {
  if (!Array.isArray(eligibleCategories) || eligibleCategories.length === 0) return true;
  const normalized = eligibleCategories.map((category) => String(category).toLowerCase().replace(/[-_]/g, " "));
  return categories.some((category) => normalized.includes(category.toLowerCase().replace(/[-_]/g, " ")));
}

async function activeMembership(userId: string, at: Date, executor: SelectExecutor) {
  const rows = await executor.select({
    membership: memberships,
    plan: membershipPlans,
  }).from(memberships)
    .leftJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
    .where(and(
      eq(memberships.userId, userId),
      inArray(memberships.status, ["active", "ACTIVE"]),
      lte(memberships.startDate, at),
      or(isNull(memberships.endDate), gte(memberships.endDate, at)),
    ))
    .orderBy(asc(memberships.startDate));
  return rows.at(-1);
}

async function discoveryForUser(userId: string, at: Date, executor: SelectExecutor) {
  const rows = await executor.select({
    pass: discoveryPasses,
    entitlement: discoveryEntitlements,
  }).from(discoveryPasses)
    .leftJoin(discoveryEntitlements, eq(discoveryEntitlements.discoveryPassId, discoveryPasses.id))
    .where(and(
      eq(discoveryPasses.userId, userId),
      lte(discoveryPasses.claimTimestamp, at),
      gte(discoveryPasses.expirationTimestamp, at),
      inArray(discoveryPasses.status, ["CLAIMED", "PARTIALLY_BOOKED", "PARTIALLY_ATTENDED"]),
    ));
  return rows;
}

export async function evaluateBookingEligibility(
  user: User,
  occurrence: ClassOccurrence,
): Promise<BookingEligibility> {
  return evaluateBookingEligibilityWithExecutor(user, occurrence, db);
}

export async function evaluateBookingEligibilityWithExecutor(
  user: User,
  occurrence: ClassOccurrence,
  executor: SelectExecutor,
): Promise<BookingEligibility> {
  const now = new Date();
  if (occurrence.start <= now || occurrence.status !== "active" || !occurrence.bookingEnabled) {
    return result("BOOKING_WINDOW_CLOSED");
  }
  if (isGirlsClass(occurrence)) return result("MINOR_PROFILE_REQUIRED");

  const classType = occurrence.classTypeId
    ? (await executor.select().from(classTypes).where(eq(classTypes.id, occurrence.classTypeId))).at(0) || null
    : null;
  const categories = normalizedClassCategories(classType);
  const requiredBookingForms = await executor.select({ id: forms.id })
    .from(forms)
    .where(eq(forms.requiredBeforeBooking, true));
  if (requiredBookingForms.length) {
    const submittedForms = await executor.select({ formId: formResponses.formId })
      .from(formResponses)
      .where(and(
        eq(formResponses.userId, user.id),
        eq(formResponses.status, "submitted"),
        inArray(formResponses.formId, requiredBookingForms.map((form) => form.id)),
      ));
    if (new Set(submittedForms.map((response) => response.formId)).size < requiredBookingForms.length) {
      return result("REQUIRED_FORM_INCOMPLETE");
    }
  }
  const membership = await activeMembership(user.id, occurrence.start, executor);
  const discoveryRows = await discoveryForUser(user.id, occurrence.start, executor);
  const pass = discoveryRows[0]?.pass;
  const [historicalPass] = await executor.select({ pass: discoveryPasses }).from(discoveryPasses)
    .where(eq(discoveryPasses.userId, user.id))
    .orderBy(sql`${discoveryPasses.createdAt} desc`)
    .limit(1);
  const discoveryClassCategory = discoveryCategory(classType);
  const [lifecycle] = await executor.select({ currentState: memberLifecycles.currentState })
    .from(memberLifecycles)
    .where(eq(memberLifecycles.userId, user.id))
    .limit(1);
  const [linkedDiscoveryClaim] = await executor.select({ id: discoveryPassClaims.id })
    .from(discoveryPassClaims)
    .where(eq(discoveryPassClaims.linkedMemberId, user.id))
    .limit(1);
  const discoveryOnboarding = lifecycle?.currentState === "DISCOVERY_ONBOARDING" || Boolean(linkedDiscoveryClaim);

  if (!pass && historicalPass && !membership) {
    return result(historicalPass.pass.expirationTimestamp < now ? "DISCOVERY_EXPIRED" : "MEMBERSHIP_INACTIVE");
  }

  if (pass && !membership) {
    const entitlement = discoveryRows.find((row) => row.entitlement?.category === discoveryClassCategory)?.entitlement;
    if (!discoveryClassCategory) {
      return result("PLAN_NOT_ELIGIBLE", { source: "discovery" });
    }
    if (!entitlement || entitlement.status !== "AVAILABLE") {
      return result(
        discoveryClassCategory === "SKILL" ? "DISCOVERY_SKILL_ALREADY_USED" : "DISCOVERY_STRENGTH_ALREADY_USED",
        { source: "discovery" },
      );
    }
    const base = {
      source: "discovery" as const,
      discoveryEntitlementId: entitlement.id,
      waitlistAllowed: true,
    };
    return await applyReservationChecks(user, occurrence, executor, result("ELIGIBLE", base));
  }

  if (!membership) {
    if (discoveryOnboarding && !historicalPass) {
      return result("DISCOVERY_ACTIVATION_REQUIRED", { source: "discovery" });
    }
    return result(historicalPass ? "DISCOVERY_EXPIRED" : "MEMBERSHIP_INACTIVE");
  }
  const plan = membership.plan;
  if (!plan) {
    return await applyReservationChecks(user, occurrence, executor, result("ELIGIBLE", {
      source: "membership",
      membershipId: membership.membership.id,
      waitlistAllowed: true,
    }));
  }
  if (!includesCategory(plan.eligibleClassCategories, categories)) {
    return result("PLAN_NOT_ELIGIBLE", { source: "membership", membershipId: membership.membership.id, plan });
  }
  const bookingWindow = plan.bookingWindowHours * 60 * 60 * 1000;
  if (occurrence.start.getTime() - now.getTime() > bookingWindow) {
    return result("BOOKING_WINDOW_CLOSED", { source: "membership", membershipId: membership.membership.id, plan });
  }

  const weekStart = getMembershipWeekStart(occurrence.start, plan.weekStartDay, plan.timezone);
  if (plan.weeklySessionLimit !== null) {
    const [usage] = await executor.select({
      reserved: sum(entitlementLedger.reserved),
      released: sum(entitlementLedger.released),
    }).from(entitlementLedger).where(and(
      eq(entitlementLedger.userId, user.id),
      eq(entitlementLedger.membershipId, membership.membership.id),
      eq(entitlementLedger.weekStart, weekStart),
    ));
    const used = Number(usage?.reserved || 0) - Number(usage?.released || 0);
    if (used >= plan.weeklySessionLimit) {
      return result("WEEKLY_LIMIT_REACHED", {
        source: "membership",
        membershipId: membership.membership.id,
        plan,
        weekStart,
      });
    }
  }
  return await applyReservationChecks(user, occurrence, executor, result("ELIGIBLE", {
    source: "membership",
    membershipId: membership.membership.id,
    plan,
    waitlistAllowed: plan.waitlistAllowed,
    weekStart,
  }));
}

export async function evaluateMinorBookingEligibilityWithExecutor(
  minorProfile: MinorProfile,
  occurrence: ClassOccurrence,
  executor: SelectExecutor,
): Promise<BookingEligibility> {
  const now = new Date();
  if (occurrence.start <= now || occurrence.status !== "active" || !occurrence.bookingEnabled) {
    return result("BOOKING_WINDOW_CLOSED", { source: "minor", minorProfileId: minorProfile.id });
  }
  if (!isGirlsClass(occurrence)) {
    return result("GIRLS_CLASS_ONLY", { source: "minor", minorProfileId: minorProfile.id });
  }
  if (minorProfile.consentRevokedAt) {
    return result("MINOR_CONSENT_REVOKED", { source: "minor", minorProfileId: minorProfile.id });
  }
  if (!minorProfile.consentedAt || !minorProfile.consentSignature || !minorProfile.emergencyContactName || !minorProfile.emergencyContactPhone) {
    return result("MINOR_CONSENT_REQUIRED", { source: "minor", minorProfileId: minorProfile.id });
  }
  if (minorAgeAt(minorProfile.dateOfBirth, occurrence.start) < 0 || minorAgeAt(minorProfile.dateOfBirth, occurrence.start) >= 18) {
    return result("MINOR_AGE_RESTRICTED", { source: "minor", minorProfileId: minorProfile.id });
  }

  const duplicate = await executor.select({ id: classReservations.id }).from(classReservations).where(and(
    eq(classReservations.occurrenceId, occurrence.id),
    eq(classReservations.minorProfileId, minorProfile.id),
    inArray(classReservations.status, ["confirmed", "waitlisted"]),
  )).limit(1);
  if (duplicate.length) return result("MINOR_DUPLICATE_RESERVATION", { source: "minor", minorProfileId: minorProfile.id });

  const overlap = await executor.select({ id: classReservations.id })
    .from(classReservations)
    .innerJoin(classOccurrences, eq(classReservations.occurrenceId, classOccurrences.id))
    .where(and(
      eq(classReservations.minorProfileId, minorProfile.id),
      eq(classReservations.status, "confirmed"),
      sql`${classOccurrences.start} < ${occurrence.end}`,
      sql`${classOccurrences.end} > ${occurrence.start}`,
    )).limit(1);
  if (overlap.length) return result("MINOR_OVERLAPPING_RESERVATION", { source: "minor", minorProfileId: minorProfile.id });

  const [confirmed] = await executor.select({ value: count() }).from(classReservations).where(and(
    eq(classReservations.occurrenceId, occurrence.id),
    eq(classReservations.status, "confirmed"),
  ));
  return result(
    Number(confirmed?.value || 0) >= occurrence.capacity ? "CLASS_FULL_WAITLIST_AVAILABLE" : "ELIGIBLE",
    { source: "minor", minorProfileId: minorProfile.id, waitlistAllowed: true },
  );
}

async function applyReservationChecks(
  user: User,
  occurrence: ClassOccurrence,
  executor: SelectExecutor,
  eligibility: BookingEligibility,
) {
  const duplicate = await executor.select({ id: classReservations.id }).from(classReservations).where(and(
    eq(classReservations.occurrenceId, occurrence.id),
    eq(classReservations.userId, user.id),
    inArray(classReservations.status, ["confirmed", "waitlisted"]),
  )).limit(1);
  if (duplicate.length) return result("DUPLICATE_RESERVATION", eligibility);

  const overlap = await executor.select({ id: classReservations.id }).from(classReservations)
    .innerJoin(classOccurrences, eq(classReservations.occurrenceId, classOccurrences.id))
    .where(and(
      eq(classReservations.userId, user.id),
      eq(classReservations.status, "confirmed"),
      sql`${classOccurrences.start} < ${occurrence.end}`,
      sql`${classOccurrences.end} > ${occurrence.start}`,
    )).limit(1);
  if (overlap.length) return result("OVERLAPPING_RESERVATION", eligibility);

  const [confirmed] = await executor.select({ value: count() }).from(classReservations).where(and(
    eq(classReservations.occurrenceId, occurrence.id),
    eq(classReservations.status, "confirmed"),
  ));
  if (Number(confirmed?.value || 0) >= occurrence.capacity) {
    if (!eligibility.waitlistAllowed) return result("PLAN_NOT_ELIGIBLE", eligibility);
    return result("CLASS_FULL_WAITLIST_AVAILABLE", eligibility);
  }
  return eligibility;
}

export { discoveryCategory };