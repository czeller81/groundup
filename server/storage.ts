import { 
  trainers, 
  bookings, 
  adminUsers,
  users,
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
} from "@shared/schema";
import { db } from "./db";
 import { eq, and, gte, gt, lte, desc, asc, sql, count, sum, or, ilike, inArray, isNotNull, isNull, not } from "drizzle-orm";

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
  discoveryCategory,
  evaluateBookingEligibilityWithExecutor,
  evaluateMinorBookingEligibilityWithExecutor,
  getMembershipWeekStart,
  type BookingEligibility,
} from "./member-entitlements";

export interface IStorage {
  getUserById(id: string): Promise<User | undefined>;
  listMinorProfiles(guardianUserId: string): Promise<MinorProfile[]>;
  createMinorProfile(data: Omit<MinorProfile, "id" | "createdAt" | "updatedAt">): Promise<MinorProfile>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(email: string, password: string, firstName: string, lastName: string, phone?: string, locale?: "en" | "es"): Promise<SafeUser>;
  createUserFromWebhook(email: string, firstName: string, lastName: string): Promise<SafeUser>;
  validateUserPassword(email: string, password: string): Promise<SafeUser | null>;
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
  getMembersNeedingForms(): Promise<Array<SafeUser & { missingForms: string[] }>>;
  getUserProfile(userId: string): Promise<{ user: SafeUser; formResponses: (FormResponse & { form: Form })[]; bookings: BookingWithTrainer[]; classReservations: Array<ClassReservation & { occurrence: ClassOccurrence; trainer: Trainer | null; classType: ClassType | null; minorProfile: MinorProfile | null }>; memberships: Membership[]; sessionNotes: (SessionNote & { coach: SafeUser })[] } | undefined>;
  updateAdminNotes(userId: string, notes: string): Promise<SafeUser | undefined>;
  
  getAdminStats(): Promise<{ totalUsers: number; newUsers30Days: number; activeMemberships: number; upcomingSessions7Days: number; monthlyRevenue: number; membersNeedingForms: number; totalRequiredForms: number }>;
  
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
  }): Promise<{ reservation: ClassReservation; occurrence: ClassOccurrence; promoted?: ClassReservation }>;
  getUserClassReservations(userId: string): Promise<Array<ClassReservation & { occurrence: ClassOccurrence; trainer: Trainer | null; classType: ClassType | null; minorProfile: MinorProfile | null }>>;
  getGuardianMinorReservations(guardianUserId: string): Promise<Array<ClassReservation & {
    occurrence: ClassOccurrence;
    minorProfile: Pick<MinorProfile, "id" | "firstName" | "lastName" | "consentRevokedAt">;
  }>>;
  getClassReservation(id: string): Promise<(ClassReservation & { occurrence: ClassOccurrence }) | undefined>;
  cancelClassReservation(input: { reservationId: string; userId?: string; manageTokenHash?: string; reason?: string }): Promise<{ reservation: ClassReservation; promoted?: ClassReservation }>;
  getOccurrenceReservations(occurrenceId: string): Promise<{
    confirmed: Array<ClassReservation & { minorProfile: Pick<MinorProfile, "id" | "firstName" | "lastName"> | null }>;
    waitlisted: Array<ClassReservation & { minorProfile: Pick<MinorProfile, "id" | "firstName" | "lastName"> | null }>;
  }>;
  updateClassReservation(id: string, updates: Partial<Pick<ClassReservation, "status" | "attendance" | "cancellationReason">>, actorId?: string, reason?: string): Promise<ClassReservation | undefined>;
  recordClassReservationEvent(data: { reservationId?: string; occurrenceId?: string; event: string; metadata?: Record<string, unknown> }): Promise<void>;
  
  deleteFormResponse(userId: string, formId: string): Promise<void>;

  getAdminUser(email: string): Promise<AdminUser | undefined>;
  createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser>;

  createTrialLead(lead: import("@shared/schema").InsertTrialLead): Promise<import("@shared/schema").TrialLead>;
  getTrialLeads(program?: string): Promise<import("@shared/schema").TrialLead[]>;
  updateTrialLeadStatus(id: string, status: import("@shared/schema").LeadStatus): Promise<import("@shared/schema").TrialLead | undefined>;
  createContactSubmission(data: import("@shared/schema").InsertContactSubmission): Promise<import("@shared/schema").ContactSubmission>;
  getContactSubmissions(): Promise<import("@shared/schema").ContactSubmission[]>;
  updateContactSubmissionStatus(id: string, status: import("@shared/schema").ContactStatus): Promise<import("@shared/schema").ContactSubmission | undefined>;
  createAnalyticsEvent(data: import("@shared/schema").InsertAnalyticsEvent): Promise<import("@shared/schema").AnalyticsEvent>;
  getCampaignReport(filters: {
    funnel: "training" | "adaptive_capacity";
    source?: string;
    medium?: string;
    campaign?: string;
    landingPath?: string;
  }): Promise<{
    funnel: string;
    filters: Record<string, string>;
    totals: { pageViews: number; funnelSteps: number; formStarts: number; submissions: number; successfulLeads: number; totalLeads: number; consentedSessions: number };
    breakdown: Array<{ source: string; medium: string; campaign: string; landingPath: string; pageViews: number; funnelSteps: number; formStarts: number; submissions: number; successfulLeads: number; totalLeads: number; consentedSessions: number }>;
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

  async createUser(email: string, password: string, firstName: string, lastName: string, phone?: string, locale: "en" | "es" = "en"): Promise<SafeUser> {
    const passwordHash = await bcrypt.hash(password, 10);
    const [newUser] = await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      phone: phone || null,
      locale,
      role: "member"
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
      role: "member"
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
    const [newBooking] = await db.insert(bookings).values({
      ...booking,
      userId
    }).returning();
    return newBooking;
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
     const allUsers = await db.select().from(users).where(and(
       eq(users.role, "member"),
       not(ilike(users.email, INTERNAL_TEST_EMAIL_PATTERN)),
     ));
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

  async getAdminStats(): Promise<{ totalUsers: number; newUsers30Days: number; activeMemberships: number; upcomingSessions7Days: number; monthlyRevenue: number; membersNeedingForms: number; totalRequiredForms: number }> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
     const [totalUsersResult] = await db.select({ count: count() }).from(users).where(not(ilike(users.email, INTERNAL_TEST_EMAIL_PATTERN)));
     const [memberUsersResult] = await db.select({ count: count() }).from(users).where(and(
       eq(users.role, "member"),
       not(ilike(users.email, INTERNAL_TEST_EMAIL_PATTERN)),
     ));
    
     const [newUsersResult] = await db.select({ count: count() }).from(users).where(and(
       gte(users.createdAt, thirtyDaysAgo),
       not(ilike(users.email, INTERNAL_TEST_EMAIL_PATTERN)),
     ));
    
     const [activeMembershipsResult] = await db
       .select({ count: count() })
       .from(memberships)
       .innerJoin(users, eq(memberships.userId, users.id))
       .where(and(
         eq(memberships.status, "active"),
         not(ilike(users.email, INTERNAL_TEST_EMAIL_PATTERN)),
       ));
    
     const [upcomingSessionsResult] = await db
       .select({ count: count() })
       .from(bookings)
       .leftJoin(users, eq(bookings.userId, users.id))
       .where(and(
         gte(bookings.start, now),
         lte(bookings.start, sevenDaysFromNow),
         eq(bookings.status, "paid"),
         or(isNull(users.id), not(ilike(users.email, INTERNAL_TEST_EMAIL_PATTERN))),
       ));
    
    const [revenueResult] = await db
      .select({ total: sum(bookings.amountCents) })
      .from(bookings)
       .leftJoin(users, eq(bookings.userId, users.id))
      .where(and(
        gte(bookings.createdAt, startOfMonth),
         eq(bookings.status, "paid"),
         or(isNull(users.id), not(ilike(users.email, INTERNAL_TEST_EMAIL_PATTERN))),
      ));
    
    const requiredFormIds = await this.getRequiredFormIds();
    const completedUserIds = await this.getCompletedUserIds(requiredFormIds);
     const membersNeedingForms = memberUsersResult.count - completedUserIds.size;

    return {
      totalUsers: totalUsersResult.count,
      newUsers30Days: newUsersResult.count,
      activeMemberships: activeMembershipsResult.count,
      upcomingSessions7Days: upcomingSessionsResult.count,
      monthlyRevenue: Number(revenueResult.total || 0),
      membersNeedingForms: Math.max(0, membersNeedingForms),
      totalRequiredForms: requiredFormIds.length,
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

    const visibleRows = rows.filter(({ occurrence }) => includeDisabled || isPublicOccurrenceText(occurrence.title, occurrence.description, occurrence.location));
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
  }): Promise<{ reservation: ClassReservation; occurrence: ClassOccurrence; promoted?: ClassReservation }> {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select id from class_occurrences where id = ${input.occurrenceId} for update`);
      const [occurrence] = await tx.select().from(classOccurrences).where(eq(classOccurrences.id, input.occurrenceId));
      if (!occurrence) throw new ClassBookingError("OCCURRENCE_NOT_FOUND", "This class occurrence does not exist.", 404);
      if (occurrence.status !== "active" || !occurrence.bookingEnabled) {
        throw new ClassBookingError("OCCURRENCE_UNAVAILABLE", "This class is not available for booking.", 409);
      }
      if (occurrence.start <= new Date()) {
        throw new ClassBookingError("OCCURRENCE_STARTED", "This class has already started.", 409);
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
      }).returning();
      await tx.insert(classReservationEvents).values({
        reservationId: reservation.id,
        occurrenceId: occurrence.id,
        event: status === "confirmed" ? "reservation_confirmed" : "waitlist_joined",
        metadata: {
          source: input.minorProfileId ? "guardian_portal" : input.userId ? "member_portal" : "first_visit",
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
      return { reservation, occurrence };
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

  async cancelClassReservation(input: { reservationId: string; userId?: string; manageTokenHash?: string; reason?: string }): Promise<{ reservation: ClassReservation; promoted?: ClassReservation }> {
    return db.transaction(async (tx) => {
      const [current] = await tx.select().from(classReservations).where(eq(classReservations.id, input.reservationId));
      if (!current) throw new ClassBookingError("RESERVATION_NOT_FOUND", "Reservation not found.", 404);
      await tx.execute(sql`select id from class_occurrences where id = ${current.occurrenceId} for update`);
      const [occurrence] = await tx.select().from(classOccurrences).where(eq(classOccurrences.id, current.occurrenceId));
      const authorized = (input.userId && current.userId === input.userId)
        || (input.manageTokenHash && current.manageTokenHash === input.manageTokenHash);
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
      }).where(eq(classReservations.id, current.id)).returning();
      await tx.insert(classReservationEvents).values({
        reservationId: reservation.id,
        occurrenceId: reservation.occurrenceId,
        event: "reservation_cancelled",
        metadata: { previousStatus: current.status },
      });

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
        const cutoffHours = member?.plan?.cancellationCutoffHours ?? 4;
        const late = Boolean(occurrence && occurrence.start.getTime() - Date.now() < cutoffHours * 60 * 60 * 1000);
        const consumes = late && (member?.plan?.lateCancelPolicy || "consume") === "consume";
        if (reservationLedger && !consumes) {
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
        const [discoveryEntitlement] = await tx.select().from(discoveryEntitlements).where(and(
          eq(discoveryEntitlements.reservationId, current.id),
          eq(discoveryEntitlements.status, "BOOKED"),
        ));
        if (discoveryEntitlement && !consumes) {
          const [pass] = await tx.select().from(discoveryPasses).where(eq(discoveryPasses.id, discoveryEntitlement.discoveryPassId));
          if (pass && pass.expirationTimestamp > new Date()) {
            await tx.update(discoveryEntitlements).set({
              status: "AVAILABLE",
              reservationId: null,
              cancelledAt: new Date(),
              updatedAt: new Date(),
            }).where(eq(discoveryEntitlements.id, discoveryEntitlement.id));
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
      return { reservation, promoted };
    });
  }

  async getOccurrenceReservations(occurrenceId: string): Promise<{
    confirmed: Array<ClassReservation & { minorProfile: Pick<MinorProfile, "id" | "firstName" | "lastName"> | null }>;
    waitlisted: Array<ClassReservation & { minorProfile: Pick<MinorProfile, "id" | "firstName" | "lastName"> | null }>;
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
        inArray(classReservations.status, ["confirmed", "waitlisted"]),
      ))
      .orderBy(asc(classReservations.waitlistPosition), asc(classReservations.createdAt));
    const reservations = rows.map(({ reservation, minorProfile }) => ({
      ...reservation,
      minorProfile: minorProfile?.id ? minorProfile : null,
    }));
    return {
      confirmed: reservations.filter((reservation) => reservation.status === "confirmed"),
      waitlisted: reservations.filter((reservation) => reservation.status === "waitlisted"),
    };
  }

  async cancelOccurrenceReservations(occurrenceId: string, reason: string): Promise<ClassReservation[]> {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select id from class_occurrences where id = ${occurrenceId} for update`);
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
      const [existing] = await db.select().from(webhookEvents).where(eq(webhookEvents.id, id));
       if (!existing || !canRetryWebhook(existing.status, existing.lockedUntil, now)) return false;
      await db.update(webhookEvents).set({
        status: "processing",
        attempts: existing.attempts + 1,
        processingStartedAt: now,
        lockedUntil: retryUntil,
        lastError: null,
      }).where(eq(webhookEvents.id, id));
      return true;
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

  async getTrialLeads(program?: string): Promise<import("@shared/schema").TrialLead[]> {
    const { trialLeads } = await import("@shared/schema");
    return db.select().from(trialLeads)
      .where(and(
        program ? eq(trialLeads.program, program) : undefined,
        not(ilike(trialLeads.email, INTERNAL_TEST_EMAIL_PATTERN)),
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

  async getCampaignReport(filters: {
    funnel: "training" | "adaptive_capacity";
    source?: string;
    medium?: string;
    campaign?: string;
    landingPath?: string;
  }) {
    const { analyticsEvents, trialLeads } = await import("@shared/schema");
    const events = await db.select().from(analyticsEvents).where(eq(analyticsEvents.funnel, filters.funnel));
    const leads = await db.select().from(trialLeads).where(and(
      filters.funnel === "adaptive_capacity"
        ? eq(trialLeads.program, "adaptive-capacity")
        : sql`${trialLeads.program} <> 'adaptive-capacity'`,
      not(ilike(trialLeads.email, INTERNAL_TEST_EMAIL_PATTERN)),
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
    type Row = { source: string; medium: string; campaign: string; landingPath: string; pageViews: number; funnelSteps: number; formStarts: number; submissions: number; successfulLeads: number; totalLeads: number; consentedSessions: Set<string> };
    const rows = new Map<string, Row>();
    const getRow = (obj: unknown) => {
      const row = { source: value(obj, "utm_source"), medium: value(obj, "utm_medium"), campaign: value(obj, "utm_campaign"), landingPath: value(obj, "landing_path") };
      const key = JSON.stringify(row);
      if (!rows.has(key)) rows.set(key, { ...row, pageViews: 0, funnelSteps: 0, formStarts: 0, submissions: 0, successfulLeads: 0, totalLeads: 0, consentedSessions: new Set() });
      return rows.get(key)!;
    };
    for (const event of events) {
      if (!matches(event.properties)) continue;
      const row = getRow(event.properties);
      if (event.event === "page_view") row.pageViews++;
      if (event.event === "funnel_step") row.funnelSteps++;
      if (event.event === "lead_form_started") row.formStarts++;
      if (event.event === "lead_form_submitted") row.submissions++;
      if (event.event === "lead_form_succeeded") row.successfulLeads++;
      row.consentedSessions.add(event.sessionId);
    }
    for (const lead of leads) {
      if (!matches(lead.attribution)) continue;
      getRow(lead.attribution).totalLeads++;
    }
    const breakdown = Array.from(rows.values()).map(({ consentedSessions, ...row }) => ({ ...row, consentedSessions: consentedSessions.size }));
    const totals = breakdown.reduce((total, row) => ({
      pageViews: total.pageViews + row.pageViews,
      funnelSteps: total.funnelSteps + row.funnelSteps,
      formStarts: total.formStarts + row.formStarts,
      submissions: total.submissions + row.submissions,
      successfulLeads: total.successfulLeads + row.successfulLeads,
      totalLeads: total.totalLeads + row.totalLeads,
      consentedSessions: total.consentedSessions + row.consentedSessions,
    }), { pageViews: 0, funnelSteps: 0, formStarts: 0, submissions: 0, successfulLeads: 0, totalLeads: 0, consentedSessions: 0 });
    return { funnel: filters.funnel, filters: Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), totals, breakdown };
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
