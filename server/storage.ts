import { 
  trainers, 
  bookings, 
  adminUsers,
  users,
  emailVerificationTokens,
  passwordResetTokens,
  forms,
  formResponses,
  memberships,
  membershipPlans,
  memberLifecycles,
  memberLifecycleEvents,
  memberGoals,
  emergencyContacts,
  minorProfiles,
  discoveryPasses,
  discoveryEntitlements,
  entitlementLedger,
  memberAuditEvents,
  sessionNotes,
  webhookEvents,
  calendarConnections,
  classTypes,
  classOccurrences,
  classReservations,
  classReservationEvents,
  analyticsEvents,
  discoveryPassClaims,
  notificationOutbox,
  type Trainer, 
  type InsertTrainer,
  type Booking,
  type InsertBooking,
  type BookingWithTrainer,
  type AdminUser,
  type InsertAdminUser,
  type User,
  type InsertUser,
  type SafeUser,
  type AccountStatus,
  type Form,
  type InsertForm,
  type FormResponse,
  type InsertFormResponse,
  type FormResponseWithForm,
  type Membership,
  type InsertMembership,
  type MembershipPlan,
  type InsertMembershipPlan,
  type MemberLifecycle,
  type DiscoveryPass,
  type DiscoveryEntitlement,
  type EntitlementLedger,
  type SessionNote,
  type InsertSessionNote,
  type CalendarConnection,
  type ClassType,
  type ClassOccurrence,
  type ClassReservation,
  type MinorProfile
  , type DiscoveryPassClaim
  , type NotificationOutbox
} from "@shared/schema";
import { db } from "./db";
 import { eq, and, gte, gt, lt, lte, desc, asc, sql, count, sum, or, ilike, inArray, isNotNull, isNull, not } from "drizzle-orm";

export class ClassBookingError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
    this.name = "ClassBookingError";
  }
}
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { canRetryWebhook, INTERNAL_TEST_EMAIL_PATTERN, isPublicOccurrenceText } from "./route-security";
import {
  canRestoreDiscoveryEntitlement,
  discoveryCategory,
  evaluateBookingEligibilityWithExecutor,
  evaluateMinorBookingEligibilityWithExecutor,
  getMembershipWeekStart,
  isWithinMemberBookingWindow,
  type BookingEligibility,
} from "./member-entitlements";
import { enqueueNotification } from "./notification-outbox";
import { classLifecycleEmailContent, getBookingStaffEmail } from "./email";
import { BOOKING_OPERATIONS, formatBookingDateTime, isAllowedClassWeekday } from "@shared/booking-operations";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const DEFAULT_REPORT_TIMEZONE = "America/Los_Angeles";
const BOOKING_EMAIL_FROM = "Ground Up <info@groundupbjj.com>";
const NOTIFICATION_EMAIL_SUPPRESSION = /@example\.invalid$/i;

function bookingTokenKey() {
  return createHash("sha256")
    .update(process.env.SESSION_SECRET || "development-only-session-secret")
    .digest();
}

function encryptManageToken(token?: string) {
  if (!token) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", bookingTokenKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptManageToken(value?: string | null) {
  if (!value) return undefined;
  try {
    const [ivValue, tagValue, encryptedValue] = value.split(".");
    const decipher = createDecipheriv("aes-256-gcm", bookingTokenKey(), Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return undefined;
  }
}

function suppressBookingEmail(email?: string | null) {
  return !email || NOTIFICATION_EMAIL_SUPPRESSION.test(email);
}

function displayParticipantName(
  reservation: { visitorFirstName: string | null; visitorLastName: string | null },
  minor?: { firstName: string; lastName: string } | null,
) {
  return minor ? `${minor.firstName} ${minor.lastName}` : `${reservation.visitorFirstName || ""} ${reservation.visitorLastName || ""}`.trim();
}

function absoluteManageUrl(path?: string) {
  return path || undefined;
}

async function enqueueClassMemberNotification(
  tx: any,
  input: {
    reservation: ClassReservation;
    occurrence: ClassOccurrence;
    participantName: string;
    status: "confirmed" | "waitlisted" | "cancelled" | "promoted";
    event: string;
    manageUrl?: string;
  },
) {
  const recipient = input.reservation.visitorEmail || "";
  if (suppressBookingEmail(recipient)) return;
  const locale = input.reservation.locale === "es" ? "es" : "en";
  const starts = formatBookingDateTime(input.occurrence.start, locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const ends = formatBookingDateTime(input.occurrence.end, locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const copy = classLifecycleEmailContent({
    classTitle: input.occurrence.title,
    starts,
    ends,
    manageUrl: absoluteManageUrl(input.manageUrl),
    participantName: input.participantName,
    status: input.status,
    waitlistPosition: input.reservation.waitlistPosition,
    locale,
  });
  await enqueueNotification(tx, {
    deduplicationKey: `member:${input.reservation.id}:${input.occurrence.id}:${input.event}:1`,
    kind: "class_member_lifecycle",
    recipient,
    subject: copy.subject,
    body: locale === "es"
      ? `Hola ${input.participantName || "there"},\n\n${copy.body}\n\nGround Up Jiu-Jitsu & Fitness`
      : `Hi ${input.participantName || "there"},\n\n${copy.body}\n\nGround Up Jiu-Jitsu & Fitness`,
    metadata: {
      reservationId: input.reservation.id,
      occurrenceId: input.occurrence.id,
      event: input.event,
      status: input.status,
    },
  });
}

async function enqueueStaffNotification(
  tx: any,
  input: {
    reservation: ClassReservation;
    occurrence: ClassOccurrence;
    participantName: string;
    event: string;
    message: string;
  },
) {
  const recipient = getBookingStaffEmail();
  if (suppressBookingEmail(recipient)) return;
  await enqueueNotification(tx, {
    deduplicationKey: `staff:${input.reservation.id}:${input.occurrence.id}:${input.event}:1`,
    kind: "class_staff_lifecycle",
    recipient,
    subject: input.message,
    body: [
      input.message,
      "",
      `Participant: ${input.participantName || "Unknown"}`,
      `Class: ${input.occurrence.title}`,
      `Starts: ${input.occurrence.start.toISOString()}`,
      `Reservation: ${input.reservation.id}`,
      `Address: ${BOOKING_OPERATIONS.location.address}`,
    ].join("\n"),
    metadata: {
      reservationId: input.reservation.id,
      occurrenceId: input.occurrence.id,
      event: input.event,
    },
  });
}

const operationalMemberCondition = () => and(
  eq(users.role, "member"),
  not(ilike(users.email, INTERNAL_TEST_EMAIL_PATTERN)),
  isNotNull(users.emailVerifiedAt),
  not(inArray(users.accountStatus, ["unverified", "suspicious", "archived"])),
);

function validReportTimezone(timezone?: string) {
  if (!timezone) return DEFAULT_REPORT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return timezone;
  } catch {
    return DEFAULT_REPORT_TIMEZONE;
  }
}

function reportRange(input: { days?: number; from?: Date; to?: Date; timezone?: string }, maxDays: number) {
  const to = input.to || new Date();
  const requestedDays = Math.min(maxDays, Math.max(1, Math.round(input.days || 30)));
  const from = input.from || new Date(to.getTime() - requestedDays * 24 * 60 * 60 * 1000);
  const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)));
  return { from, to, days, timezone: validReportTimezone(input.timezone) };
}

export interface IStorage {
  getUserById(id: string): Promise<User | undefined>;
  listMinorProfiles(guardianUserId: string): Promise<MinorProfile[]>;
  createMinorProfile(data: Omit<MinorProfile, "id" | "createdAt" | "updatedAt">): Promise<MinorProfile>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(email: string, password: string, firstName: string, lastName: string, phone?: string, locale?: "en" | "es", security?: { ipHash?: string; deviceHash?: string; accountStatus?: string; riskReasons?: string[] }): Promise<SafeUser>;
  createUserFromWebhook(email: string, firstName: string, lastName: string): Promise<SafeUser>;
  validateUserPassword(email: string, password: string): Promise<SafeUser | null>;
  createEmailVerificationToken(userId: string, tokenHash: string, expiresAt: Date, discoveryPassClaimId?: string | null): Promise<void>;
  consumeEmailVerificationToken(tokenHash: string): Promise<SafeUser | undefined>;
  resendEmailVerificationToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  getLinkedDiscoveryPassClaim(userId: string): Promise<DiscoveryPassClaim | undefined>;
  updateAccountReview(input: { userId: string; status: AccountStatus; actorId: string; reason: string }): Promise<SafeUser | undefined>;
  countRecentSignupsBySignal(signal: "ip" | "device", hash: string, since: Date): Promise<number>;
  createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  consumePasswordResetToken(tokenHash: string, newPassword: string): Promise<boolean>;
  ensureAdminPassword(email: string, password: string): Promise<boolean>;
  updateUser(id: string, updates: Partial<Pick<User, 'firstName' | 'lastName' | 'phone' | 'locale' | 'role' | 'beltRank' | 'attendanceCount' | 'assignedCoachId' | 'adminNotes'>>): Promise<SafeUser | undefined>;
  
  getForms(): Promise<Form[]>;
  getForm(id: string): Promise<Form | undefined>;
  getFormBySlug(slug: string): Promise<Form | undefined>;
  createForm(form: InsertForm): Promise<Form>;
  
  getUserFormResponses(userId: string): Promise<FormResponseWithForm[]>;
  getFormResponse(userId: string, formId: string): Promise<FormResponse | undefined>;
  saveFormResponse(userId: string, formId: string, answers: any, status: string): Promise<FormResponse>;
  submitFormResponse(userId: string, formId: string): Promise<FormResponse | undefined>;
  getAllFormResponses(): Promise<(FormResponse & { user: SafeUser; form: Form })[]>;
  
  getUserBookings(userId: string): Promise<BookingWithTrainer[]>;
  createUserBooking(userId: string, booking: Omit<InsertBooking, 'userId'>): Promise<Booking>;
  cancelUserBooking(userId: string, bookingId: string): Promise<Booking | undefined>;
  
  getTrainers(): Promise<Trainer[]>;
  getTrainer(id: string): Promise<Trainer | undefined>;
  createTrainer(trainer: InsertTrainer): Promise<Trainer>;
  updateTrainerAvailability(id: string, availability: any): Promise<Trainer | undefined>;
  
  getBookings(filters?: { trainerId?: string; status?: string; startDate?: Date; endDate?: Date; coachId?: string }): Promise<BookingWithTrainer[]>;
  getBookingForCoach(id: string, coachId: string): Promise<BookingWithTrainer | undefined>;
  getBooking(id: string): Promise<BookingWithTrainer | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: string, status: string, stripeSessionId?: string): Promise<Booking | undefined>;
  updateBookingStatusForCoach(id: string, coachId: string, status: string, stripeSessionId?: string): Promise<Booking | undefined>;
  cancelBooking(id: string): Promise<Booking | undefined>;
  cancelBookingForCoach(id: string, coachId: string): Promise<Booking | undefined>;
  getTrainerBookings(trainerId: string, startDate: Date, endDate: Date): Promise<Booking[]>;
  
  getAllUsers(search?: string, page?: number, limit?: number, incompleteFormsOnly?: boolean): Promise<{ users: (SafeUser & { missingFormsCount?: number })[]; total: number }>;
  getAccountReviewQueue(status?: AccountStatus): Promise<SafeUser[]>;
  getMembersNeedingForms(): Promise<Array<SafeUser & { missingForms: string[] }>>;
  getUserProfile(userId: string): Promise<{ user: SafeUser; formResponses: (FormResponse & { form: Form })[]; bookings: BookingWithTrainer[]; classReservations: Array<ClassReservation & { occurrence: ClassOccurrence; trainer: Trainer | null; classType: ClassType | null; minorProfile: MinorProfile | null }>; memberships: Membership[]; sessionNotes: (SessionNote & { coach: SafeUser })[] } | undefined>;
  updateAdminNotes(userId: string, notes: string): Promise<SafeUser | undefined>;
  
  getAdminStats(): Promise<{
    totalUsers: number;
    newUsers30Days: number;
    activeMemberships: number;
    upcomingSessions7Days: number;
    monthlyRevenue: number;
    membersNeedingForms: number;
    totalRequiredForms: number;
    signupFunnel30Days: {
      accountsCreated: number;
      formsIncomplete: number;
      formsComplete: number;
      passActivated: number;
      bookingCompleted: number;
      blockedNoEntitlement: number;
    };
  }>;
  
  getMemberships(userId: string): Promise<Membership[]>;
  createMembership(membership: InsertMembership): Promise<Membership>;
  updateMembership(id: string, updates: Partial<Pick<Membership, 'status' | 'endDate'>>): Promise<Membership | undefined>;
  
  getSessionNotes(userId: string): Promise<(SessionNote & { coach: SafeUser })[]>;
  createSessionNote(note: InsertSessionNote): Promise<SessionNote>;
  
  getCoachMembers(coachId: string): Promise<SafeUser[]>;
  
  createCalendlyBooking(data: { eventId: string; email: string; eventType: string; startTime: Date; paymentStatus: string; amount: number }): Promise<Booking>;
  startWebhookEvent(provider: string, eventId: string): Promise<boolean>;
  completeWebhookEvent(provider: string, eventId: string): Promise<void>;
  failWebhookEvent(provider: string, eventId: string, error: string, terminal?: boolean): Promise<void>;
  getBookingByCalendlyEventId(eventId: string): Promise<Booking | undefined>;

  getCalendarConnection(): Promise<CalendarConnection | undefined>;
  saveCalendarConnection(data: Partial<CalendarConnection> & { provider?: string }): Promise<CalendarConnection>;
  getClassTypes(): Promise<ClassType[]>;
  getClassType(id: string): Promise<ClassType | undefined>;
  createClassType(data: Omit<ClassType, "id" | "createdAt" | "updatedAt">): Promise<ClassType>;
  updateClassType(id: string, data: Partial<Omit<ClassType, "id" | "createdAt" | "updatedAt">>): Promise<ClassType | undefined>;
  listClassOccurrences(from: Date, to: Date, firstVisitOnly?: boolean, includeDisabled?: boolean): Promise<Array<ClassOccurrence & { confirmedCount: number; waitlistCount: number; trainer: Trainer | null; classType: ClassType | null }>>;
  getClassOccurrence(id: string): Promise<ClassOccurrence | undefined>;
  getClassOccurrenceByGoogleEvent(calendarId: string, eventId: string): Promise<ClassOccurrence | undefined>;
  upsertClassOccurrence(data: Omit<ClassOccurrence, "id" | "createdAt" | "updatedAt">): Promise<ClassOccurrence>;
  updateClassOccurrence(id: string, data: Partial<Pick<ClassOccurrence, "classTypeId" | "trainerId" | "instructorName" | "capacity" | "firstVisitEligible" | "bookingEnabled" | "audience" | "syncState" | "syncError">>): Promise<ClassOccurrence | undefined>;
  reconcileMissingClassOccurrences(calendarId: string, from: Date, to: Date, seenEventIds: string[]): Promise<ClassOccurrence[]>;
  cancelOccurrenceReservations(occurrenceId: string, reason: string): Promise<ClassReservation[]>;
  markClassOccurrenceSyncError(id: string, error: string): Promise<void>;
  reserveClassOccurrence(input: {
    occurrenceId: string;
    userId?: string;
    minorProfileId?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    locale?: "en" | "es";
    experience?: string;
    manageTokenHash?: string;
    manageToken?: string;
    manageUrl?: string;
    idempotencyKey?: string;
    source?: string;
  }): Promise<{ reservation: ClassReservation; occurrence: ClassOccurrence; promoted?: ClassReservation; manageToken?: string }>;
  getUserClassReservations(userId: string): Promise<Array<ClassReservation & { occurrence: ClassOccurrence; trainer: Trainer | null; classType: ClassType | null; minorProfile: MinorProfile | null }>>;
  getGuardianMinorReservations(guardianUserId: string): Promise<Array<ClassReservation & {
    occurrence: ClassOccurrence;
    minorProfile: Pick<MinorProfile, "id" | "firstName" | "lastName" | "consentRevokedAt">;
  }>>;
  getClassReservation(id: string): Promise<(ClassReservation & { occurrence: ClassOccurrence }) | undefined>;
  getClassReservationReport(filters?: { status?: string; startDate?: Date; endDate?: Date }): Promise<Array<ClassReservation & {
    occurrence: ClassOccurrence;
    user: Pick<User, "id" | "firstName" | "lastName" | "email"> | null;
    minorProfile: Pick<MinorProfile, "id" | "firstName" | "lastName"> | null;
  }>>;
  cancelClassReservation(input: { reservationId: string; userId?: string; manageTokenHash?: string; reason?: string; source?: "member" | "public" | "provider_calendar" | "admin"; staffActorId?: string; manageUrl?: string }): Promise<{ reservation: ClassReservation; promoted?: ClassReservation }>;
  moveClassReservation(input: { reservationId: string; replacementOccurrenceId: string; actorId: string; reason: string }): Promise<{ reservation: ClassReservation; occurrence: ClassOccurrence; discoveryExceptionApplied: boolean }>;
  getOccurrenceReservations(occurrenceId: string): Promise<{
    confirmed: Array<ClassReservation & { minorProfile: Pick<MinorProfile, "id" | "firstName" | "lastName"> | null; moveCompleted: boolean }>;
    waitlisted: Array<ClassReservation & { minorProfile: Pick<MinorProfile, "id" | "firstName" | "lastName"> | null; moveCompleted: boolean }>;
    cancelled: Array<ClassReservation & { minorProfile: Pick<MinorProfile, "id" | "firstName" | "lastName"> | null; moveCompleted: boolean }>;
  }>;
  updateClassReservation(id: string, updates: Partial<Pick<ClassReservation, "status" | "attendance" | "cancellationReason">>, actorId?: string, reason?: string): Promise<ClassReservation | undefined>;
  recordClassReservationEvent(data: { reservationId?: string; occurrenceId?: string; event: string; metadata?: Record<string, unknown> }): Promise<void>;
  
  deleteFormResponse(userId: string, formId: string): Promise<void>;

  getAdminUser(email: string): Promise<AdminUser | undefined>;
  createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser>;

  createTrialLead(lead: import("@shared/schema").InsertTrialLead): Promise<import("@shared/schema").TrialLead>;
  getTrialLeads(program?: string, options?: { includeSuppressed?: boolean; status?: import("@shared/schema").LeadStatus }): Promise<import("@shared/schema").TrialLead[]>;
  updateTrialLeadStatus(id: string, status: import("@shared/schema").LeadStatus): Promise<import("@shared/schema").TrialLead | undefined>;
  createContactSubmission(data: import("@shared/schema").InsertContactSubmission): Promise<import("@shared/schema").ContactSubmission>;
  getContactSubmissions(): Promise<import("@shared/schema").ContactSubmission[]>;
  updateContactSubmissionStatus(id: string, status: import("@shared/schema").ContactStatus): Promise<import("@shared/schema").ContactSubmission | undefined>;
  createAnalyticsEvent(data: import("@shared/schema").InsertAnalyticsEvent): Promise<import("@shared/schema").AnalyticsEvent>;
  createOrGetDiscoveryPassClaim(data: import("@shared/schema").InsertDiscoveryPassClaim): Promise<{ claim: DiscoveryPassClaim; created: boolean }>;
  getDiscoveryPassClaim(id: string): Promise<DiscoveryPassClaim | undefined>;
  markDiscoveryPassClaimContinuation(id: string): Promise<DiscoveryPassClaim | undefined>;
  linkDiscoveryPassClaim(id: string, memberId: string, email: string): Promise<DiscoveryPassClaim | undefined>;
  markDiscoveryOnboarding(userId: string, source?: string): Promise<MemberLifecycle>;
  getDiscoveryAbReport(filters?: { days?: number; from?: Date; to?: Date; timezone?: string }): Promise<{
    range: { from: string; to: string; days: number; timezone: string };
    variants: Record<"A" | "B", {
      stages: Record<string, number>;
      conversion: Record<string, { fromPrevious: number | null; overall: number | null }>;
      source: string;
    }>;
    combined: {
      stages: Record<string, number>;
      conversion: Record<string, { fromPrevious: number | null; overall: number | null }>;
    };
    byLocale: Record<"en" | "es", Record<"A" | "B", { stages: Record<string, number>; consentedSessions: number }>>;
  }>;
  getCampaignReport(filters: {
    funnel: "training" | "adaptive_capacity";
    source?: string;
    medium?: string;
    campaign?: string;
    landingPath?: string;
    from?: Date;
    to?: Date;
    timezone?: string;
  }): Promise<{
    funnel: string;
    filters: Record<string, string>;
    totals: { pageViews: number; funnelSteps: number; formStarts: number; submissions: number; successfulLeads: number; totalLeads: number; consentedSessions: number };
    breakdown: Array<{ source: string; medium: string; campaign: string; landingPath: string; pageViews: number; funnelSteps: number; formStarts: number; submissions: number; successfulLeads: number; totalLeads: number; consentedSessions: number }>;
  }>;
  getDiscoveryFunnelReport(filters?: { days?: number; locale?: "en" | "es"; from?: Date; to?: Date; timezone?: string }): Promise<{
    range: { from: string; to: string; days: number; timezone: string };
    stages: Record<string, number>;
    conversion: Record<string, { fromPrevious: number | null; overall: number | null }>;
    diagnostics: Record<string, number>;
    consented: { sessions: number; stages: Record<string, number> };
    byLocale: Record<string, { stages: Record<string, number>; consentedSessions: number }>;
    byAttribution: Array<{ source: string; medium: string; campaign: string; landingPath: string; consentedSessions: number; stages: Record<string, number> }>;
    sources: Record<string, string>;
  }>;
  createStaffNotification(data: { kind: string; title: string; message: string; href: string }): Promise<import("@shared/schema").StaffNotification>;
  getStaffNotifications(): Promise<import("@shared/schema").StaffNotification[]>;
  markStaffNotificationRead(id: string): Promise<import("@shared/schema").StaffNotification | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async listMinorProfiles(guardianUserId: string): Promise<MinorProfile[]> {
    return db.select().from(minorProfiles)
      .where(eq(minorProfiles.guardianUserId, guardianUserId))
      .orderBy(asc(minorProfiles.firstName), asc(minorProfiles.lastName));
  }

  async createMinorProfile(data: Omit<MinorProfile, "id" | "createdAt" | "updatedAt">): Promise<MinorProfile> {
    const [profile] = await db.insert(minorProfiles).values(data).returning();
    return profile;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async createUser(email: string, password: string, firstName: string, lastName: string, phone?: string, locale: "en" | "es" = "en", security?: { ipHash?: string; deviceHash?: string; accountStatus?: string; riskReasons?: string[] }): Promise<SafeUser> {
    const passwordHash = await bcrypt.hash(password, 10);
    const [newUser] = await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      phone: phone || null,
      locale,
      role: "member",
      signupIpHash: security?.ipHash || null,
      signupDeviceHash: security?.deviceHash || null,
      accountStatus: security?.accountStatus || "unverified",
      riskReasons: security?.riskReasons || [],
    }).returning();
    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;
  }

  async createUserFromWebhook(email: string, firstName: string, lastName: string): Promise<SafeUser> {
    const tempPassword = await bcrypt.hash(randomUUID(), 10);
    const [newUser] = await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash: tempPassword,
      firstName,
      lastName,
      role: "member",
      accountStatus: "legitimate",
      emailVerifiedAt: new Date(),
    }).returning();
    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;
  }

  async validateUserPassword(email: string, password: string): Promise<SafeUser | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async createEmailVerificationToken(userId: string, tokenHash: string, expiresAt: Date, discoveryPassClaimId: string | null = null): Promise<void> {
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
    await db.insert(emailVerificationTokens).values({ userId, tokenHash, expiresAt, discoveryPassClaimId });
  }

  async resendEmailVerificationToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
    await db.insert(emailVerificationTokens).values({ userId, tokenHash, expiresAt });
  }

  async consumeEmailVerificationToken(tokenHash: string): Promise<SafeUser | undefined> {
    return db.transaction(async (tx) => {
      const [token] = await tx.select().from(emailVerificationTokens).where(and(
        eq(emailVerificationTokens.tokenHash, tokenHash),
        isNull(emailVerificationTokens.usedAt),
        gt(emailVerificationTokens.expiresAt, new Date()),
      )).limit(1);
      if (!token) return undefined;

      const [user] = await tx.update(users).set({
        emailVerifiedAt: new Date(),
        accountStatus: sql`case when ${users.accountStatus} = 'unverified' then 'legitimate' else ${users.accountStatus} end`,
      }).where(eq(users.id, token.userId)).returning();
      await tx.update(emailVerificationTokens).set({ usedAt: new Date() }).where(eq(emailVerificationTokens.id, token.id));
      if (!user) return undefined;
      const { passwordHash: _, ...safeUser } = user;
      return safeUser;
    });
  }

  async getLinkedDiscoveryPassClaim(userId: string): Promise<DiscoveryPassClaim | undefined> {
    const [claim] = await db.select().from(discoveryPassClaims).where(eq(discoveryPassClaims.linkedMemberId, userId)).orderBy(desc(discoveryPassClaims.createdAt)).limit(1);
    return claim;
  }

  async updateAccountReview(input: { userId: string; status: AccountStatus; actorId: string; reason: string }): Promise<SafeUser | undefined> {
    return db.transaction(async (tx) => {
      const [before] = await tx.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!before) return undefined;
      const previousReasons = Array.isArray(before.riskReasons) ? before.riskReasons : [];
      const nextReasons = input.status === "legitimate"
        ? previousReasons
        : Array.from(new Set([...previousReasons, input.reason])).slice(-20);
      const [updated] = await tx.update(users).set({
        accountStatus: input.status,
        riskReasons: nextReasons,
      }).where(eq(users.id, input.userId)).returning();
      await tx.insert(memberAuditEvents).values({
        actorId: input.actorId,
        userId: input.userId,
        targetType: "user",
        targetId: input.userId,
        action: "account_status_changed",
        before: { accountStatus: before.accountStatus, riskReasons: previousReasons },
        after: { accountStatus: updated.accountStatus, riskReasons: nextReasons },
        reason: input.reason,
      });
      const { passwordHash: _, ...safeUser } = updated;
      return safeUser;
    });
  }

  async countRecentSignupsBySignal(signal: "ip" | "device", hash: string, since: Date): Promise<number> {
    const column = signal === "ip" ? users.signupIpHash : users.signupDeviceHash;
    const [result] = await db.select({ count: count() }).from(users).where(and(
      gte(users.createdAt, since),
      eq(column, hash),
    ));
    return Number(result?.count || 0);
  }

  async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    await db.insert(passwordResetTokens).values({ userId, tokenHash, expiresAt });
  }

  async consumePasswordResetToken(tokenHash: string, newPassword: string): Promise<boolean> {
    return db.transaction(async (tx) => {
      const [token] = await tx.select().from(passwordResetTokens).where(and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      )).limit(1);
      if (!token) return false;

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await tx.update(users).set({ passwordHash }).where(eq(users.id, token.userId));
      await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, token.id));
      return true;
    });
  }

  async ensureAdminPassword(email: string, password: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    if (!user || user.role !== "admin") return false;
    if (await bcrypt.compare(password, user.passwordHash)) return true;

    const passwordHash = await bcrypt.hash(password, 10);
    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.id, user.id));
    return true;
  }

  async updateUser(id: string, updates: Partial<Pick<User, 'firstName' | 'lastName' | 'phone' | 'locale' | 'role' | 'beltRank' | 'attendanceCount' | 'assignedCoachId' | 'adminNotes'>>): Promise<SafeUser | undefined> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (!updated) return undefined;
    const { passwordHash: _, ...safeUser } = updated;
    return safeUser;
  }

  async getForms(): Promise<Form[]> {
    return await db.select().from(forms);
  }

  async getForm(id: string): Promise<Form | undefined> {
    const [form] = await db.select().from(forms).where(eq(forms.id, id));
    return form;
  }

  async getFormBySlug(slug: string): Promise<Form | undefined> {
    const [form] = await db.select().from(forms).where(eq(forms.slug, slug));
    return form;
  }

  async createForm(form: InsertForm): Promise<Form> {
    const [newForm] = await db.insert(forms).values(form).returning();
    return newForm;
  }

  async getUserFormResponses(userId: string): Promise<FormResponseWithForm[]> {
    const results = await db
      .select()
      .from(formResponses)
      .leftJoin(forms, eq(formResponses.formId, forms.id))
      .where(eq(formResponses.userId, userId));
    
    return results.map(r => ({
      ...r.form_responses,
      form: r.forms!
    }));
  }

  async getFormResponse(userId: string, formId: string): Promise<FormResponse | undefined> {
    const [response] = await db
      .select()
      .from(formResponses)
      .where(and(eq(formResponses.userId, userId), eq(formResponses.formId, formId)));
    return response;
  }

  async saveFormResponse(userId: string, formId: string, answers: any, status: string): Promise<FormResponse> {
    const existing = await this.getFormResponse(userId, formId);
    
    if (existing) {
      if (existing.status === "submitted") {
        throw new Error("Cannot modify submitted form");
      }
      const [updated] = await db
        .update(formResponses)
        .set({ answers, status, updatedAt: new Date() })
        .where(eq(formResponses.id, existing.id))
        .returning();
      return updated;
    }
    
    const [newResponse] = await db.insert(formResponses).values({
      userId,
      formId,
      answers,
      status
    }).returning();
    return newResponse;
  }

  async submitFormResponse(userId: string, formId: string): Promise<FormResponse | undefined> {
    const existing = await this.getFormResponse(userId, formId);
    if (!existing) return undefined;
    const form = await this.getForm(formId);
    if (form) {
      const answers = existing.answers && typeof existing.answers === "object" ? existing.answers as Record<string, unknown> : {};
      const missing = (form.fields as Array<{ name?: string; id?: string; type?: string; required?: boolean }>).filter((field) => {
        if (!field.required) return false;
        const key = field.name || field.id;
        const value = key ? answers[key] : undefined;
        if (field.type === "checkbox") return value !== true;
        if (field.type === "multiselect") return !Array.isArray(value) || value.length === 0;
        return value === undefined || value === null || value === "";
      });
      if (missing.length) {
        throw new Error(`Complete all required fields: ${missing.map((field) => field.name || field.id).filter(Boolean).join(", ")}`);
      }
    }
    
    const [updated] = await db
      .update(formResponses)
      .set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() })
      .where(eq(formResponses.id, existing.id))
      .returning();
    return updated;
  }

  async deleteFormResponse(userId: string, formId: string): Promise<void> {
    await db
      .delete(formResponses)
      .where(and(eq(formResponses.userId, userId), eq(formResponses.formId, formId)));
  }

  async getAllFormResponses(): Promise<(FormResponse & { user: SafeUser; form: Form })[]> {
    const results = await db
      .select()
      .from(formResponses)
      .leftJoin(users, eq(formResponses.userId, users.id))
      .leftJoin(forms, eq(formResponses.formId, forms.id));
    
    return results.map(r => {
      const { passwordHash: _, ...safeUser } = r.users!;
      return {
        ...r.form_responses,
        user: safeUser,
        form: r.forms!
      };
    });
  }

  async getUserBookings(userId: string): Promise<BookingWithTrainer[]> {
    const results = await db
      .select()
      .from(bookings)
      .leftJoin(trainers, eq(bookings.trainerId, trainers.id))
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.start));
    
    return results.map(r => ({
      ...r.bookings,
      trainer: r.trainers!
    }));
  }

  async createUserBooking(userId: string, booking: Omit<InsertBooking, 'userId'>): Promise<Booking> {
    return await db.transaction(async (tx) => {
      const [trainer] = await tx
        .select({ id: trainers.id })
        .from(trainers)
        .where(eq(trainers.id, booking.trainerId))
        .for("update");
      if (!trainer) {
        throw new ClassBookingError("TRAINER_NOT_FOUND", "Trainer not found.", 404);
      }

      const [conflict] = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(
          eq(bookings.trainerId, booking.trainerId),
          lt(bookings.start, booking.end),
          gt(bookings.end, booking.start),
          inArray(bookings.status, ["pending", "paid"]),
        ))
        .limit(1);
      if (conflict) {
        throw new ClassBookingError("TIME_SLOT_UNAVAILABLE", "Time slot is already booked.", 409);
      }

      const [newBooking] = await tx.insert(bookings).values({
        ...booking,
        userId,
      }).returning();
      return newBooking;
    });
  }

  async cancelUserBooking(userId: string, bookingId: string): Promise<Booking | undefined> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId)));
    
    if (!booking) return undefined;
    
    const [updated] = await db
      .update(bookings)
      .set({ status: "canceled" })
      .where(eq(bookings.id, bookingId))
      .returning();
    return updated;
  }

  async getTrainers(): Promise<Trainer[]> {
    return await db.select().from(trainers);
  }

  async getTrainer(id: string): Promise<Trainer | undefined> {
    const [trainer] = await db.select().from(trainers).where(eq(trainers.id, id));
    return trainer;
  }

  async createTrainer(trainer: InsertTrainer): Promise<Trainer> {
    const [newTrainer] = await db.insert(trainers).values(trainer).returning();
    return newTrainer;
  }

  async updateTrainerAvailability(id: string, availability: any): Promise<Trainer | undefined> {
    const [updated] = await db
      .update(trainers)
      .set({ availability })
      .where(eq(trainers.id, id))
      .returning();
    return updated;
  }

  async getBookings(filters?: { trainerId?: string; status?: string; startDate?: Date; endDate?: Date; coachId?: string }): Promise<BookingWithTrainer[]> {
    const conditions = [
      or(isNull(users.id), not(ilike(users.email, INTERNAL_TEST_EMAIL_PATTERN))),
      filters?.trainerId ? eq(bookings.trainerId, filters.trainerId) : undefined,
      filters?.status ? eq(bookings.status, filters.status) : undefined,
      filters?.startDate ? gte(bookings.start, filters.startDate) : undefined,
      filters?.endDate ? lte(bookings.end, filters.endDate) : undefined,
      filters?.coachId ? eq(users.assignedCoachId, filters.coachId) : undefined,
    ];
    const result = await db
      .select()
      .from(bookings)
      .leftJoin(trainers, eq(bookings.trainerId, trainers.id))
      .leftJoin(users, eq(bookings.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(bookings.start));
    
    return result.map(row => ({
      ...row.bookings,
      trainer: row.trainers!
    }));
  }

  async getBookingForCoach(id: string, coachId: string): Promise<BookingWithTrainer | undefined> {
    const [result] = await db
      .select()
      .from(bookings)
      .leftJoin(trainers, eq(bookings.trainerId, trainers.id))
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(and(eq(bookings.id, id), eq(users.assignedCoachId, coachId)));
    if (!result) return undefined;
    return { ...result.bookings, trainer: result.trainers! };
  }

  async getBooking(id: string): Promise<BookingWithTrainer | undefined> {
    const [result] = await db
      .select()
      .from(bookings)
      .leftJoin(trainers, eq(bookings.trainerId, trainers.id))
      .where(eq(bookings.id, id));
    
    if (!result) return undefined;
    
    return {
      ...result.bookings,
      trainer: result.trainers!
    };
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async updateBookingStatus(id: string, status: string, stripeSessionId?: string): Promise<Booking | undefined> {
    const updateData: any = { status };
    if (stripeSessionId) {
      updateData.stripeSessionId = stripeSessionId;
    }
    
    const [updated] = await db
      .update(bookings)
      .set(updateData)
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  async updateBookingStatusForCoach(id: string, coachId: string, status: string, stripeSessionId?: string): Promise<Booking | undefined> {
    const booking = await this.getBookingForCoach(id, coachId);
    if (!booking) return undefined;
    return this.updateBookingStatus(id, status, stripeSessionId);
  }

  async cancelBooking(id: string): Promise<Booking | undefined> {
    const [updated] = await db
      .update(bookings)
      .set({ status: "canceled" })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  async cancelBookingForCoach(id: string, coachId: string): Promise<Booking | undefined> {
    const booking = await this.getBookingForCoach(id, coachId);
    if (!booking) return undefined;
    return this.cancelBooking(id);
  }

  async getTrainerBookings(trainerId: string, startDate: Date, endDate: Date): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.trainerId, trainerId),
          gte(bookings.start, startDate),
          lte(bookings.end, endDate),
          eq(bookings.status, "paid")
        )
      );
  }

  private async getRequiredFormIds(): Promise<string[]> {
    const requiredForms = await db.select({ id: forms.id }).from(forms).where(eq(forms.isRequired, true));
    return requiredForms.map(f => f.id);
  }

  private async getCompletedUserIds(requiredFormIds: string[]): Promise<Set<string>> {
    if (requiredFormIds.length === 0) return new Set();
    const completed = await db
      .select({ userId: formResponses.userId })
      .from(formResponses)
      .innerJoin(users, eq(formResponses.userId, users.id))
      .where(and(
        inArray(formResponses.formId, requiredFormIds),
        eq(formResponses.status, "submitted"),
        eq(users.role, "member"),
        not(ilike(users.email, INTERNAL_TEST_EMAIL_PATTERN))
      ))
      .groupBy(formResponses.userId)
      .having(sql`COUNT(*) >= ${requiredFormIds.length}`);
    return new Set(completed.map(u => u.userId));
  }

  async getMembersNeedingForms(): Promise<Array<SafeUser & { missingForms: string[] }>> {
    const requiredFormIds = await this.getRequiredFormIds();
    if (requiredFormIds.length === 0) return [];
    const requiredFormsData = await db.select().from(forms).where(eq(forms.isRequired, true));
    const completedUserIds = await this.getCompletedUserIds(requiredFormIds);
    const allUsers = await db.select().from(users).where(operationalMemberCondition());
    const result: Array<SafeUser & { missingForms: string[] }> = [];
    for (const user of allUsers) {
      if (completedUserIds.has(user.id)) continue;
      const userResponses = await db
        .select({ formId: formResponses.formId })
        .from(formResponses)
        .where(and(eq(formResponses.userId, user.id), eq(formResponses.status, "submitted")));
      const submittedFormIds = new Set(userResponses.map(r => r.formId));
      const missingForms = requiredFormsData
        .filter(f => !submittedFormIds.has(f.id))
        .map(f => f.title);
      if (missingForms.length > 0) {
        const { passwordHash: _, ...safeUser } = user;
        result.push({ ...safeUser, missingForms });
      }
    }
    return result.sort((a, b) => b.missingForms.length - a.missingForms.length);
  }

  async getAllUsers(search?: string, page: number = 1, limit: number = 20, incompleteFormsOnly: boolean = false): Promise<{ users: (SafeUser & { missingFormsCount?: number })[]; total: number }> {
    const offset = (page - 1) * limit;

    if (incompleteFormsOnly) {
      const membersNeeding = await this.getMembersNeedingForms();
      const filtered = search
        ? membersNeeding.filter(u => {
            const q = search.toLowerCase();
            return u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
          })
        : membersNeeding;
      const paginated = filtered.slice(offset, offset + limit);
      return {
        users: paginated.map(u => ({ ...u, missingFormsCount: u.missingForms.length })),
        total: filtered.length,
      };
    }
    
     const visibleUsers = not(ilike(users.email, INTERNAL_TEST_EMAIL_PATTERN));
     let whereClause;
    if (search) {
      const searchTerm = `%${search}%`;
       whereClause = and(visibleUsers, or(
        ilike(users.firstName, searchTerm),
        ilike(users.lastName, searchTerm),
        ilike(users.email, searchTerm),
        ilike(users.phone, searchTerm)
       ));
     } else {
       whereClause = visibleUsers;
    }
    
    const [countResult] = await db
      .select({ count: count() })
      .from(users)
      .where(whereClause);
    
    const allUsers = await db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
    
    return {
      users: allUsers.map(u => {
        const { passwordHash: _, ...safeUser } = u;
        return safeUser;
      }),
      total: countResult.count
    };
  }

  async getAccountReviewQueue(status?: AccountStatus): Promise<SafeUser[]> {
    const whereClause = and(
      eq(users.role, "member"),
      not(ilike(users.email, INTERNAL_TEST_EMAIL_PATTERN)),
      status ? eq(users.accountStatus, status) : inArray(users.accountStatus, ["unverified", "needs_review", "suspicious", "archived", "legitimate"]),
    );
    const rows = await db.select().from(users).where(whereClause).orderBy(desc(users.createdAt)).limit(500);
    return rows.map(({ passwordHash: _, ...safeUser }) => safeUser);
  }

  async getUserProfile(userId: string): Promise<{ user: SafeUser; formResponses: (FormResponse & { form: Form })[]; bookings: BookingWithTrainer[]; classReservations: Array<ClassReservation & { occurrence: ClassOccurrence; trainer: Trainer | null; classType: ClassType | null; minorProfile: MinorProfile | null }>; memberships: Membership[]; sessionNotes: (SessionNote & { coach: SafeUser })[] } | undefined> {
    const user = await this.getUserById(userId);
    if (!user) return undefined;
    const { passwordHash: _, ...safeUser } = user;
    const [userFormResponses, userBookings, userClassReservations, userMemberships, userSessionNotes] = await Promise.all([
      this.getUserFormResponses(userId),
      this.getUserBookings(userId),
      this.getUserClassReservations(userId),
      this.getMemberships(userId),
      this.getSessionNotes(userId),
    ]);
    return {
      user: safeUser,
      formResponses: userFormResponses,
      bookings: userBookings,
      classReservations: userClassReservations,
      memberships: userMemberships,
      sessionNotes: userSessionNotes,
    };
  }

  async updateAdminNotes(userId: string, notes: string): Promise<SafeUser | undefined> {
    return this.updateUser(userId, { adminNotes: notes });
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    newUsers30Days: number;
    activeMemberships: number;
    upcomingSessions7Days: number;
    monthlyRevenue: number;
    membersNeedingForms: number;
    totalRequiredForms: number;
    accountBreakdown: {
      rawAccountsCreated: number;
      verifiedUsers: number;
      unverifiedUsers: number;
      suspiciousUsers: number;
      archivedUsers: number;
      legitimateUsers: number;
      paidCustomers: number;
      filteredOut: number;
    };
    paidCustomers: number;
    newLegitimateProspects30Days: number;
    newPaidCustomers30Days: number;
    signupFunnel30Days: {
      accountsCreated: number;
      formsIncomplete: number;
      formsComplete: number;
      passActivated: number;
      bookingCompleted: number;
      blockedNoEntitlement: number;
    };
  }> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
     const [totalUsersResult] = await db.select({ count: count() }).from(users).where(operationalMemberCondition());
     const [memberUsersResult] = await db.select({ count: count() }).from(users).where(and(
       operationalMemberCondition(),
     ));
    
     const [newUsersResult] = await db.select({ count: count() }).from(users).where(and(
       gte(users.createdAt, thirtyDaysAgo),
       operationalMemberCondition(),
     ));
    
     const [activeMembershipsResult] = await db
       .select({ count: count() })
       .from(memberships)
       .innerJoin(users, eq(memberships.userId, users.id))
       .where(and(
         eq(memberships.status, "active"),
          operationalMemberCondition(),
       ));
    
     const [upcomingSessionsResult] = await db
       .select({ count: count() })
       .from(classReservations)
       .innerJoin(classOccurrences, eq(classReservations.occurrenceId, classOccurrences.id))
       .leftJoin(users, eq(classReservations.userId, users.id))
       .where(and(
          gte(classOccurrences.start, now),
          lte(classOccurrences.start, sevenDaysFromNow),
          eq(classReservations.status, "confirmed"),
          or(isNull(users.id), operationalMemberCondition()),
       ));
    
    const [revenueResult] = await db
      .select({ total: sum(bookings.amountCents) })
      .from(bookings)
       .leftJoin(users, eq(bookings.userId, users.id))
      .where(and(
        gte(bookings.createdAt, startOfMonth),
         eq(bookings.status, "paid"),
         or(isNull(users.id), operationalMemberCondition()),
      ));

     const [accountBreakdownResult] = await db.select({
       rawAccountsCreated: count(),
       verifiedUsers: sql<number>`count(*) filter (where ${users.emailVerifiedAt} is not null)`,
       unverifiedUsers: sql<number>`count(*) filter (where ${users.emailVerifiedAt} is null or ${users.accountStatus} = 'unverified')`,
       suspiciousUsers: sql<number>`count(*) filter (where ${users.accountStatus} in ('suspicious', 'needs_review'))`,
       archivedUsers: sql<number>`count(*) filter (where ${users.accountStatus} = 'archived')`,
       legitimateUsers: sql<number>`count(*) filter (where ${users.accountStatus} = 'legitimate' and ${users.emailVerifiedAt} is not null)`,
     }).from(users).where(and(
       eq(users.role, "member"),
       not(ilike(users.email, INTERNAL_TEST_EMAIL_PATTERN)),
     ));

     const [paidCustomersResult] = await db.select({
       count: sql<number>`count(distinct ${users.id})`,
      }).from(users)
        .innerJoin(memberships, eq(memberships.userId, users.id))
        .where(and(
          operationalMemberCondition(),
          eq(memberships.status, "active"),
          inArray(memberships.billingSource, ["stripe", "stripe_checkout"]),
          inArray(memberships.billingState, ["active", "cancel_at_period_end"]),
        ));

     const [newLegitimateProspectsResult] = await db.select({
       count: sql<number>`count(distinct ${users.id})`,
     }).from(users)
       .where(and(
         operationalMemberCondition(),
         gte(users.createdAt, thirtyDaysAgo),
         eq(users.accountStatus, "legitimate"),
       ));

     const [newPaidCustomersResult] = await db.select({
       count: sql<number>`count(distinct ${users.id})`,
     }).from(users)
       .innerJoin(memberships, eq(memberships.userId, users.id))
       .where(and(
         operationalMemberCondition(),
         gte(users.createdAt, thirtyDaysAgo),
         eq(memberships.status, "active"),
         inArray(memberships.billingSource, ["stripe", "stripe_checkout"]),
         inArray(memberships.billingState, ["active", "cancel_at_period_end"]),
       ));
    
    const requiredFormIds = await this.getRequiredFormIds();
    const completedUserIds = await this.getCompletedUserIds(requiredFormIds);
     const membersNeedingForms = memberUsersResult.count - completedUserIds.size;

    const [signupFunnelResult] = await db.select({
      accountsCreated: count(),
      formsIncomplete: sql<number>`count(*) filter (where exists (
        select 1 from ${forms} required_form
        where required_form.required_before_booking = true
          and not exists (
            select 1 from ${formResponses} response
            where response.user_id = ${users.id}
              and response.form_id = required_form.id
              and response.status = 'submitted'
          )
      ))`,
      formsComplete: sql<number>`count(*) filter (where not exists (
        select 1 from ${forms} required_form
        where required_form.required_before_booking = true
          and not exists (
            select 1 from ${formResponses} response
            where response.user_id = ${users.id}
              and response.form_id = required_form.id
              and response.status = 'submitted'
          )
      ))`,
      passActivated: sql<number>`count(*) filter (where exists (
        select 1 from ${discoveryPasses} pass
        where pass.user_id = ${users.id}
          and pass.activation_timestamp is not null
      ))`,
      bookingCompleted: sql<number>`count(*) filter (where exists (
        select 1 from ${classReservations} reservation
        where reservation.user_id = ${users.id}
      ))`,
      blockedNoEntitlement: sql<number>`count(*) filter (where
        not exists (
          select 1 from ${forms} required_form
          where required_form.required_before_booking = true
            and not exists (
              select 1 from ${formResponses} response
              where response.user_id = ${users.id}
                and response.form_id = required_form.id
                and response.status = 'submitted'
            )
        )
        and not exists (
          select 1 from ${memberships} membership
          where membership.user_id = ${users.id}
            and membership.status in ('active', 'ACTIVE')
            and membership.start_date <= now()
            and (membership.end_date is null or membership.end_date >= now())
        )
        and not exists (
          select 1 from ${discoveryPasses} pass
          where pass.user_id = ${users.id}
            and pass.activation_timestamp is not null
            and pass.status in ('CLAIMED', 'PARTIALLY_BOOKED', 'PARTIALLY_ATTENDED')
            and pass.expiration_timestamp > now()
        )
      )`,
    }).from(users).where(and(
       operationalMemberCondition(),
       gte(users.createdAt, thirtyDaysAgo),
    ));

    return {
      totalUsers: totalUsersResult.count,
      newUsers30Days: newUsersResult.count,
      activeMemberships: activeMembershipsResult.count,
      upcomingSessions7Days: upcomingSessionsResult.count,
      monthlyRevenue: Number(revenueResult.total || 0),
      membersNeedingForms: Math.max(0, membersNeedingForms),
      totalRequiredForms: requiredFormIds.length,
       accountBreakdown: {
         rawAccountsCreated: Number(accountBreakdownResult.rawAccountsCreated || 0),
         verifiedUsers: Number(accountBreakdownResult.verifiedUsers || 0),
         unverifiedUsers: Number(accountBreakdownResult.unverifiedUsers || 0),
         suspiciousUsers: Number(accountBreakdownResult.suspiciousUsers || 0),
         archivedUsers: Number(accountBreakdownResult.archivedUsers || 0),
         legitimateUsers: Number(accountBreakdownResult.legitimateUsers || 0),
         paidCustomers: Number(paidCustomersResult.count || 0),
         filteredOut: Math.max(0, Number(accountBreakdownResult.rawAccountsCreated || 0) - Number(totalUsersResult.count || 0)),
       },
       paidCustomers: Number(paidCustomersResult.count || 0),
       newLegitimateProspects30Days: Number(newLegitimateProspectsResult.count || 0),
       newPaidCustomers30Days: Number(newPaidCustomersResult.count || 0),
      signupFunnel30Days: {
        accountsCreated: Number(signupFunnelResult.accountsCreated || 0),
        formsIncomplete: Number(signupFunnelResult.formsIncomplete || 0),
        formsComplete: Number(signupFunnelResult.formsComplete || 0),
        passActivated: Number(signupFunnelResult.passActivated || 0),
        bookingCompleted: Number(signupFunnelResult.bookingCompleted || 0),
        blockedNoEntitlement: Number(signupFunnelResult.blockedNoEntitlement || 0),
      },
    };
  }

  async getMemberships(userId: string): Promise<Membership[]> {
    return await db.select().from(memberships).where(eq(memberships.userId, userId)).orderBy(desc(memberships.createdAt));
  }

  async createMembership(membership: InsertMembership): Promise<Membership> {
    return db.transaction(async (tx) => {
      const [newMembership] = await tx.insert(memberships).values(membership).returning();
      const [existingLifecycle] = await tx.select().from(memberLifecycles).where(eq(memberLifecycles.userId, membership.userId));
      if (membership.status === "active" || membership.status === "ACTIVE") {
        if (existingLifecycle) {
          await tx.update(memberLifecycles).set({
            currentState: "ACTIVE_MEMBER",
            convertedAt: existingLifecycle.convertedAt || new Date(),
            updatedAt: new Date(),
          }).where(eq(memberLifecycles.id, existingLifecycle.id));
        } else {
          await tx.insert(memberLifecycles).values({
            userId: membership.userId,
            currentState: "ACTIVE_MEMBER",
            source: membership.source || "membership_assignment",
            convertedAt: new Date(),
          });
        }
        await tx.insert(memberLifecycleEvents).values({
          userId: membership.userId,
          actorId: membership.assignedBy || null,
          previousState: existingLifecycle?.currentState || null,
          nextState: "ACTIVE_MEMBER",
          reason: "Membership assigned",
        });
      }
      return newMembership;
    });
  }

  async updateMembership(id: string, updates: Partial<Pick<Membership, 'status' | 'endDate'>>): Promise<Membership | undefined> {
    const [updated] = await db.update(memberships).set(updates).where(eq(memberships.id, id)).returning();
    return updated;
  }

  async getSessionNotes(userId: string): Promise<(SessionNote & { coach: SafeUser })[]> {
    const results = await db
      .select()
      .from(sessionNotes)
      .leftJoin(users, eq(sessionNotes.coachId, users.id))
      .where(eq(sessionNotes.userId, userId))
      .orderBy(desc(sessionNotes.sessionDate));
    
    return results.map(r => {
      const { passwordHash: _, ...safeCoach } = r.users!;
      return {
        ...r.session_notes,
        coach: safeCoach
      };
    });
  }

  async createSessionNote(note: InsertSessionNote): Promise<SessionNote> {
    const [newNote] = await db.insert(sessionNotes).values(note).returning();
    return newNote;
  }

  async getCoachMembers(coachId: string): Promise<SafeUser[]> {
    const allUsers = await db.select().from(users).where(eq(users.assignedCoachId, coachId)).orderBy(desc(users.createdAt));
    return allUsers.map(u => {
      const { passwordHash: _, ...safeUser } = u;
      return safeUser;
    });
  }

  async createCalendlyBooking(data: { eventId: string; email: string; eventType: string; startTime: Date; paymentStatus: string; amount: number }): Promise<Booking> {
    const existing = await this.getBookingByCalendlyEventId(data.eventId);
    if (existing) return existing;
    let user = await this.getUserByEmail(data.email);
    if (!user) {
      await this.createUserFromWebhook(data.email, "New", "Member");
      user = await this.getUserByEmail(data.email);
    }

    const allTrainers = await this.getTrainers();
    const defaultTrainer = allTrainers[0];
    if (!defaultTrainer) throw new Error("No trainers available");

    const endTime = new Date(data.startTime.getTime() + 60 * 60 * 1000);

    try {
      const [newBooking] = await db.insert(bookings).values({
      userId: user!.id,
      customerName: `${user!.firstName} ${user!.lastName}`,
      customerEmail: data.email,
      customerPhone: user!.phone || "",
      sessionType: data.eventType || "PT60",
      start: data.startTime,
      end: endTime,
      trainerId: defaultTrainer.id,
      amountCents: data.amount,
      currency: "usd",
      calendlyEventId: data.eventId,
      paymentStatus: data.paymentStatus,
      status: data.paymentStatus === "paid" ? "paid" : "pending"
      }).returning();
      return newBooking;
    } catch (error) {
      // A concurrent delivery may have won the unique insert.
      const duplicate = await this.getBookingByCalendlyEventId(data.eventId);
      if (duplicate) return duplicate;
      throw error;
    }
  }

  async getBookingByCalendlyEventId(eventId: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.calendlyEventId, eventId));
    return booking;
  }

  async getCalendarConnection(): Promise<CalendarConnection | undefined> {
    const [connection] = await db.select().from(calendarConnections).where(eq(calendarConnections.provider, "google"));
    return connection;
  }

  async saveCalendarConnection(data: Partial<CalendarConnection> & { provider?: string }): Promise<CalendarConnection> {
    const provider = data.provider || "google";
    const existing = await this.getCalendarConnection();
    if (existing) {
      const [updated] = await db.update(calendarConnections)
        .set({ ...data, provider, updatedAt: new Date() })
        .where(eq(calendarConnections.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(calendarConnections).values({
      provider,
      calendarId: data.calendarId,
      calendarName: data.calendarName,
      timezone: data.timezone || "America/Los_Angeles",
      status: data.status || "not_configured",
      lastAttemptedAt: data.lastAttemptedAt,
      lastSuccessfulAt: data.lastSuccessfulAt,
      lastSyncedEventCount: data.lastSyncedEventCount || 0,
      lastError: data.lastError,
      syncToken: data.syncToken,
    }).returning();
    return created;
  }

  async getClassTypes(): Promise<ClassType[]> {
    return db.select().from(classTypes).orderBy(asc(classTypes.name));
  }

  async getClassType(id: string): Promise<ClassType | undefined> {
    const [classType] = await db.select().from(classTypes).where(eq(classTypes.id, id));
    return classType;
  }

  async createClassType(data: Omit<ClassType, "id" | "createdAt" | "updatedAt">): Promise<ClassType> {
    const [classType] = await db.insert(classTypes).values(data).returning();
    return classType;
  }

  async updateClassType(id: string, data: Partial<Omit<ClassType, "id" | "createdAt" | "updatedAt">>): Promise<ClassType | undefined> {
    const [classType] = await db.update(classTypes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(classTypes.id, id))
      .returning();
    return classType;
  }

  async listClassOccurrences(from: Date, to: Date, firstVisitOnly = false, includeDisabled = false, audience: "all" | "members" | "any" = "any"): Promise<Array<ClassOccurrence & { confirmedCount: number; waitlistCount: number; trainer: Trainer | null; classType: ClassType | null }>> {
    const rows = await db.select({
      occurrence: classOccurrences,
      trainer: trainers,
      classType: classTypes,
    })
      .from(classOccurrences)
      .leftJoin(trainers, eq(classOccurrences.trainerId, trainers.id))
      .leftJoin(classTypes, eq(classOccurrences.classTypeId, classTypes.id))
      .where(and(
        gte(classOccurrences.start, from),
        lte(classOccurrences.start, to),
        includeDisabled ? undefined : eq(classOccurrences.status, "active"),
        firstVisitOnly ? eq(classOccurrences.firstVisitEligible, true) : undefined,
        audience === "all" ? eq(classOccurrences.audience, "all") : undefined,
        audience === "members" ? eq(classOccurrences.audience, "members") : undefined,
        !includeDisabled ? not(ilike(classOccurrences.title, "%test%")) : undefined,
        !includeDisabled ? not(ilike(classOccurrences.description, "%test%")) : undefined,
        !includeDisabled ? not(ilike(classOccurrences.location, "%test%")) : undefined,
      ))
      .orderBy(asc(classOccurrences.start));

    const visibleRows = rows.filter(({ occurrence }) =>
      includeDisabled
      || (isAllowedClassWeekday(occurrence.start) && isPublicOccurrenceText(occurrence.title, occurrence.description, occurrence.location))
    );
    if (!visibleRows.length) return [];
    const ids = visibleRows.map(({ occurrence }) => occurrence.id);
    const totals = await db.select({
      occurrenceId: classReservations.occurrenceId,
      confirmedCount: sql<number>`count(*) filter (where ${classReservations.status} = 'confirmed')::int`,
      waitlistCount: sql<number>`count(*) filter (where ${classReservations.status} = 'waitlisted')::int`,
    }).from(classReservations)
      .where(inArray(classReservations.occurrenceId, ids))
      .groupBy(classReservations.occurrenceId);
    const counts = new Map(totals.map((row) => [row.occurrenceId, row]));
    return visibleRows.map(({ occurrence, trainer, classType }) => ({
      ...occurrence,
      trainer,
      classType,
      confirmedCount: counts.get(occurrence.id)?.confirmedCount || 0,
      waitlistCount: counts.get(occurrence.id)?.waitlistCount || 0,
    }));
  }

  async getClassOccurrence(id: string): Promise<ClassOccurrence | undefined> {
    const [occurrence] = await db.select().from(classOccurrences).where(eq(classOccurrences.id, id));
    return occurrence;
  }

  async getClassOccurrenceByGoogleEvent(calendarId: string, eventId: string): Promise<ClassOccurrence | undefined> {
    const [occurrence] = await db.select().from(classOccurrences).where(and(
      eq(classOccurrences.googleCalendarId, calendarId),
      eq(classOccurrences.googleEventId, eventId),
    ));
    return occurrence;
  }

  async upsertClassOccurrence(data: Omit<ClassOccurrence, "id" | "createdAt" | "updatedAt">): Promise<ClassOccurrence> {
    const [occurrence] = await db.insert(classOccurrences)
      .values(data)
      .onConflictDoUpdate({
        target: [classOccurrences.googleCalendarId, classOccurrences.googleEventId],
        set: {
          googleRecurringEventId: data.googleRecurringEventId,
          googleOriginalStartTime: data.googleOriginalStartTime,
          title: data.title,
          description: data.description,
          start: data.start,
          end: data.end,
          location: data.location,
          instructorName: data.instructorName,
          trainerId: data.trainerId,
          classTypeId: data.classTypeId,
           canonicalCategory: data.canonicalCategory,
           strengthFocus: data.strengthFocus,
           audienceGroup: data.audienceGroup,
          status: data.status,
          syncState: data.syncState,
          syncError: data.syncError,
          capacity: data.capacity,
          firstVisitEligible: data.firstVisitEligible,
          bookingEnabled: data.bookingEnabled,
          audience: data.audience,
          remoteUpdatedAt: data.remoteUpdatedAt,
          lastSyncedAt: data.lastSyncedAt,
          updatedAt: new Date(),
        },
      })
      .returning();
    return occurrence;
  }

  async updateClassOccurrence(id: string, data: Partial<Pick<ClassOccurrence, "classTypeId" | "trainerId" | "instructorName" | "capacity" | "firstVisitEligible" | "bookingEnabled" | "audience" | "syncState" | "syncError">>): Promise<ClassOccurrence | undefined> {
    const [occurrence] = await db.update(classOccurrences)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(classOccurrences.id, id))
      .returning();
    return occurrence;
  }

  async reconcileMissingClassOccurrences(calendarId: string, from: Date, to: Date, seenEventIds: string[]): Promise<ClassOccurrence[]> {
    const result = await db.update(classOccurrences).set({
      status: "removed",
      bookingEnabled: false,
      syncState: "synced",
      syncError: "Event no longer appears in the configured Google Calendar window.",
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(
      eq(classOccurrences.googleCalendarId, calendarId),
      gte(classOccurrences.start, from),
      lte(classOccurrences.start, to),
      eq(classOccurrences.status, "active"),
      seenEventIds.length ? sql`${classOccurrences.googleEventId} not in (${sql.join(seenEventIds.map((id) => sql`${id}`), sql`, `)})` : undefined,
    )).returning();
    return result;
  }

  async markClassOccurrenceSyncError(id: string, error: string): Promise<void> {
    await db.update(classOccurrences).set({
      syncState: "error",
      syncError: error.slice(0, 500),
      updatedAt: new Date(),
    }).where(eq(classOccurrences.id, id));
  }

  async reserveClassOccurrence(input: {
    occurrenceId: string;
    userId?: string;
    minorProfileId?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    locale?: "en" | "es";
    experience?: string;
    manageTokenHash?: string;
    manageToken?: string;
    manageUrl?: string;
    idempotencyKey?: string;
    source?: string;
  }): Promise<{ reservation: ClassReservation; occurrence: ClassOccurrence; promoted?: ClassReservation; manageToken?: string }> {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select id from class_occurrences where id = ${input.occurrenceId} for update`);
      const [occurrence] = await tx.select().from(classOccurrences).where(eq(classOccurrences.id, input.occurrenceId));
      if (!occurrence) throw new ClassBookingError("OCCURRENCE_NOT_FOUND", "This class occurrence does not exist.", 404);
      if (input.idempotencyKey) {
        const [existing] = await tx.select().from(classReservations).where(eq(classReservations.idempotencyKey, input.idempotencyKey));
        if (existing) {
          if (existing.occurrenceId !== input.occurrenceId || (input.userId && existing.userId !== input.userId)) {
            throw new ClassBookingError("IDEMPOTENCY_KEY_REUSED", "This booking request key was already used for a different reservation.", 409);
          }
          return {
            reservation: existing,
            occurrence,
            manageToken: decryptManageToken(existing.manageTokenEncrypted),
          };
        }
      }
      if (!isAllowedClassWeekday(occurrence.start)) {
        throw new ClassBookingError(
          "CLASS_DAY_UNAVAILABLE",
          "Classes are only available on Monday, Wednesday, and Friday.",
          409,
        );
      }
      if (occurrence.status !== "active" || !occurrence.bookingEnabled) {
        throw new ClassBookingError("OCCURRENCE_UNAVAILABLE", "This class is not available for booking.", 409);
      }
      if (occurrence.start <= new Date()) {
        throw new ClassBookingError("OCCURRENCE_STARTED", "This class has already started.", 409);
      }
      if (input.userId && !isWithinMemberBookingWindow(occurrence.start)) {
        throw new ClassBookingError(
          "BOOKING_WINDOW_CLOSED",
          "Classes become available seven days before they start.",
          409,
        );
      }
      if (!input.userId && !occurrence.firstVisitEligible) {
        throw new ClassBookingError("MEMBERSHIP_REQUIRED", "This class requires a member account.", 403);
      }

      let eligibility: BookingEligibility | undefined;
      let minorProfile: MinorProfile | undefined;
      if (input.userId) {
        const user = await this.getUserById(input.userId);
        if (!user) throw new ClassBookingError("USER_NOT_FOUND", "This member account could not be found.", 401);
        if (input.minorProfileId) {
          [minorProfile] = await tx.select().from(minorProfiles).where(and(
            eq(minorProfiles.id, input.minorProfileId),
            eq(minorProfiles.guardianUserId, input.userId),
          ));
          if (!minorProfile) {
            throw new ClassBookingError("MINOR_PROFILE_FORBIDDEN", "This participant profile is not available to your account.", 403);
          }
          eligibility = await evaluateMinorBookingEligibilityWithExecutor(minorProfile, occurrence, tx);
        } else {
          eligibility = await evaluateBookingEligibilityWithExecutor(user, occurrence, tx);
        }
        if (!eligibility.eligible) {
          throw new ClassBookingError(eligibility.code, eligibility.message, 409);
        }
      }

      const personCondition = input.minorProfileId
        ? eq(classReservations.minorProfileId, input.minorProfileId)
        : input.userId
        ? or(
            eq(classReservations.userId, input.userId),
            sql`lower(${classReservations.visitorEmail}) = lower(${input.email})`,
          )
        : sql`lower(${classReservations.visitorEmail}) = lower(${input.email})`;
      const activeStatuses = ["confirmed", "waitlisted"];
      const [duplicate] = await tx.select().from(classReservations).where(and(
        eq(classReservations.occurrenceId, occurrence.id),
        personCondition,
        inArray(classReservations.status, activeStatuses),
      )).limit(1);
      if (duplicate) {
        throw new ClassBookingError("DUPLICATE_RESERVATION", "You already have a reservation for this class.", 409);
      }

      const [overlap] = await tx.select({ id: classReservations.id })
        .from(classReservations)
        .innerJoin(classOccurrences, eq(classReservations.occurrenceId, classOccurrences.id))
        .where(and(
          personCondition,
          eq(classReservations.status, "confirmed"),
          sql`${classOccurrences.start} < ${occurrence.end}`,
          sql`${classOccurrences.end} > ${occurrence.start}`,
        ))
        .limit(1);
      if (overlap) {
        throw new ClassBookingError("OVERLAPPING_RESERVATION", "You already have another class during this time.", 409);
      }

      const [confirmedTotal] = await tx.select({ value: count() }).from(classReservations).where(and(
        eq(classReservations.occurrenceId, occurrence.id),
        eq(classReservations.status, "confirmed"),
      ));
      const confirmedCount = Number(confirmedTotal?.value || 0);
      let status = "confirmed";
      let waitlistPosition: number | null = null;
      if (confirmedCount >= occurrence.capacity) {
        if (eligibility && !eligibility.waitlistAllowed) {
          throw new ClassBookingError("WAITLIST_NOT_ALLOWED", "The class is full and your plan does not allow waitlisting.", 409);
        }
        status = "waitlisted";
        const [waitlistTotal] = await tx.select({ value: count() }).from(classReservations).where(and(
          eq(classReservations.occurrenceId, occurrence.id),
          eq(classReservations.status, "waitlisted"),
        ));
        waitlistPosition = Number(waitlistTotal?.value || 0) + 1;
      }

      const [reservation] = await tx.insert(classReservations).values({
        occurrenceId: occurrence.id,
        userId: input.userId,
        visitorFirstName: input.firstName,
        visitorLastName: input.lastName,
        visitorEmail: input.email.toLowerCase(),
        visitorPhone: input.phone,
        locale: input.locale || "en",
        experience: input.experience,
        minorProfileId: input.minorProfileId,
        status,
        waitlistPosition,
        manageTokenHash: input.manageTokenHash,
        manageTokenEncrypted: encryptManageToken(input.manageToken),
        idempotencyKey: input.idempotencyKey,
      }).returning();
      await tx.insert(classReservationEvents).values({
        reservationId: reservation.id,
        occurrenceId: occurrence.id,
        event: status === "confirmed" ? "reservation_confirmed" : "waitlist_joined",
        metadata: {
          source: input.source || (input.minorProfileId ? "guardian_portal" : input.userId ? "member_portal" : "first_visit"),
          minorProfileId: input.minorProfileId || null,
        },
      });
      if (input.userId && eligibility && status === "confirmed") {
        if (eligibility.source === "discovery" && eligibility.discoveryEntitlementId) {
          await tx.update(discoveryEntitlements).set({
            status: "BOOKED",
            reservationId: reservation.id,
            bookedAt: new Date(),
            updatedAt: new Date(),
          }).where(and(
            eq(discoveryEntitlements.id, eligibility.discoveryEntitlementId),
            eq(discoveryEntitlements.status, "AVAILABLE"),
          ));
        } else if (eligibility.source === "membership" && eligibility.membershipId && eligibility.weekStart) {
          await tx.insert(entitlementLedger).values({
            userId: input.userId,
            membershipId: eligibility.membershipId,
            occurrenceId: occurrence.id,
            reservationId: reservation.id,
            weekStart: eligibility.weekStart,
            reserved: 1,
            reason: "reservation_confirmed",
          });
        }
      }
      const participantName = displayParticipantName(reservation, minorProfile);
      await enqueueClassMemberNotification(tx, {
        reservation,
        occurrence,
        participantName,
        status: status === "waitlisted" ? "waitlisted" : "confirmed",
        event: status === "waitlisted" ? "waitlist_joined" : "reservation_confirmed",
        manageUrl: input.manageToken && input.manageUrl
          ? `${input.manageUrl}?id=${encodeURIComponent(reservation.id)}&manageToken=${encodeURIComponent(input.manageToken)}`
          : input.manageUrl,
      });
      return { reservation, occurrence, manageToken: input.manageToken };
    });
  }

  async getUserClassReservations(userId: string): Promise<Array<ClassReservation & { occurrence: ClassOccurrence; trainer: Trainer | null; classType: ClassType | null; minorProfile: MinorProfile | null }>> {
    const rows = await db.select({
      reservation: classReservations,
      occurrence: classOccurrences,
      trainer: trainers,
      classType: classTypes,
      minorProfile: minorProfiles,
    }).from(classReservations)
      .innerJoin(classOccurrences, eq(classReservations.occurrenceId, classOccurrences.id))
      .leftJoin(trainers, eq(classOccurrences.trainerId, trainers.id))
      .leftJoin(classTypes, eq(classOccurrences.classTypeId, classTypes.id))
      .leftJoin(minorProfiles, eq(classReservations.minorProfileId, minorProfiles.id))
      .where(eq(classReservations.userId, userId))
      .orderBy(desc(classOccurrences.start));
    return rows.map(({ reservation, occurrence, trainer, classType, minorProfile }) => ({
      ...reservation,
      occurrence,
      trainer,
      classType,
      minorProfile,
    }));
  }

  async getGuardianMinorReservations(guardianUserId: string): Promise<Array<ClassReservation & {
    occurrence: ClassOccurrence;
    minorProfile: Pick<MinorProfile, "id" | "firstName" | "lastName" | "consentRevokedAt">;
  }>> {
    const rows = await db.select({
      reservation: classReservations,
      occurrence: classOccurrences,
      minorProfile: {
        id: minorProfiles.id,
        firstName: minorProfiles.firstName,
        lastName: minorProfiles.lastName,
        consentRevokedAt: minorProfiles.consentRevokedAt,
      },
    }).from(classReservations)
      .innerJoin(minorProfiles, eq(classReservations.minorProfileId, minorProfiles.id))
      .innerJoin(classOccurrences, eq(classReservations.occurrenceId, classOccurrences.id))
      .where(eq(minorProfiles.guardianUserId, guardianUserId))
      .orderBy(desc(classOccurrences.start), desc(classReservations.createdAt));
    return rows.map(({ reservation, occurrence, minorProfile }) => ({
      ...reservation,
      occurrence,
      minorProfile,
    }));
  }

  async getClassReservation(id: string): Promise<(ClassReservation & { occurrence: ClassOccurrence }) | undefined> {
    const [row] = await db.select({ reservation: classReservations, occurrence: classOccurrences })
      .from(classReservations)
      .innerJoin(classOccurrences, eq(classReservations.occurrenceId, classOccurrences.id))
      .where(eq(classReservations.id, id));
    return row ? { ...row.reservation, occurrence: row.occurrence } : undefined;
  }

  async getClassReservationReport(filters: { status?: string; startDate?: Date; endDate?: Date } = {}) {
    const rows = await db.select({
      reservation: classReservations,
      occurrence: classOccurrences,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      },
      minorProfile: {
        id: minorProfiles.id,
        firstName: minorProfiles.firstName,
        lastName: minorProfiles.lastName,
      },
    }).from(classReservations)
      .innerJoin(classOccurrences, eq(classReservations.occurrenceId, classOccurrences.id))
      .leftJoin(users, eq(classReservations.userId, users.id))
      .leftJoin(minorProfiles, eq(classReservations.minorProfileId, minorProfiles.id))
      .where(and(
        filters.status ? eq(classReservations.status, filters.status) : undefined,
        filters.startDate ? gte(classOccurrences.start, filters.startDate) : undefined,
        filters.endDate ? lte(classOccurrences.start, filters.endDate) : undefined,
        or(isNull(users.id), not(ilike(users.email, INTERNAL_TEST_EMAIL_PATTERN))),
      ))
      .orderBy(desc(classOccurrences.start), desc(classReservations.createdAt));

    return rows.map(({ reservation, occurrence, user, minorProfile }) => ({
      ...reservation,
      occurrence,
      user: user?.id ? user : null,
      minorProfile: minorProfile?.id ? minorProfile : null,
    }));
  }

  async cancelClassReservation(input: { reservationId: string; userId?: string; manageTokenHash?: string; reason?: string; source?: "member" | "public" | "provider_calendar" | "admin"; staffActorId?: string; manageUrl?: string }): Promise<{ reservation: ClassReservation; promoted?: ClassReservation }> {
    return db.transaction(async (tx) => {
      const [reservationReference] = await tx.select({ occurrenceId: classReservations.occurrenceId })
        .from(classReservations).where(eq(classReservations.id, input.reservationId));
      if (!reservationReference) throw new ClassBookingError("RESERVATION_NOT_FOUND", "Reservation not found.", 404);
      await tx.execute(sql`select id from class_occurrences where id = ${reservationReference.occurrenceId} for update`);
      const [current] = await tx.select().from(classReservations).where(eq(classReservations.id, input.reservationId));
      if (!current) throw new ClassBookingError("RESERVATION_NOT_FOUND", "Reservation not found.", 404);
      const [occurrence] = await tx.select().from(classOccurrences).where(eq(classOccurrences.id, current.occurrenceId));
      const authorized = (input.userId && current.userId === input.userId)
        || (input.manageTokenHash && current.manageTokenHash === input.manageTokenHash)
        || Boolean(input.staffActorId);
      if (!authorized) throw new ClassBookingError("RESERVATION_FORBIDDEN", "You cannot manage this reservation.", 403);
      if (!["confirmed", "waitlisted"].includes(current.status)) {
        throw new ClassBookingError("RESERVATION_ALREADY_CLOSED", "This reservation is already closed.", 409);
      }

      const [reservation] = await tx.update(classReservations).set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationReason: input.reason?.slice(0, 240),
        waitlistPosition: null,
        updatedAt: new Date(),
      }).where(and(
        eq(classReservations.id, current.id),
        inArray(classReservations.status, ["confirmed", "waitlisted"]),
      )).returning();
      if (!reservation) throw new ClassBookingError("RESERVATION_ALREADY_CLOSED", "This reservation is already closed.", 409);
      await tx.insert(classReservationEvents).values({
        reservationId: reservation.id,
        occurrenceId: reservation.occurrenceId,
        event: "reservation_cancelled",
        metadata: { previousStatus: current.status },
      });

      let consumesCancellation = false;
      if (current.userId && current.status === "confirmed") {
        const [reservationLedger] = await tx.select().from(entitlementLedger).where(and(
          eq(entitlementLedger.reservationId, current.id),
          eq(entitlementLedger.reserved, 1),
        )).orderBy(desc(entitlementLedger.createdAt)).limit(1);
        const [member] = await tx.select({
          membership: memberships,
          plan: membershipPlans,
        }).from(memberships)
          .leftJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
          .where(and(
            eq(memberships.userId, current.userId),
            inArray(memberships.status, ["active", "ACTIVE"]),
            lte(memberships.startDate, occurrence?.start || new Date()),
            or(isNull(memberships.endDate), gte(memberships.endDate, occurrence?.start || new Date())),
          )).orderBy(desc(memberships.startDate)).limit(1);
        const cutoffHours = BOOKING_OPERATIONS.cancellationCutoffHours;
        const late = Boolean(occurrence && occurrence.start.getTime() - Date.now() < cutoffHours * 60 * 60 * 1000);
        consumesCancellation = late && (member?.plan?.lateCancelPolicy || "consume") === "consume";
        if (reservationLedger && !consumesCancellation) {
          await tx.insert(entitlementLedger).values({
            userId: current.userId,
            membershipId: reservationLedger.membershipId,
            occurrenceId: current.occurrenceId,
            reservationId: current.id,
            weekStart: reservationLedger.weekStart,
            released: 1,
            reason: late ? "late_cancel_released_override" : "reservation_cancelled",
          });
        }
      }

      if (current.userId && !consumesCancellation) {
        const [discoveryEntitlement] = await tx.select().from(discoveryEntitlements).where(and(
          eq(discoveryEntitlements.reservationId, current.id),
          eq(discoveryEntitlements.status, "BOOKED"),
        ));
        if (discoveryEntitlement) {
          const [pass] = await tx.select().from(discoveryPasses).where(eq(discoveryPasses.id, discoveryEntitlement.discoveryPassId));
          if (canRestoreDiscoveryEntitlement(pass)) {
            await tx.update(discoveryEntitlements).set({
              status: "AVAILABLE",
              reservationId: null,
              cancelledAt: new Date(),
              updatedAt: new Date(),
            }).where(eq(discoveryEntitlements.id, discoveryEntitlement.id));
            const [remainingUsedEntitlement] = await tx.select({ id: discoveryEntitlements.id })
              .from(discoveryEntitlements)
              .where(and(
                eq(discoveryEntitlements.discoveryPassId, pass.id),
                inArray(discoveryEntitlements.status, ["BOOKED", "ATTENDED"]),
              ))
              .limit(1);
            if (!remainingUsedEntitlement) {
              await tx.update(discoveryPasses).set({
                status: "CLAIMED",
                updatedAt: new Date(),
              }).where(eq(discoveryPasses.id, pass.id));
            }
          }
        }
      }

      let promoted: ClassReservation | undefined;
      if (current.status === "confirmed") {
        const [next] = await tx.select().from(classReservations).where(and(
          eq(classReservations.occurrenceId, current.occurrenceId),
          eq(classReservations.status, "waitlisted"),
        )).orderBy(asc(classReservations.waitlistPosition), asc(classReservations.createdAt)).limit(1);
        if (next) {
          [promoted] = await tx.update(classReservations).set({
            status: "confirmed",
            waitlistPosition: null,
            updatedAt: new Date(),
          }).where(eq(classReservations.id, next.id)).returning();
          await tx.insert(classReservationEvents).values({
            reservationId: promoted.id,
            occurrenceId: promoted.occurrenceId,
            event: "waitlist_promoted",
          });
          if (promoted.userId) {
            const [promotedLedger] = await tx.select().from(entitlementLedger).where(and(
              eq(entitlementLedger.reservationId, promoted.id),
              eq(entitlementLedger.reserved, 1),
            )).limit(1);
            if (!promotedLedger) {
              const [promotedMembership] = await tx.select({
                membership: memberships,
                plan: membershipPlans,
              }).from(memberships)
                .leftJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
                .where(and(
                  eq(memberships.userId, promoted.userId),
                  inArray(memberships.status, ["active", "ACTIVE"]),
                  lte(memberships.startDate, occurrence?.start || new Date()),
                  or(isNull(memberships.endDate), gte(memberships.endDate, occurrence?.start || new Date())),
                )).orderBy(desc(memberships.startDate)).limit(1);
              if (promotedMembership?.membership && promotedMembership.plan) {
                await tx.insert(entitlementLedger).values({
                  userId: promoted.userId,
                  membershipId: promotedMembership.membership.id,
                  occurrenceId: promoted.occurrenceId,
                  reservationId: promoted.id,
                  weekStart: getMembershipWeekStart(occurrence.start, promotedMembership.plan.weekStartDay, promotedMembership.plan.timezone),
                  reserved: 1,
                  reason: "waitlist_promoted",
                });
              }
            }
            const [promotedOccurrenceType] = promoted.occurrenceId
              ? await tx.select().from(classTypes).where(eq(classTypes.id, occurrence?.classTypeId || ""))
              : [];
            const promotedCategory = discoveryCategory(promotedOccurrenceType || null);
            if (promotedCategory) {
              const [promotedPass] = await tx.select().from(discoveryPasses).where(and(
                eq(discoveryPasses.userId, promoted.userId),
                gte(discoveryPasses.expirationTimestamp, new Date()),
                inArray(discoveryPasses.status, ["CLAIMED", "PARTIALLY_BOOKED", "PARTIALLY_ATTENDED"]),
              )).orderBy(desc(discoveryPasses.createdAt)).limit(1);
              if (promotedPass) {
                const [promotedDiscovery] = await tx.select().from(discoveryEntitlements).where(and(
                  eq(discoveryEntitlements.discoveryPassId, promotedPass.id),
                  eq(discoveryEntitlements.category, promotedCategory),
                  eq(discoveryEntitlements.status, "AVAILABLE"),
                ));
                if (promotedDiscovery) {
                  await tx.update(discoveryEntitlements).set({
                    status: "BOOKED",
                    reservationId: promoted.id,
                    bookedAt: new Date(),
                    updatedAt: new Date(),
                  }).where(eq(discoveryEntitlements.id, promotedDiscovery.id));
                }
              }
            }
          }
        }
      }
      await tx.execute(sql`
        with ranked as (
          select id, row_number() over (order by waitlist_position nulls last, created_at) as position
          from class_reservations
          where occurrence_id = ${current.occurrenceId} and status = 'waitlisted'
        )
        update class_reservations
        set waitlist_position = ranked.position
        from ranked
        where class_reservations.id = ranked.id
      `);
      const [minor] = current.minorProfileId
        ? await tx.select({ firstName: minorProfiles.firstName, lastName: minorProfiles.lastName })
          .from(minorProfiles).where(eq(minorProfiles.id, current.minorProfileId))
        : [];
      const participantName = displayParticipantName(current, minor || null);
      await enqueueClassMemberNotification(tx, {
        reservation,
        occurrence,
        participantName,
        status: "cancelled",
        event: "reservation_cancelled",
        manageUrl: input.manageUrl,
      });
      await enqueueStaffNotification(tx, {
        reservation,
        occurrence,
        participantName,
        event: "reservation_cancelled_staff",
        message: `Class reservation cancelled (${input.source || "member"})`,
      });
      if (promoted) {
        const [promotedMinor] = promoted.minorProfileId
          ? await tx.select({ firstName: minorProfiles.firstName, lastName: minorProfiles.lastName })
            .from(minorProfiles).where(eq(minorProfiles.id, promoted.minorProfileId))
          : [];
        await enqueueClassMemberNotification(tx, {
          reservation: promoted,
          occurrence,
          participantName: displayParticipantName(promoted, promotedMinor || null),
          status: "promoted",
          event: "waitlist_promoted",
          manageUrl: input.manageUrl,
        });
        await enqueueStaffNotification(tx, {
          reservation: promoted,
          occurrence,
          participantName: displayParticipantName(promoted, promotedMinor || null),
          event: "waitlist_promoted_staff",
          message: "A waitlisted class reservation was promoted",
        });
      }
      return { reservation, promoted };
    });
  }

  async moveClassReservation(input: {
    reservationId: string;
    replacementOccurrenceId: string;
    actorId: string;
    reason: string;
  }): Promise<{ reservation: ClassReservation; occurrence: ClassOccurrence; discoveryExceptionApplied: boolean }> {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select id from class_reservations where id = ${input.reservationId} for update`);
      const [current] = await tx.select().from(classReservations).where(eq(classReservations.id, input.reservationId));
      if (!current) throw new ClassBookingError("RESERVATION_NOT_FOUND", "Reservation not found.", 404);
      if (!current.userId) {
        throw new ClassBookingError("RESERVATION_HAS_NO_OWNER", "Only reservations linked to a member account can be moved.", 409);
      }
      if (current.status !== "cancelled") {
        throw new ClassBookingError("RESERVATION_NOT_CANCELLED", "Cancel the original reservation before moving it.", 409);
      }
      if (current.occurrenceId === input.replacementOccurrenceId) {
        throw new ClassBookingError("SAME_OCCURRENCE", "Choose a different class occurrence.", 409);
      }
      const [priorMove] = await tx.select({ id: classReservationEvents.id }).from(classReservationEvents).where(and(
        eq(classReservationEvents.reservationId, current.id),
        eq(classReservationEvents.event, "reservation_moved_from"),
      )).limit(1);
      if (priorMove) {
        throw new ClassBookingError("RESERVATION_ALREADY_MOVED", "This cancelled reservation has already been moved.", 409);
      }

      const occurrenceIds = [current.occurrenceId, input.replacementOccurrenceId].sort();
      await tx.execute(sql`select id from class_occurrences where id in (${sql.join(occurrenceIds.map((id) => sql`${id}`), sql`, `)}) order by id for update`);
      const occurrenceRows = await tx.select().from(classOccurrences).where(inArray(classOccurrences.id, occurrenceIds));
      const oldOccurrence = occurrenceRows.find((occurrence) => occurrence.id === current.occurrenceId);
      const replacement = occurrenceRows.find((occurrence) => occurrence.id === input.replacementOccurrenceId);
      if (!oldOccurrence || !replacement) {
        throw new ClassBookingError("OCCURRENCE_NOT_FOUND", "The original or replacement class occurrence does not exist.", 404);
      }
      if (!isAllowedClassWeekday(replacement.start)) {
        throw new ClassBookingError(
          "CLASS_DAY_UNAVAILABLE",
          "Classes are only available on Monday, Wednesday, and Friday.",
          409,
        );
      }
      if (replacement.status !== "active" || !replacement.bookingEnabled || replacement.start <= new Date()) {
        throw new ClassBookingError("OCCURRENCE_UNAVAILABLE", "The replacement class is not available for booking.", 409);
      }

      const typeIds = [oldOccurrence.classTypeId, replacement.classTypeId].filter((id): id is string => Boolean(id));
      const typeRows = typeIds.length ? await tx.select().from(classTypes).where(inArray(classTypes.id, typeIds)) : [];
      const oldType = typeRows.find((type) => type.id === oldOccurrence.classTypeId) || null;
      const replacementType = typeRows.find((type) => type.id === replacement.classTypeId) || null;
      if (
        oldOccurrence.canonicalCategory === "LEGACY"
        || replacement.canonicalCategory === "LEGACY"
        || oldOccurrence.canonicalCategory !== replacement.canonicalCategory
      ) {
        throw new ClassBookingError("CLASS_CATEGORY_MISMATCH", "The replacement must be in the same class category.", 409);
      }
      const replacementDiscoveryCategory = discoveryCategory(replacementType);

      const personCondition = current.minorProfileId
        ? eq(classReservations.minorProfileId, current.minorProfileId)
        : eq(classReservations.userId, current.userId);
      const [duplicate] = await tx.select({ id: classReservations.id }).from(classReservations).where(and(
        eq(classReservations.occurrenceId, replacement.id),
        personCondition,
        inArray(classReservations.status, ["confirmed", "waitlisted"]),
      )).limit(1);
      if (duplicate) throw new ClassBookingError("DUPLICATE_RESERVATION", "This member already has a reservation for the replacement class.", 409);
      const [overlap] = await tx.select({ id: classReservations.id })
        .from(classReservations)
        .innerJoin(classOccurrences, eq(classReservations.occurrenceId, classOccurrences.id))
        .where(and(
          personCondition,
          eq(classReservations.status, "confirmed"),
          sql`${classOccurrences.start} < ${replacement.end}`,
          sql`${classOccurrences.end} > ${replacement.start}`,
        ))
        .limit(1);
      if (overlap) throw new ClassBookingError("OVERLAPPING_RESERVATION", "This member already has another class during the replacement time.", 409);

      const [confirmedTotal] = await tx.select({ value: count() }).from(classReservations).where(and(
        eq(classReservations.occurrenceId, replacement.id),
        eq(classReservations.status, "confirmed"),
      ));
      const status = Number(confirmedTotal?.value || 0) >= replacement.capacity ? "waitlisted" : "confirmed";
      let waitlistPosition: number | null = null;
      if (status === "waitlisted") {
        const [waitlistTotal] = await tx.select({ value: count() }).from(classReservations).where(and(
          eq(classReservations.occurrenceId, replacement.id),
          eq(classReservations.status, "waitlisted"),
        ));
        waitlistPosition = Number(waitlistTotal?.value || 0) + 1;
      }

      const [oldDiscoveryEntitlement] = !current.minorProfileId && replacementDiscoveryCategory
        ? await tx.select({ entitlement: discoveryEntitlements, pass: discoveryPasses })
          .from(discoveryEntitlements)
          .innerJoin(discoveryPasses, eq(discoveryEntitlements.discoveryPassId, discoveryPasses.id))
          .where(and(
            eq(discoveryPasses.userId, current.userId),
            eq(discoveryEntitlements.category, replacementDiscoveryCategory),
            or(
              eq(discoveryEntitlements.reservationId, current.id),
              eq(discoveryEntitlements.status, "AVAILABLE"),
            ),
          ))
          .orderBy(desc(discoveryEntitlements.updatedAt))
          .limit(1)
        : [];

      let discoveryExceptionApplied = false;
      let eligibility: BookingEligibility | undefined;
      if (!oldDiscoveryEntitlement) {
        const [user] = await tx.select().from(users).where(eq(users.id, current.userId));
        if (!user) throw new ClassBookingError("USER_NOT_FOUND", "This member account could not be found.", 404);
        eligibility = current.minorProfileId
          ? await (async () => {
              const [minor] = await tx.select().from(minorProfiles).where(and(
                eq(minorProfiles.id, current.minorProfileId!),
                eq(minorProfiles.guardianUserId, current.userId!),
              ));
              if (!minor) throw new ClassBookingError("MINOR_PROFILE_FORBIDDEN", "The participant no longer belongs to this account.", 403);
              return evaluateMinorBookingEligibilityWithExecutor(minor, replacement, tx);
            })()
          : await evaluateBookingEligibilityWithExecutor(user, replacement, tx);
        if (!eligibility.eligible) throw new ClassBookingError(eligibility.code, eligibility.message, 409);
        if (status === "waitlisted" && !eligibility.waitlistAllowed) {
          throw new ClassBookingError("WAITLIST_NOT_ALLOWED", "The replacement is full and this plan does not allow waitlisting.", 409);
        }
      } else {
        const pass = oldDiscoveryEntitlement.pass;
        if (pass.convertedAt || ["CANCELLED", "EXPIRED", "CONVERTED"].includes(pass.status)) {
          throw new ClassBookingError("DISCOVERY_PASS_UNAVAILABLE", "The Discovery Pass can no longer be used for this move.", 409);
        }
        if (pass.expirationTimestamp < replacement.end) {
          discoveryExceptionApplied = true;
          await tx.update(discoveryPasses).set({
            expirationTimestamp: replacement.end,
            adminOverrideReason: input.reason,
            updatedAt: new Date(),
          }).where(eq(discoveryPasses.id, pass.id));
        }
      }

      const [reservation] = await tx.insert(classReservations).values({
        occurrenceId: replacement.id,
        userId: current.userId,
        minorProfileId: current.minorProfileId,
        visitorFirstName: current.visitorFirstName,
        visitorLastName: current.visitorLastName,
        visitorEmail: current.visitorEmail,
        visitorPhone: current.visitorPhone,
        locale: current.locale,
        experience: current.experience,
        status,
        waitlistPosition,
      }).returning();

      if (oldDiscoveryEntitlement) {
        await tx.update(discoveryEntitlements).set({
          status: status === "confirmed" ? "BOOKED" : "AVAILABLE",
          reservationId: status === "confirmed" ? reservation.id : null,
          bookedAt: status === "confirmed" ? new Date() : null,
          cancelledAt: null,
          updatedAt: new Date(),
        }).where(eq(discoveryEntitlements.id, oldDiscoveryEntitlement.entitlement.id));
        await tx.update(discoveryPasses).set({
          status: status === "confirmed" ? "PARTIALLY_BOOKED" : "CLAIMED",
          updatedAt: new Date(),
        }).where(eq(discoveryPasses.id, oldDiscoveryEntitlement.pass.id));
      } else if (status === "confirmed" && eligibility?.source === "discovery" && eligibility.discoveryEntitlementId) {
        await tx.update(discoveryEntitlements).set({
          status: "BOOKED",
          reservationId: reservation.id,
          bookedAt: new Date(),
          cancelledAt: null,
          updatedAt: new Date(),
        }).where(eq(discoveryEntitlements.id, eligibility.discoveryEntitlementId));
      } else if (status === "confirmed" && eligibility?.source === "membership" && eligibility.membershipId && eligibility.weekStart) {
        await tx.insert(entitlementLedger).values({
          userId: current.userId,
          membershipId: eligibility.membershipId,
          occurrenceId: replacement.id,
          reservationId: reservation.id,
          weekStart: eligibility.weekStart,
          reserved: 1,
          reason: "admin_reservation_move",
        });
      }

      await tx.insert(classReservationEvents).values([
        {
          reservationId: current.id,
          occurrenceId: oldOccurrence.id,
          event: "reservation_moved_from",
          metadata: { actorId: input.actorId, reason: input.reason, replacementReservationId: reservation.id, newOccurrenceId: replacement.id },
        },
        {
          reservationId: reservation.id,
          occurrenceId: replacement.id,
          event: "reservation_moved_to",
          metadata: { actorId: input.actorId, reason: input.reason, originalReservationId: current.id, oldOccurrenceId: oldOccurrence.id, discoveryExceptionApplied },
        },
      ]);
      await tx.insert(memberAuditEvents).values({
        actorId: input.actorId,
        userId: current.userId,
        targetType: "class_reservation",
        targetId: reservation.id,
        action: "class_reservation_moved",
        before: { reservationId: current.id, occurrenceId: oldOccurrence.id, status: current.status },
        after: { reservationId: reservation.id, occurrenceId: replacement.id, status, discoveryExceptionApplied },
        reason: input.reason,
      });
      const [minor] = current.minorProfileId
        ? await tx.select({ firstName: minorProfiles.firstName, lastName: minorProfiles.lastName })
          .from(minorProfiles).where(eq(minorProfiles.id, current.minorProfileId))
        : [];
      const participantName = displayParticipantName(current, minor || null);
      await enqueueClassMemberNotification(tx, {
        reservation,
        occurrence: replacement,
        participantName,
        status: status === "waitlisted" ? "waitlisted" : "confirmed",
        event: "reservation_moved_to",
      });
      await enqueueStaffNotification(tx, {
        reservation,
        occurrence: replacement,
        participantName,
        event: "reservation_moved_staff",
        message: "A class reservation was moved by staff",
      });
      return { reservation, occurrence: replacement, discoveryExceptionApplied };
    });
  }

  async getOccurrenceReservations(occurrenceId: string): Promise<{
    confirmed: Array<ClassReservation & { minorProfile: Pick<MinorProfile, "id" | "firstName" | "lastName"> | null; moveCompleted: boolean }>;
    waitlisted: Array<ClassReservation & { minorProfile: Pick<MinorProfile, "id" | "firstName" | "lastName"> | null; moveCompleted: boolean }>;
    cancelled: Array<ClassReservation & { minorProfile: Pick<MinorProfile, "id" | "firstName" | "lastName"> | null; moveCompleted: boolean }>;
  }> {
    const rows = await db.select({
      reservation: classReservations,
      minorProfile: {
        id: minorProfiles.id,
        firstName: minorProfiles.firstName,
        lastName: minorProfiles.lastName,
      },
    }).from(classReservations)
      .leftJoin(minorProfiles, eq(classReservations.minorProfileId, minorProfiles.id))
      .where(and(
        eq(classReservations.occurrenceId, occurrenceId),
        inArray(classReservations.status, ["confirmed", "waitlisted", "cancelled"]),
      ))
      .orderBy(asc(classReservations.waitlistPosition), asc(classReservations.createdAt));
    const movedReservationIds = rows.length
      ? new Set((await db.select({ reservationId: classReservationEvents.reservationId }).from(classReservationEvents).where(and(
          inArray(classReservationEvents.reservationId, rows.map(({ reservation }) => reservation.id)),
          eq(classReservationEvents.event, "reservation_moved_from"),
        ))).map(({ reservationId }) => reservationId))
      : new Set<string | null>();
    const reservations = rows.map(({ reservation, minorProfile }) => ({
      ...reservation,
      minorProfile: minorProfile?.id ? minorProfile : null,
      moveCompleted: movedReservationIds.has(reservation.id),
    }));
    return {
      confirmed: reservations.filter((reservation) => reservation.status === "confirmed"),
      waitlisted: reservations.filter((reservation) => reservation.status === "waitlisted"),
      cancelled: reservations.filter((reservation) => reservation.status === "cancelled"),
    };
  }

  async cancelOccurrenceReservations(occurrenceId: string, reason: string): Promise<ClassReservation[]> {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select id from class_occurrences where id = ${occurrenceId} for update`);
      const [occurrence] = await tx.select().from(classOccurrences).where(eq(classOccurrences.id, occurrenceId));
      const cancelled = await tx.update(classReservations).set({
        status: "cancelled",
        cancellationReason: reason.slice(0, 240),
        cancelledAt: new Date(),
        waitlistPosition: null,
        updatedAt: new Date(),
      }).where(and(
        eq(classReservations.occurrenceId, occurrenceId),
        inArray(classReservations.status, ["confirmed", "waitlisted"]),
      )).returning();
      if (cancelled.length) {
        await tx.insert(classReservationEvents).values(cancelled.map((reservation) => ({
          reservationId: reservation.id,
          occurrenceId,
          event: "occurrence_cancelled",
          metadata: { reason },
        })));
        const confirmedReservationIds = cancelled
          .filter((reservation) => reservation.status === "cancelled")
          .map((reservation) => reservation.id);
        if (confirmedReservationIds.length) {
          const reservedLedgers = await tx.select().from(entitlementLedger).where(and(
            inArray(entitlementLedger.reservationId, confirmedReservationIds),
            eq(entitlementLedger.reserved, 1),
          ));
          if (reservedLedgers.length) {
            await tx.insert(entitlementLedger).values(reservedLedgers.map((ledger) => ({
              userId: ledger.userId,
              membershipId: ledger.membershipId,
              occurrenceId: ledger.occurrenceId,
              reservationId: ledger.reservationId,
              weekStart: ledger.weekStart,
              released: 1,
              reason: "occurrence_cancelled",
            })));
          }
          const bookedDiscoveryEntitlements = await tx.select({
            entitlement: discoveryEntitlements,
            pass: discoveryPasses,
          }).from(discoveryEntitlements)
            .innerJoin(discoveryPasses, eq(discoveryEntitlements.discoveryPassId, discoveryPasses.id))
            .where(and(
              inArray(discoveryEntitlements.reservationId, confirmedReservationIds),
              eq(discoveryEntitlements.status, "BOOKED"),
            ));
          for (const { entitlement, pass } of bookedDiscoveryEntitlements) {
            if (!canRestoreDiscoveryEntitlement(pass)) continue;
            await tx.update(discoveryEntitlements).set({
              status: "AVAILABLE",
              reservationId: null,
              cancelledAt: new Date(),
              updatedAt: new Date(),
            }).where(and(
              eq(discoveryEntitlements.id, entitlement.id),
              eq(discoveryEntitlements.status, "BOOKED"),
            ));
            const [remainingUsedEntitlement] = await tx.select({ id: discoveryEntitlements.id })
              .from(discoveryEntitlements)
              .where(and(
                eq(discoveryEntitlements.discoveryPassId, pass.id),
                inArray(discoveryEntitlements.status, ["BOOKED", "ATTENDED"]),
              ))
              .limit(1);
            if (!remainingUsedEntitlement) {
              await tx.update(discoveryPasses).set({
                status: "CLAIMED",
                updatedAt: new Date(),
              }).where(eq(discoveryPasses.id, pass.id));
            }
          }
        }
        for (const reservation of cancelled) {
          const [minor] = reservation.minorProfileId
            ? await tx.select({ firstName: minorProfiles.firstName, lastName: minorProfiles.lastName })
              .from(minorProfiles).where(eq(minorProfiles.id, reservation.minorProfileId))
            : [];
          const participantName = displayParticipantName(reservation, minor || null);
          if (occurrence) {
            await enqueueClassMemberNotification(tx, {
              reservation,
              occurrence,
              participantName,
              status: "cancelled",
              event: "occurrence_cancelled",
            });
            await enqueueStaffNotification(tx, {
              reservation,
              occurrence,
              participantName,
              event: "occurrence_cancelled_staff",
              message: "A provider/calendar change cancelled a class reservation",
            });
          }
        }
      }
      return cancelled;
    });
  }

  async updateClassReservation(
    id: string,
    updates: Partial<Pick<ClassReservation, "status" | "attendance" | "cancellationReason">>,
    actorId?: string,
    reason?: string,
  ): Promise<ClassReservation | undefined> {
    const validAttendance = [null, "PRESENT", "NO_SHOW", "LATE_CANCEL", "EXCUSED"];
    if (updates.attendance !== undefined && !validAttendance.includes(updates.attendance)) {
      throw new ClassBookingError("INVALID_ATTENDANCE", "Choose a valid attendance outcome.", 400);
    }
    return db.transaction(async (tx) => {
      const [before] = await tx.select().from(classReservations).where(eq(classReservations.id, id));
      if (!before) return undefined;
      const [reservation] = await tx.update(classReservations)
        .set({
          ...updates,
          attendanceRecordedAt: updates.attendance !== undefined ? new Date() : before.attendanceRecordedAt,
          attendanceRecordedBy: updates.attendance !== undefined ? actorId || null : before.attendanceRecordedBy,
          attendanceUpdatedAt: updates.attendance !== undefined ? new Date() : before.attendanceUpdatedAt,
          updatedAt: new Date(),
        })
        .where(eq(classReservations.id, id))
        .returning();
      if (!reservation) return undefined;

      await tx.insert(classReservationEvents).values({
        reservationId: reservation.id,
        occurrenceId: reservation.occurrenceId,
        event: updates.attendance !== undefined ? "attendance_updated" : "reservation_updated",
        metadata: {
          ...updates,
          previousAttendance: before.attendance,
          actorId: actorId || null,
          reason: reason || null,
        },
      });
      if (updates.attendance !== undefined && before.userId) {
        const [ledger] = await tx.select().from(entitlementLedger).where(and(
          eq(entitlementLedger.reservationId, reservation.id),
          eq(entitlementLedger.reserved, 1),
        )).orderBy(desc(entitlementLedger.createdAt)).limit(1);
        if (ledger && updates.attendance === "PRESENT" && before.attendance !== "PRESENT") {
          await tx.insert(entitlementLedger).values({
            userId: before.userId,
            membershipId: ledger.membershipId,
            occurrenceId: reservation.occurrenceId,
            reservationId: reservation.id,
            weekStart: ledger.weekStart,
            consumed: 1,
            reason: "attendance_present",
          });
        } else if (ledger && before.attendance === "PRESENT" && updates.attendance !== "PRESENT") {
          await tx.insert(entitlementLedger).values({
            userId: before.userId,
            membershipId: ledger.membershipId,
            occurrenceId: reservation.occurrenceId,
            reservationId: reservation.id,
            weekStart: ledger.weekStart,
            consumed: -1,
            reason: "attendance_correction",
          });
        }
        const [discoveryEntitlement] = await tx.select().from(discoveryEntitlements).where(eq(discoveryEntitlements.reservationId, reservation.id));
        if (discoveryEntitlement) {
          await tx.update(discoveryEntitlements).set({
            status: updates.attendance === "PRESENT" ? "ATTENDED" : "EXPIRED",
            attendedAt: updates.attendance === "PRESENT" ? new Date() : null,
            updatedAt: new Date(),
          }).where(eq(discoveryEntitlements.id, discoveryEntitlement.id));
        }
        const [attendanceTotal] = await tx.select({ value: count() }).from(classReservations).where(and(
          eq(classReservations.userId, before.userId),
          eq(classReservations.attendance, "PRESENT"),
        ));
        await tx.update(users).set({
          attendanceCount: Number(attendanceTotal?.value || 0),
        }).where(eq(users.id, before.userId));
      }
      if (updates.attendance !== undefined && actorId) {
        await tx.insert(memberAuditEvents).values({
          actorId,
          userId: before.userId,
          targetType: "class_reservation",
          targetId: before.id,
          action: "attendance_corrected",
          before: { attendance: before.attendance },
          after: { attendance: updates.attendance },
          reason: reason || null,
        });
      }
      return reservation;
    });
  }

  async recordClassReservationEvent(data: { reservationId?: string; occurrenceId?: string; event: string; metadata?: Record<string, unknown> }): Promise<void> {
    await db.insert(classReservationEvents).values({
      reservationId: data.reservationId,
      occurrenceId: data.occurrenceId,
      event: data.event,
      metadata: data.metadata || {},
    });
  }

  async startWebhookEvent(provider: string, eventId: string): Promise<boolean> {
    const id = `${provider}:${eventId}`;
    const now = new Date();
    const retryUntil = new Date(now.getTime() + 10 * 60 * 1000);
    try {
      await db.insert(webhookEvents).values({
        id,
        provider,
        status: "processing",
        attempts: 1,
        processingStartedAt: now,
        lockedUntil: retryUntil,
      });
      return true;
    } catch (error: any) {
      if (error?.code !== "23505") throw error;
      const [claimed] = await db.update(webhookEvents).set({
        status: "processing",
        attempts: sql`${webhookEvents.attempts} + 1`,
        processingStartedAt: now,
        lockedUntil: retryUntil,
        lastError: null,
      }).where(and(
        eq(webhookEvents.id, id),
        or(
          eq(webhookEvents.status, "failed_retryable"),
          and(
            eq(webhookEvents.status, "processing"),
            or(isNull(webhookEvents.lockedUntil), lte(webhookEvents.lockedUntil, now)),
          ),
        ),
      )).returning({ id: webhookEvents.id });
      return Boolean(claimed);
    }
  }

  async completeWebhookEvent(provider: string, eventId: string): Promise<void> {
    await db.update(webhookEvents).set({
      status: "completed",
      processedAt: new Date(),
      lockedUntil: null,
      lastError: null,
    }).where(eq(webhookEvents.id, `${provider}:${eventId}`));
  }

  async failWebhookEvent(provider: string, eventId: string, error: string, terminal = false): Promise<void> {
    await db.update(webhookEvents).set({
      status: terminal ? "failed_terminal" : "failed_retryable",
      lockedUntil: null,
      lastError: error.slice(0, 500),
    }).where(eq(webhookEvents.id, `${provider}:${eventId}`));
  }

  async claimWebhookEvent(provider: string, eventId: string): Promise<boolean> {
    // Compatibility wrapper for callers outside the webhook routes.
    try {
      return await this.startWebhookEvent(provider, eventId);
    } catch (error) {
      throw error;
    }
  }

  async getAdminUser(email: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return admin;
  }

  async createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser> {
    const [newAdmin] = await db.insert(adminUsers).values(adminUser).returning();
    return newAdmin;
  }

  async createTrialLead(lead: import("@shared/schema").InsertTrialLead): Promise<import("@shared/schema").TrialLead> {
    const { trialLeads } = await import("@shared/schema");
    const [newLead] = await db.insert(trialLeads).values({ ...lead, status: "new" }).returning();
    return newLead;
  }

  async getTrialLeads(program?: string, options: { includeSuppressed?: boolean; status?: import("@shared/schema").LeadStatus } = {}): Promise<import("@shared/schema").TrialLead[]> {
    const { trialLeads } = await import("@shared/schema");
    return db.select().from(trialLeads)
      .where(and(
        program ? eq(trialLeads.program, program) : undefined,
        not(ilike(trialLeads.email, INTERNAL_TEST_EMAIL_PATTERN)),
        options.status ? eq(trialLeads.status, options.status) : undefined,
        options.includeSuppressed ? undefined : not(inArray(trialLeads.status, ["needs_review", "suspicious", "archived"])),
      ))
      .orderBy(desc(trialLeads.createdAt));
  }

  async updateTrialLeadStatus(id: string, status: import("@shared/schema").LeadStatus): Promise<import("@shared/schema").TrialLead | undefined> {
    const { trialLeads } = await import("@shared/schema");
    const [lead] = await db.update(trialLeads).set({ status }).where(eq(trialLeads.id, id)).returning();
    return lead;
  }

  async createContactSubmission(data: import("@shared/schema").InsertContactSubmission): Promise<import("@shared/schema").ContactSubmission> {
    const { contactSubmissions } = await import("@shared/schema");
    const [submission] = await db.insert(contactSubmissions).values(data).returning();
    return submission;
  }

  async getContactSubmissions(): Promise<import("@shared/schema").ContactSubmission[]> {
    const { contactSubmissions } = await import("@shared/schema");
    return db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.createdAt));
  }

  async updateContactSubmissionStatus(id: string, status: import("@shared/schema").ContactStatus): Promise<import("@shared/schema").ContactSubmission | undefined> {
    const { contactSubmissions } = await import("@shared/schema");
    const [submission] = await db.update(contactSubmissions).set({ status }).where(eq(contactSubmissions.id, id)).returning();
    return submission;
  }

  async createAnalyticsEvent(data: import("@shared/schema").InsertAnalyticsEvent): Promise<import("@shared/schema").AnalyticsEvent> {
    const { analyticsEvents } = await import("@shared/schema");
    const [event] = await db.insert(analyticsEvents).values(data).returning();
    return event;
  }

  async createOrGetDiscoveryPassClaim(data: import("@shared/schema").InsertDiscoveryPassClaim): Promise<{ claim: DiscoveryPassClaim; created: boolean }> {
    const [created] = await db.insert(discoveryPassClaims)
      .values(data)
      .onConflictDoNothing({
        target: [discoveryPassClaims.experimentVariant, discoveryPassClaims.email],
      })
      .returning();
    if (created) return { claim: created, created: true };

    const [existing] = await db.select().from(discoveryPassClaims).where(and(
      eq(discoveryPassClaims.experimentVariant, data.experimentVariant),
      eq(discoveryPassClaims.email, data.email),
    )).limit(1);
    if (!existing) throw new Error("Discovery Pass claim could not be created");
    return { claim: existing, created: false };
  }

  async getDiscoveryPassClaim(id: string): Promise<DiscoveryPassClaim | undefined> {
    const [claim] = await db.select().from(discoveryPassClaims).where(eq(discoveryPassClaims.id, id)).limit(1);
    return claim;
  }

  async markDiscoveryPassClaimContinuation(id: string): Promise<DiscoveryPassClaim | undefined> {
    const [claim] = await db.update(discoveryPassClaims).set({
      continuationState: "continuation_started",
      updatedAt: new Date(),
    }).where(eq(discoveryPassClaims.id, id)).returning();
    return claim;
  }

  async linkDiscoveryPassClaim(id: string, memberId: string, email: string): Promise<DiscoveryPassClaim | undefined> {
    const [claim] = await db.update(discoveryPassClaims).set({
      linkedMemberId: memberId,
      linkedAt: new Date(),
      continuationState: "account_created",
      updatedAt: new Date(),
    }).where(and(
      eq(discoveryPassClaims.id, id),
      eq(discoveryPassClaims.email, email.trim().toLowerCase()),
      isNull(discoveryPassClaims.linkedMemberId),
    )).returning();
    return claim || await this.getDiscoveryPassClaim(id);
  }

  async markDiscoveryOnboarding(userId: string, source = "discovery_funnel"): Promise<MemberLifecycle> {
    return db.transaction(async (tx) => {
      const [existing] = await tx.select().from(memberLifecycles)
        .where(eq(memberLifecycles.userId, userId))
        .limit(1);
      if (existing && ["ACTIVE_MEMBER", "DISCOVERY_PASS"].includes(existing.currentState)) {
        return existing;
      }
      if (existing?.currentState === "DISCOVERY_ONBOARDING") {
        return existing;
      }
      const [lifecycle] = existing
        ? await tx.update(memberLifecycles).set({
          currentState: "DISCOVERY_ONBOARDING",
          source,
          updatedAt: new Date(),
        }).where(eq(memberLifecycles.id, existing.id)).returning()
        : await tx.insert(memberLifecycles).values({
          userId,
          currentState: "DISCOVERY_ONBOARDING",
          source,
        }).returning();
      await tx.insert(memberLifecycleEvents).values({
        userId,
        actorId: userId,
        previousState: existing?.currentState || null,
        nextState: "DISCOVERY_ONBOARDING",
        reason: "Discovery Pass onboarding started",
      });
      return lifecycle;
    });
  }

  async getDiscoveryAbReport(filters?: { days?: number; from?: Date; to?: Date; timezone?: string }) {
    const { from, to, days, timezone } = reportRange(filters || {}, 365);
    const eventRows = await db.select().from(analyticsEvents).where(and(
      eq(analyticsEvents.funnel, "training"),
      gte(analyticsEvents.createdAt, from),
      lte(analyticsEvents.createdAt, to),
    ));
    const claims = await db.select().from(discoveryPassClaims).where(and(
      eq(discoveryPassClaims.experimentVariant, "B"),
      gte(discoveryPassClaims.createdAt, from),
      lte(discoveryPassClaims.createdAt, to),
      not(ilike(discoveryPassClaims.email, INTERNAL_TEST_EMAIL_PATTERN)),
    ));
    const linkedIds = claims.map((claim) => claim.linkedMemberId).filter(Boolean) as string[];
    const requiredForms = await db.select({ id: forms.id }).from(forms).where(eq(forms.requiredBeforeBooking, true));
    const formRows = linkedIds.length
      ? await db.select({ userId: formResponses.userId, formId: formResponses.formId, status: formResponses.status })
        .from(formResponses).where(inArray(formResponses.userId, linkedIds))
      : [];
    const requiredIds = new Set(requiredForms.map((form) => form.id));
    const submittedForms = new Map<string, Set<string>>();
    for (const row of formRows) {
      if (row.status !== "submitted" || !requiredIds.has(row.formId)) continue;
      const set = submittedForms.get(row.userId) || new Set<string>();
      set.add(row.formId);
      submittedForms.set(row.userId, set);
    }
    const completeFormIds = new Set(linkedIds.filter((id) =>
      requiredIds.size > 0 && requiredForms.every((form) => submittedForms.get(id)?.has(form.id)),
    ));
    const passes = linkedIds.length
      ? await db.select({ userId: discoveryPasses.userId, activationTimestamp: discoveryPasses.activationTimestamp })
        .from(discoveryPasses).where(inArray(discoveryPasses.userId, linkedIds))
      : [];
    const activatedIds = new Set(passes.filter((pass) => pass.activationTimestamp).map((pass) => pass.userId));
    const reservations = linkedIds.length
      ? await db.select({ userId: classReservations.userId }).from(classReservations).where(inArray(classReservations.userId, linkedIds))
      : [];
    const bookedIds = new Set(reservations.map((row) => row.userId).filter(Boolean) as string[]);

    const stageNames = ["landing", "cta", "claim", "continue", "account", "forms", "activated", "booked"] as const;
    const emptyStages = () => Object.fromEntries(stageNames.map((stage) => [stage, 0])) as Record<string, number>;
    const eventStages = (variant: "A" | "B", locale?: "en" | "es") => {
      const stages = emptyStages();
      const sessionsByStage = new Map<string, Set<string>>();
      for (const event of eventRows) {
        const properties = event.properties && typeof event.properties === "object"
          ? event.properties as Record<string, unknown>
          : {};
        if (properties.funnel_kind !== "discovery_pass" || properties.variant !== variant) continue;
        if (locale && properties.locale !== locale) continue;
        const eventStage: Record<string, string> = {
          discovery_page_view: "landing",
          discovery_cta_click: "cta",
          discovery_claim_submitted: "claim",
          discovery_continue_to_account: "continue",
          discovery_account_created: "account",
          discovery_required_forms_completed: "forms",
          discovery_pass_activated: "activated",
          discovery_class_booked: "booked",
        };
        const stage = eventStage[event.event];
        if (!stage) continue;
        const sessions = sessionsByStage.get(stage) || new Set<string>();
        sessions.add(event.sessionId);
        sessionsByStage.set(stage, sessions);
      }
      sessionsByStage.forEach((sessions, stage) => { stages[stage] = sessions.size; });
      return { stages, sessionsByStage };
    };
    const dbVariantBStages = (locale?: "en" | "es") => {
      const filteredClaims = claims.filter((claim) => !locale || claim.locale === locale);
      const ids = new Set(filteredClaims.map((claim) => claim.linkedMemberId).filter(Boolean) as string[]);
      const stages = eventStages("B", locale).stages;
      stages.claim = filteredClaims.length;
      stages.continue = filteredClaims.filter((claim) => claim.continuationState !== "claim_submitted").length;
      stages.account = ids.size;
      stages.forms = Array.from(completeFormIds).filter((id) => ids.has(id)).length;
      stages.activated = Array.from(activatedIds).filter((id) => ids.has(id)).length;
      stages.booked = Array.from(bookedIds).filter((id) => ids.has(id)).length;
      return stages;
    };
    const safeRate = (value: number, denominator: number) => denominator > 0 ? Math.round((value / denominator) * 100) : null;
    const conversionFor = (stages: Record<string, number>) => {
      const values = stageNames.map((stage) => stages[stage] || 0);
      return Object.fromEntries(stageNames.map((stage, index) => [
        stage,
        { fromPrevious: index === 0 ? null : safeRate(values[index], values[index - 1]), overall: safeRate(values[index], values[0]) },
      ]));
    };
    const a = eventStages("A").stages;
    const b = dbVariantBStages();
    const combined = Object.fromEntries(stageNames.map((stage) => [stage, (a[stage] || 0) + (b[stage] || 0)]));
    const byLocale = Object.fromEntries((["en", "es"] as const).map((locale) => {
      const localeA = eventStages("A", locale);
      const localeB = dbVariantBStages(locale);
      const consentedSessions = new Set<string>();
      for (const event of eventRows) {
        const properties = event.properties && typeof event.properties === "object"
          ? event.properties as Record<string, unknown>
          : {};
        if (properties.funnel_kind === "discovery_pass" && properties.variant && properties.locale === locale) {
          consentedSessions.add(event.sessionId);
        }
      }
      return [locale, {
        A: { stages: localeA.stages, consentedSessions: consentedSessions.size },
        B: { stages: localeB, consentedSessions: consentedSessions.size },
      }];
    })) as Record<"en" | "es", Record<"A" | "B", { stages: Record<string, number>; consentedSessions: number }>>;
    return {
      range: { from: from.toISOString(), to: to.toISOString(), days, timezone },
      variants: {
        A: { stages: a, conversion: conversionFor(a), source: "consented discovery analytics; post-CTA stages require consent" },
        B: { stages: b, conversion: conversionFor(b), source: "anonymous claim records plus linked application records; landing/CTA use consented analytics" },
      },
      combined: { stages: combined, conversion: conversionFor(combined) },
      byLocale,
    };
  }

  async getCampaignReport(filters: {
    funnel: "training" | "adaptive_capacity";
    source?: string;
    medium?: string;
    campaign?: string;
    landingPath?: string;
    from?: Date;
    to?: Date;
    timezone?: string;
  }) {
    const { from, to, timezone } = reportRange(filters, 365);
    const { analyticsEvents, trialLeads } = await import("@shared/schema");
    const events = await db.select().from(analyticsEvents).where(and(
      eq(analyticsEvents.funnel, filters.funnel),
      gte(analyticsEvents.createdAt, from),
      lte(analyticsEvents.createdAt, to),
    ));
    const leads = await db.select().from(trialLeads).where(and(
      filters.funnel === "adaptive_capacity"
        ? eq(trialLeads.program, "adaptive-capacity")
        : sql`${trialLeads.program} <> 'adaptive-capacity'`,
      not(ilike(trialLeads.email, INTERNAL_TEST_EMAIL_PATTERN)),
      not(inArray(trialLeads.status, ["needs_review", "suspicious", "archived"])),
      gte(trialLeads.createdAt, from),
      lte(trialLeads.createdAt, to),
    ));
    const value = (obj: unknown, key: string) => {
      const v = obj && typeof obj === "object" ? (obj as Record<string, unknown>)[key] : undefined;
      return typeof v === "string" && v.trim() ? v.trim() : "(none)";
    };
    const matches = (obj: unknown) => {
      const source = value(obj, "utm_source");
      const medium = value(obj, "utm_medium");
      const campaign = value(obj, "utm_campaign");
      const landingPath = value(obj, "landing_path");
      return (!filters.source || filters.source === source) &&
        (!filters.medium || filters.medium === medium) &&
        (!filters.campaign || filters.campaign === campaign) &&
        (!filters.landingPath || filters.landingPath === landingPath);
    };
    type Row = {
      source: string;
      medium: string;
      campaign: string;
      landingPath: string;
      pageViews: Set<string>;
      funnelSteps: Set<string>;
      formStarts: Set<string>;
      submissions: Set<string>;
      successfulLeads: Set<string>;
      totalLeads: Set<string>;
      consentedSessions: Set<string>;
    };
    const rows = new Map<string, Row>();
    const getRow = (obj: unknown) => {
      const row = { source: value(obj, "utm_source"), medium: value(obj, "utm_medium"), campaign: value(obj, "utm_campaign"), landingPath: value(obj, "landing_path") };
      const key = JSON.stringify(row);
      if (!rows.has(key)) rows.set(key, {
        ...row,
        pageViews: new Set(),
        funnelSteps: new Set(),
        formStarts: new Set(),
        submissions: new Set(),
        successfulLeads: new Set(),
        totalLeads: new Set(),
        consentedSessions: new Set(),
      });
      return rows.get(key)!;
    };
    for (const event of events) {
      if (!matches(event.properties)) continue;
      const row = getRow(event.properties);
      if (event.event === "page_view") row.pageViews.add(event.sessionId);
      if (event.event === "funnel_step") row.funnelSteps.add(event.sessionId);
      if (event.event === "lead_form_started") row.formStarts.add(event.sessionId);
      if (event.event === "lead_form_submitted") row.submissions.add(event.sessionId);
      if (event.event === "lead_form_succeeded") row.successfulLeads.add(event.sessionId);
      row.consentedSessions.add(event.sessionId);
    }
    for (const lead of leads) {
      if (!matches(lead.attribution)) continue;
       getRow(lead.attribution).totalLeads.add((lead.email || lead.id).toLowerCase());
    }
    const breakdown = Array.from(rows.values()).map((row) => ({
      source: row.source,
      medium: row.medium,
      campaign: row.campaign,
      landingPath: row.landingPath,
      pageViews: row.pageViews.size,
      funnelSteps: row.funnelSteps.size,
      formStarts: row.formStarts.size,
      submissions: row.submissions.size,
      successfulLeads: row.successfulLeads.size,
      totalLeads: row.totalLeads.size,
      consentedSessions: row.consentedSessions.size,
    }));
    const totals = breakdown.reduce((total, row) => ({
      pageViews: total.pageViews + row.pageViews,
      funnelSteps: total.funnelSteps + row.funnelSteps,
      formStarts: total.formStarts + row.formStarts,
      submissions: total.submissions + row.submissions,
      successfulLeads: total.successfulLeads + row.successfulLeads,
      totalLeads: total.totalLeads + row.totalLeads,
      consentedSessions: total.consentedSessions + row.consentedSessions,
    }), { pageViews: 0, funnelSteps: 0, formStarts: 0, submissions: 0, successfulLeads: 0, totalLeads: 0, consentedSessions: 0 });
    return {
      funnel: filters.funnel,
      range: { from: from.toISOString(), to: to.toISOString(), timezone },
      filters: Object.fromEntries(Object.entries(filters)
        .filter(([, value]) => value instanceof Date ? false : Boolean(value))
        .map(([key, value]) => [key, String(value)])),
      totals,
      breakdown,
    };
  }

  async getDiscoveryFunnelReport(filters: { days?: number; locale?: "en" | "es"; from?: Date; to?: Date; timezone?: string } = {}) {
    const { from, to, days, timezone } = reportRange(filters, 90);
    const rawRecentUsers = await db.select({
      id: users.id,
      locale: users.locale,
      emailVerifiedAt: users.emailVerifiedAt,
      accountStatus: users.accountStatus,
    }).from(users).where(and(
      eq(users.role, "member"),
      gte(users.createdAt, from),
      lte(users.createdAt, to),
      not(ilike(users.email, INTERNAL_TEST_EMAIL_PATTERN)),
      filters.locale ? eq(users.locale, filters.locale) : sql`true`,
    ));
    const recentUsers = rawRecentUsers.filter((user) =>
      Boolean(user.emailVerifiedAt) &&
      !["unverified", "suspicious", "needs_review", "archived"].includes(user.accountStatus),
    );
    const filteredOut = rawRecentUsers.length - recentUsers.length;
    const userIds = recentUsers.map((user) => user.id);
    const requiredForms = await db.select({ id: forms.id }).from(forms).where(eq(forms.requiredBeforeBooking, true));
    const requiredFormIds = requiredForms.map((form) => form.id);
    const responses = userIds.length
      ? await db.select({ userId: formResponses.userId, formId: formResponses.formId, status: formResponses.status })
        .from(formResponses).where(inArray(formResponses.userId, userIds))
      : [];
    const submittedByUser = new Map<string, Set<string>>();
    const startedUsers = new Set<string>();
    for (const response of responses) {
      if (response.status === "draft" || response.status === "submitted") startedUsers.add(response.userId);
      if (response.status === "submitted") {
        const submitted = submittedByUser.get(response.userId) || new Set<string>();
        submitted.add(response.formId);
        submittedByUser.set(response.userId, submitted);
      }
    }
    const formsCompleteUsers = new Set(userIds.filter((id) =>
      requiredFormIds.length > 0 && requiredFormIds.every((formId) => submittedByUser.get(id)?.has(formId)),
    ));
    const passes = userIds.length
      ? await db.select({ userId: discoveryPasses.userId, activationTimestamp: discoveryPasses.activationTimestamp })
        .from(discoveryPasses).where(inArray(discoveryPasses.userId, userIds))
      : [];
    const activatedUsers = new Set(passes.filter((pass) => pass.activationTimestamp).map((pass) => pass.userId));
    const reservations = userIds.length
      ? await db.select({ userId: classReservations.userId })
        .from(classReservations).where(inArray(classReservations.userId, userIds))
      : [];
    const bookedUsers = new Set(reservations.map((reservation) => reservation.userId).filter(Boolean) as string[]);
    const eventRows = await db.select().from(analyticsEvents).where(and(
      eq(analyticsEvents.funnel, "training"),
      gte(analyticsEvents.createdAt, from),
      lte(analyticsEvents.createdAt, to),
    ));
    const consentedSteps = new Map<string, Set<string>>();
    const consentedSessions = new Set<string>();
    for (const event of eventRows) {
      const properties = event.properties && typeof event.properties === "object"
        ? event.properties as Record<string, unknown>
        : {};
      if (properties.funnel_kind !== "discovery_pass") continue;
      if (filters.locale && properties.locale !== filters.locale) continue;
      const stage = event.event.replace(/^discovery_/, "");
      consentedSessions.add(event.sessionId);
      const sessions = consentedSteps.get(stage) || new Set<string>();
      sessions.add(event.sessionId);
      consentedSteps.set(stage, sessions);
    }
    const stages = {
      landingPageViewed: consentedSteps.get("page_view")?.size || 0,
      ctaClicked: consentedSteps.get("cta_click")?.size || 0,
      accountCreated: recentUsers.length,
      formsStarted: consentedSteps.get("forms_started")?.size || startedUsers.size,
      formsCompleted: formsCompleteUsers.size,
      passActivated: activatedUsers.size,
      classBooked: bookedUsers.size,
    };
    const safeRate = (value: number, denominator: number) => denominator > 0 ? Math.round((value / denominator) * 100) : null;
    const stageValues = Object.values(stages);
    const conversion = Object.fromEntries(Object.entries(stages).map(([key, value], index) => [
      key,
      { fromPrevious: index === 0 ? null : safeRate(value, stageValues[index - 1]), overall: safeRate(value, stageValues[0]) },
    ]));
    const diagnostics = {
      accountCreatedNoFormsStarted: recentUsers.filter((user) => !startedUsers.has(user.id)).length,
      formsStartedNotCompleted: Array.from(startedUsers).filter((id) => !formsCompleteUsers.has(id)).length,
      formsCompletedNotActivated: Array.from(formsCompleteUsers).filter((id) => !activatedUsers.has(id)).length,
      passActivatedNotBooked: Array.from(activatedUsers).filter((id) => !bookedUsers.has(id)).length,
    };
    const byLocale = Object.fromEntries((["en", "es"] as const).map((locale) => {
      const localeUsers = recentUsers.filter((user) => user.locale === locale);
      const localeIds = new Set(localeUsers.map((user) => user.id));
      const localeSessions = new Set<string>();
      const localeSteps = new Map<string, Set<string>>();
      for (const event of eventRows) {
        const properties = event.properties && typeof event.properties === "object"
          ? event.properties as Record<string, unknown>
          : {};
        if (properties.funnel_kind !== "discovery_pass" || properties.locale !== locale) continue;
        localeSessions.add(event.sessionId);
        const stage = event.event.replace(/^discovery_/, "");
        const sessions = localeSteps.get(stage) || new Set<string>();
        sessions.add(event.sessionId);
        localeSteps.set(stage, sessions);
      }
      return [locale, {
        stages: {
          landingPageViewed: localeSteps.get("page_view")?.size || 0,
          ctaClicked: localeSteps.get("cta_click")?.size || 0,
          accountCreated: localeUsers.length,
          formsStarted: localeSteps.get("forms_started")?.size || Array.from(startedUsers).filter((id) => localeIds.has(id)).length,
          formsCompleted: Array.from(formsCompleteUsers).filter((id) => localeIds.has(id)).length,
          passActivated: Array.from(activatedUsers).filter((id) => localeIds.has(id)).length,
          classBooked: Array.from(bookedUsers).filter((id) => localeIds.has(id)).length,
        },
        consentedSessions: localeSessions.size,
      }];
    }));
    const attributionGroups = new Map<string, {
      source: string;
      medium: string;
      campaign: string;
      landingPath: string;
      sessions: Set<string>;
      stages: Map<string, Set<string>>;
    }>();
    for (const event of eventRows) {
      const properties = event.properties && typeof event.properties === "object"
        ? event.properties as Record<string, unknown>
        : {};
      if (properties.funnel_kind !== "discovery_pass") continue;
      if (filters.locale && properties.locale !== filters.locale) continue;
      const groupValues = {
        source: String(properties.utm_source || "(none)"),
        medium: String(properties.utm_medium || "(none)"),
        campaign: String(properties.utm_campaign || "(none)"),
        landingPath: String(properties.landing_path || event.path || "(unknown)"),
      };
      const key = JSON.stringify(groupValues);
      const group = attributionGroups.get(key) || {
        ...groupValues,
        sessions: new Set<string>(),
        stages: new Map<string, Set<string>>(),
      };
      group.sessions.add(event.sessionId);
      const stage = event.event.replace(/^discovery_/, "");
      const sessions = group.stages.get(stage) || new Set<string>();
      sessions.add(event.sessionId);
      group.stages.set(stage, sessions);
      attributionGroups.set(key, group);
    }
    const byAttribution = Array.from(attributionGroups.values()).map((group) => ({
      source: group.source,
      medium: group.medium,
      campaign: group.campaign,
      landingPath: group.landingPath,
      consentedSessions: group.sessions.size,
      stages: Object.fromEntries(Array.from(group.stages.entries()).map(([stage, sessions]) => [stage, sessions.size])),
    })).sort((a, b) => b.consentedSessions - a.consentedSessions);
    return {
      range: { from: from.toISOString(), to: to.toISOString(), days, timezone },
      stages,
      conversion,
      diagnostics,
      filteredOut: {
        rawAccountsCreated: rawRecentUsers.length,
        excludedAccounts: filteredOut,
        reason: "unverified, needs_review, suspicious, and archived accounts are excluded from conversion totals",
      },
      consented: {
        sessions: consentedSessions.size,
        stages: Object.fromEntries(Array.from(consentedSteps.entries()).map(([stage, sessions]) => [stage, sessions.size])),
      },
      byLocale,
      byAttribution,
      sources: {
        landingPageViewed: "consented application analytics",
        ctaClicked: "consented application analytics",
        accountCreated: "member accounts created in the application",
        formsStarted: "consented analytics, with saved form drafts as fallback",
        formsCompleted: "submitted required forms in the application",
        passActivated: "activated Discovery Pass records in the application",
        classBooked: "class reservation records in the application",
      },
    };
  }

  async createStaffNotification(data: { kind: string; title: string; message: string; href: string }) {
    const { staffNotifications } = await import("@shared/schema");
    const [notification] = await db.insert(staffNotifications).values(data).returning();
    return notification;
  }

  async getStaffNotifications() {
    const { staffNotifications } = await import("@shared/schema");
    return db.select().from(staffNotifications).orderBy(desc(staffNotifications.createdAt)).limit(50);
  }

  async markStaffNotificationRead(id: string) {
    const { staffNotifications } = await import("@shared/schema");
    const [notification] = await db.update(staffNotifications).set({ readAt: new Date() }).where(eq(staffNotifications.id, id)).returning();
    return notification;
  }
}

export const storage = new DatabaseStorage();

async function seedTrainerData() {
  const existingTrainers = await storage.getTrainers();
  if (existingTrainers.length === 0) {
    await storage.createTrainer({
      name: "Raymi Gonzalez",
      bio: "Purple belt 3rd degree with 5 years of experience. Leads the women's only program at Gracie Barra Ventura.",
      photoUrl: "https://images.unsplash.com/photo-1594381898411-846e7d193883?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
      specialties: ["1-on-1 BJJ Training", "Strength & Conditioning", "Women's Program Leadership"],
      beltRank: "Purple Belt 3rd Degree",
      availability: {
        "Monday": ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"],
        "Tuesday": ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"],
        "Wednesday": ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"],
        "Thursday": ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"],
        "Friday": ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00"],
        "Saturday": ["09:00","10:00","11:00","12:00","13:00","14:00","15:00"]
      }
    });
  }
}

async function seedFormData() {
  const existingForms = await storage.getForms();
  const existingSlugs = new Set(existingForms.map(f => f.slug));

  const allForms = [
    {
      slug: "personal-training-intake",
      title: "Personal Training Intake Form",
      description: "Basic information about your training background and goals",
      isRequired: true,
      requiredBeforeBooking: false,
      retakeable: true,
      fields: [
        { name: "trainingExperience", label: "Previous Training Experience", type: "textarea", required: true },
        { name: "currentFitness", label: "Current Fitness Level", type: "select", options: ["Beginner", "Intermediate", "Advanced"], required: true },
        { name: "injuries", label: "Any Current Injuries or Limitations", type: "textarea", required: false },
        { name: "availability", label: "Preferred Training Days/Times", type: "textarea", required: true }
      ]
    },
    {
      slug: "health-parq",
      title: "Health & PAR-Q Assessment",
      description: "Physical Activity Readiness Questionnaire",
      isRequired: true,
      requiredBeforeBooking: false,
      retakeable: false,
      fields: [
        { name: "heartCondition", label: "Has a doctor ever said you have a heart condition?", type: "boolean", required: true },
        { name: "chestPain", label: "Do you feel pain in your chest during physical activity?", type: "boolean", required: true },
        { name: "dizziness", label: "Do you ever experience dizziness or lose consciousness?", type: "boolean", required: true },
        { name: "medications", label: "Are you currently taking any medications?", type: "boolean", required: true },
        { name: "medicationDetails", label: "If yes, please list medications", type: "textarea", required: false },
        { name: "emergencyContact", label: "Emergency Contact Name & Phone", type: "text", required: true }
      ]
    },
    {
      slug: "goals-preferences",
      title: "Goals & Preferences",
      description: "Help us understand your training goals",
      isRequired: true,
      requiredBeforeBooking: false,
      retakeable: true,
      fields: [
        { name: "primaryGoal", label: "Primary Training Goal", type: "select", options: ["Self-Defense", "Competition", "Fitness", "Fun & Social", "Weight Loss"], required: true },
        { name: "shortTermGoals", label: "Short-term Goals (3 months)", type: "textarea", required: true },
        { name: "longTermGoals", label: "Long-term Goals (1 year)", type: "textarea", required: true },
        { name: "preferredStyle", label: "Preferred Training Style", type: "select", options: ["Gi", "No-Gi", "Both"], required: true }
      ]
    },
    {
      slug: "liability-waiver",
      title: "Martial Arts Liability Waiver",
      description: "Required waiver acknowledging the risks of martial arts training",
      isRequired: true,
      requiredBeforeBooking: true,
      retakeable: false,
      fields: [
        { name: "fullName", label: "Full Name", type: "text", required: true },
        { name: "dateOfBirth", label: "Date of Birth", type: "date", required: true },
        { name: "emergencyContact", label: "Emergency Contact Name", type: "text", required: true },
        { name: "emergencyPhone", label: "Emergency Contact Phone", type: "tel", required: true },
        { name: "riskAcknowledgment", label: "I understand martial arts training involves physical contact and risk of injury", type: "checkbox", required: true },
        { name: "voluntaryParticipation", label: "I voluntarily participate and assume all risks associated with training", type: "checkbox", required: true },
        { name: "liabilityRelease", label: "I release Ground Up Jiu-Jitsu and its instructors from liability for injuries sustained during training", type: "checkbox", required: true },
        { name: "safetyGuidelines", label: "I agree to follow all instructor safety guidelines at all times", type: "checkbox", required: true },
        { name: "digitalSignature", label: "Digital Signature (type your full name)", type: "text", required: true },
        { name: "signatureDate", label: "Date", type: "date", required: true }
      ]
    },
    {
      slug: "media-release",
      title: "Media Release Authorization",
      description: "Authorization for use of photos and videos",
      isRequired: true,
      requiredBeforeBooking: false,
      retakeable: true,
      fields: [
        { name: "mediaConsent", label: "Do you allow Ground Up Jiu-Jitsu to use photos and videos of you for marketing, social media, and promotional purposes?", type: "boolean", required: true }
      ]
    },
    {
      slug: "gym-rules",
      title: "Gym Rules Agreement",
      description: "Acknowledgment of gym policies and code of conduct",
      isRequired: true,
      requiredBeforeBooking: true,
      retakeable: false,
      fields: [
        { name: "followInstructions", label: "I will follow all instructor directions during class", type: "checkbox", required: true },
        { name: "respectfulTraining", label: "I will train respectfully and considerately with all other students", type: "checkbox", required: true },
        { name: "reportInjuries", label: "I will immediately report any injuries or discomfort to the instructor", type: "checkbox", required: true },
        { name: "unsafeBehavior", label: "I understand that unsafe behavior may result in removal from class without refund", type: "checkbox", required: true }
      ]
    },
    {
      slug: "minor-consent",
      title: "Minor Participation Consent",
      description: "Required for participants under 18 years of age",
      isRequired: false,
      retakeable: true,
      fields: [
        { name: "parentName", label: "Parent / Guardian Full Name", type: "text", required: true },
        { name: "childName", label: "Child's Full Name", type: "text", required: true },
        { name: "childAge", label: "Child's Age", type: "text", required: true },
        { name: "emergencyContact", label: "Emergency Contact Name", type: "text", required: true },
        { name: "emergencyPhone", label: "Emergency Contact Phone", type: "tel", required: true },
        { name: "parentSignature", label: "Parent / Guardian Digital Signature (type full name)", type: "text", required: true },
        { name: "signatureDate", label: "Date", type: "date", required: true }
      ]
    }
  ];

  for (const form of allForms) {
    if (!existingSlugs.has(form.slug)) {
      await storage.createForm(form);
    } else if (form.requiredBeforeBooking !== undefined) {
      await db.update(forms)
        .set({ requiredBeforeBooking: form.requiredBeforeBooking })
        .where(eq(forms.slug, form.slug));
    }
  }
}

seedTrainerData().catch(console.error);
seedFormData().catch(console.error);
