import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  locale: text("locale").notNull().default("en"),
  role: text("role").notNull().default("member"),
  beltRank: text("belt_rank"),
  attendanceCount: integer("attendance_count").notNull().default(0),
  assignedCoachId: varchar("assigned_coach_id"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIndex: index("password_reset_tokens_user_idx").on(table.userId),
  expiryIndex: index("password_reset_tokens_expiry_idx").on(table.expiresAt),
}));

export const forms = pgTable("forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  fields: jsonb("fields").notNull(),
  isRequired: boolean("is_required").notNull().default(true),
  retakeable: boolean("retakeable").notNull().default(false),
  requiredBeforeBooking: boolean("required_before_booking").notNull().default(false),
  requiredBeforeAttendance: boolean("required_before_attendance").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const formResponses = pgTable("form_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  formId: varchar("form_id").notNull().references(() => forms.id),
  answers: jsonb("answers").notNull().default(sql`'{}'::jsonb`),
  status: text("status").notNull().default("not_started"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const trainers = pgTable("trainers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  bio: text("bio").notNull(),
  photoUrl: text("photo_url").notNull(),
  specialties: text("specialties").array().notNull().default(sql`ARRAY[]::text[]`),
  beltRank: text("belt_rank").notNull(),
  availability: jsonb("availability").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  notes: text("notes"),
  sessionType: text("session_type").notNull(),
  start: timestamp("start").notNull(),
  end: timestamp("end").notNull(),
  trainerId: varchar("trainer_id").notNull().references(() => trainers.id),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  stripeSessionId: text("stripe_session_id"),
  calendlyEventId: text("calendly_event_id"),
  paymentStatus: text("payment_status"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  calendlyEventUnique: uniqueIndex("bookings_calendly_event_id_unique").on(table.calendlyEventId),
}));

export const webhookEvents = pgTable("webhook_events", {
  id: varchar("id").primaryKey(),
  provider: text("provider").notNull(),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  status: text("status").notNull().default("received"),
  attempts: integer("attempts").notNull().default(0),
  processingStartedAt: timestamp("processing_started_at"),
  lockedUntil: timestamp("locked_until"),
  processedAt: timestamp("processed_at"),
  lastError: text("last_error"),
});

export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const membershipPlans = pgTable("membership_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  internalKey: text("internal_key").notNull().unique(),
  displayName: text("display_name").notNull(),
  active: boolean("active").notNull().default(true),
  weeklySessionLimit: integer("weekly_session_limit"),
  eligibleClassCategories: jsonb("eligible_class_categories").notNull().default(sql`'["skill","strength"]'::jsonb`),
  bookingWindowHours: integer("booking_window_hours").notNull().default(168),
  weekStartDay: integer("week_start_day").notNull().default(1),
  timezone: text("timezone").notNull().default("America/Los_Angeles"),
  rolloverPolicy: text("rollover_policy").notNull().default("none"),
  waitlistAllowed: boolean("waitlist_allowed").notNull().default(true),
  cancellationCutoffHours: integer("cancellation_cutoff_hours").notNull().default(4),
  lateCancelPolicy: text("late_cancel_policy").notNull().default("consume"),
  noShowPolicy: text("no_show_policy").notNull().default("consume"),
  discoveryEligible: boolean("discovery_eligible").notNull().default(false),
  privateSessionsPerMonth: integer("private_sessions_per_month").notNull().default(0),
  personalizedProgram: boolean("personalized_program").notNull().default(false),
  displayPriceCents: integer("display_price_cents"),
  effectiveStart: timestamp("effective_start"),
  effectiveEnd: timestamp("effective_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const memberships = pgTable("memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  planId: varchar("plan_id").references(() => membershipPlans.id),
  type: text("type").notNull().default("per_session"),
  status: text("status").notNull().default("active"),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  priceCents: integer("price_cents").notNull().default(2000),
  assignedBy: varchar("assigned_by").references(() => users.id),
  source: text("source"),
  pausedAt: timestamp("paused_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const memberLifecycles = pgTable("member_lifecycles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  currentState: text("current_state").notNull().default("PROSPECT"),
  source: text("source"),
  convertedAt: timestamp("converted_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userUnique: uniqueIndex("member_lifecycles_user_unique").on(table.userId),
}));

export const memberLifecycleEvents = pgTable("member_lifecycle_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  actorId: varchar("actor_id").references(() => users.id),
  previousState: text("previous_state"),
  nextState: text("next_state").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIndex: index("member_lifecycle_events_user_idx").on(table.userId),
}));

export const memberGoals = pgTable("member_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  goal: text("goal").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userGoalUnique: uniqueIndex("member_goals_user_goal_unique").on(table.userId, table.goal),
}));

export const emergencyContacts = pgTable("emergency_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  relationship: text("relationship").notNull(),
  phone: text("phone").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userUnique: uniqueIndex("emergency_contacts_user_unique").on(table.userId),
}));

export const discoveryPasses = pgTable("discovery_passes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  claimTimestamp: timestamp("claim_timestamp").defaultNow().notNull(),
  activationTimestamp: timestamp("activation_timestamp"),
  expirationTimestamp: timestamp("expiration_timestamp").notNull(),
  status: text("status").notNull().default("CLAIMED"),
  convertedAt: timestamp("converted_at"),
  followUpState: text("follow_up_state"),
  duplicateCheck: jsonb("duplicate_check").notNull().default({}),
  adminOverrideReason: text("admin_override_reason"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIndex: index("discovery_passes_user_idx").on(table.userId),
  activePassUnique: uniqueIndex("discovery_passes_active_user_unique").on(table.userId, table.status),
}));

export const discoveryEntitlements = pgTable("discovery_entitlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  discoveryPassId: varchar("discovery_pass_id").notNull().references(() => discoveryPasses.id),
  category: text("category").notNull(),
  status: text("status").notNull().default("AVAILABLE"),
  reservationId: varchar("reservation_id").references(() => classReservations.id),
  bookedAt: timestamp("booked_at"),
  attendedAt: timestamp("attended_at"),
  cancelledAt: timestamp("cancelled_at"),
  expiredAt: timestamp("expired_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  passCategoryUnique: uniqueIndex("discovery_entitlements_pass_category_unique").on(table.discoveryPassId, table.category),
}));

export const entitlementLedger = pgTable("entitlement_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  membershipId: varchar("membership_id").references(() => memberships.id),
  occurrenceId: varchar("occurrence_id").references(() => classOccurrences.id),
  reservationId: varchar("reservation_id").references(() => classReservations.id),
  weekStart: timestamp("week_start").notNull(),
  reserved: integer("reserved").notNull().default(0),
  consumed: integer("consumed").notNull().default(0),
  released: integer("released").notNull().default(0),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userWeekIndex: index("entitlement_ledger_user_week_idx").on(table.userId, table.weekStart),
}));

export const memberAuditEvents = pgTable("member_audit_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id").references(() => users.id),
  userId: varchar("user_id").references(() => users.id),
  targetType: text("target_type").notNull(),
  targetId: varchar("target_id"),
  action: text("action").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIndex: index("member_audit_events_user_idx").on(table.userId),
}));

export const sessionNotes = pgTable("session_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  coachId: varchar("coach_id").notNull().references(() => users.id),
  notes: text("notes").notNull(),
  sessionDate: timestamp("session_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  bookings: many(bookings),
  formResponses: many(formResponses),
  memberships: many(memberships),
  sessionNotes: many(sessionNotes, { relationName: "userNotes" }),
  coachNotes: many(sessionNotes, { relationName: "coachNotes" }),
}));

export const formsRelations = relations(forms, ({ many }) => ({
  responses: many(formResponses),
}));

export const formResponsesRelations = relations(formResponses, ({ one }) => ({
  user: one(users, {
    fields: [formResponses.userId],
    references: [users.id],
  }),
  form: one(forms, {
    fields: [formResponses.formId],
    references: [forms.id],
  }),
}));

export const trainersRelations = relations(trainers, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  trainer: one(trainers, {
    fields: [bookings.trainerId],
    references: [trainers.id],
  }),
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  plan: one(membershipPlans, {
    fields: [memberships.planId],
    references: [membershipPlans.id],
  }),
}));

export const sessionNotesRelations = relations(sessionNotes, ({ one }) => ({
  user: one(users, {
    fields: [sessionNotes.userId],
    references: [users.id],
    relationName: "userNotes",
  }),
  coach: one(users, {
    fields: [sessionNotes.coachId],
    references: [users.id],
    relationName: "coachNotes",
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export const insertFormSchema = createInsertSchema(forms).omit({
  id: true,
  createdAt: true,
});

export const insertFormResponseSchema = createInsertSchema(formResponses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrainerSchema = createInsertSchema(trainers).omit({
  id: true,
  createdAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
});

export const insertMembershipSchema = createInsertSchema(memberships).omit({
  id: true,
  createdAt: true,
});

export const insertMembershipPlanSchema = createInsertSchema(membershipPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMemberLifecycleSchema = createInsertSchema(memberLifecycles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMemberLifecycleEventSchema = createInsertSchema(memberLifecycleEvents).omit({
  id: true,
  createdAt: true,
});

export const insertMemberGoalSchema = createInsertSchema(memberGoals).omit({
  id: true,
  createdAt: true,
});

export const insertEmergencyContactSchema = createInsertSchema(emergencyContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDiscoveryPassSchema = createInsertSchema(discoveryPasses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDiscoveryEntitlementSchema = createInsertSchema(discoveryEntitlements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEntitlementLedgerSchema = createInsertSchema(entitlementLedger).omit({
  id: true,
  createdAt: true,
});

export const insertMemberAuditEventSchema = createInsertSchema(memberAuditEvents).omit({
  id: true,
  createdAt: true,
});

export const insertSessionNoteSchema = createInsertSchema(sessionNotes).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export type InsertForm = z.infer<typeof insertFormSchema>;
export type Form = typeof forms.$inferSelect;

export type InsertFormResponse = z.infer<typeof insertFormResponseSchema>;
export type FormResponse = typeof formResponses.$inferSelect;

export type InsertTrainer = z.infer<typeof insertTrainerSchema>;
export type Trainer = typeof trainers.$inferSelect;

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

export type InsertMembership = z.infer<typeof insertMembershipSchema>;
export type Membership = typeof memberships.$inferSelect;

export type InsertMembershipPlan = z.infer<typeof insertMembershipPlanSchema>;
export type MembershipPlan = typeof membershipPlans.$inferSelect;

export type InsertMemberLifecycle = z.infer<typeof insertMemberLifecycleSchema>;
export type MemberLifecycle = typeof memberLifecycles.$inferSelect;

export type InsertMemberLifecycleEvent = z.infer<typeof insertMemberLifecycleEventSchema>;
export type MemberLifecycleEvent = typeof memberLifecycleEvents.$inferSelect;

export type InsertMemberGoal = z.infer<typeof insertMemberGoalSchema>;
export type MemberGoal = typeof memberGoals.$inferSelect;

export type InsertEmergencyContact = z.infer<typeof insertEmergencyContactSchema>;
export type EmergencyContact = typeof emergencyContacts.$inferSelect;

export type InsertDiscoveryPass = z.infer<typeof insertDiscoveryPassSchema>;
export type DiscoveryPass = typeof discoveryPasses.$inferSelect;

export type InsertDiscoveryEntitlement = z.infer<typeof insertDiscoveryEntitlementSchema>;
export type DiscoveryEntitlement = typeof discoveryEntitlements.$inferSelect;

export type InsertEntitlementLedger = z.infer<typeof insertEntitlementLedgerSchema>;
export type EntitlementLedger = typeof entitlementLedger.$inferSelect;

export type InsertMemberAuditEvent = z.infer<typeof insertMemberAuditEventSchema>;
export type MemberAuditEvent = typeof memberAuditEvents.$inferSelect;

export type InsertSessionNote = z.infer<typeof insertSessionNoteSchema>;
export type SessionNote = typeof sessionNotes.$inferSelect;

export type BookingWithTrainer = Booking & {
  trainer: Trainer;
};

export type FormResponseWithForm = FormResponse & {
  form: Form;
};

export type SafeUser = Omit<User, 'passwordHash'>;

export const trialLeads = pgTable("trial_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  program: text("program").notNull(),
  classId: text("class_id"),
  classTitle: text("class_title"),
  classDay: text("class_day"),
  classTime: text("class_time"),
  experience: text("experience").notNull().default("none"),
  childName: text("child_name"),
  childAge: text("child_age"),
  occupation: text("occupation"),
  workLifeChange: text("work_life_change"),
  capabilityGoal: text("capability_goal"),
  aiComfort: text("ai_comfort"),
  cohortTiming: text("cohort_timing"),
  company: text("company"),
  source: text("source"),
  attribution: jsonb("attribution"),
  consentedAt: timestamp("consented_at"),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTrialLeadSchema = createInsertSchema(trialLeads).omit({
  id: true,
  status: true,
  createdAt: true,
}).extend({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(30),
  program: z.string().trim().min(1).max(80),
  classId: z.string().trim().max(120).nullable().optional(),
  classTitle: z.string().trim().max(160).nullable().optional(),
  classDay: z.string().trim().max(40).nullable().optional(),
  classTime: z.string().trim().max(80).nullable().optional(),
  experience: z.string().trim().max(40).default("none"),
  childName: z.string().trim().max(80).nullable().optional(),
  childAge: z.string().trim().max(10).nullable().optional(),
  occupation: z.string().trim().max(120).nullable().optional(),
  workLifeChange: z.string().trim().max(1200).nullable().optional(),
  capabilityGoal: z.string().trim().max(1200).nullable().optional(),
  aiComfort: z.string().trim().max(80).nullable().optional(),
  cohortTiming: z.string().trim().max(120).nullable().optional(),
  company: z.string().trim().max(160).nullable().optional(),
  source: z.string().trim().max(120).nullable().optional(),
  attribution: z.record(z.string().max(200)).nullable().optional(),
  consentedAt: z.coerce.date().nullable().optional(),
});

export type InsertTrialLead = z.infer<typeof insertTrialLeadSchema>;
export type TrialLead = typeof trialLeads.$inferSelect;
export const leadStatuses = ["new", "contacted", "qualified", "archived"] as const;
export type LeadStatus = typeof leadStatuses[number];

export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  event: text("event").notNull(),
  funnel: text("funnel").notNull(),
  sessionId: text("session_id").notNull(),
  path: text("path").notNull(),
  properties: jsonb("properties").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({ id: true, createdAt: true }).extend({
  event: z.enum(["page_view", "cta_click", "funnel_step", "lead_form_started", "lead_form_submitted", "lead_form_succeeded", "lead_form_failed", "reservation_succeeded", "reservation_failed"]),
  funnel: z.enum(["training", "adaptive_capacity"]),
  sessionId: z.string().trim().min(1).max(100),
  path: z.string().trim().max(300),
  properties: z.record(z.unknown()).default({}),
});
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

export const contactSubmissions = pgTable("contact_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  source: text("source"),
  consentedAt: timestamp("consented_at"),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContactSubmissionSchema = createInsertSchema(contactSubmissions).omit({
  id: true, status: true, createdAt: true,
}).extend({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30).nullable().optional(),
  subject: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(4000),
  source: z.string().trim().max(120).nullable().optional(),
  consentedAt: z.coerce.date().nullable().optional(),
});

export type InsertContactSubmission = z.infer<typeof insertContactSubmissionSchema>;
export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export const contactStatuses = ["new", "acknowledged", "resolved", "archived"] as const;
export type ContactStatus = typeof contactStatuses[number];

export const staffNotifications = pgTable("staff_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  href: text("href").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type StaffNotification = typeof staffNotifications.$inferSelect;

// Google Calendar is the schedule source; these tables are the Ground Up
// reservation boundary. Existing `bookings` remains for legacy/private sessions.
export const calendarConnections = pgTable("calendar_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull().default("google"),
  calendarId: text("calendar_id"),
  calendarName: text("calendar_name"),
  timezone: text("timezone").notNull().default("America/Los_Angeles"),
  status: text("status").notNull().default("not_configured"),
  lastAttemptedAt: timestamp("last_attempted_at"),
  lastSuccessfulAt: timestamp("last_successful_at"),
  lastSyncedEventCount: integer("last_synced_event_count").notNull().default(0),
  lastError: text("last_error"),
  syncToken: text("sync_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  providerUnique: uniqueIndex("calendar_connections_provider_unique").on(table.provider),
}));

export const classTypes = pgTable("class_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("jiu-jitsu"),
  matchPattern: text("match_pattern"),
  defaultCapacity: integer("default_capacity").notNull().default(6),
  beginnerFriendly: boolean("beginner_friendly").notNull().default(false),
  firstVisitEligible: boolean("first_visit_eligible").notNull().default(false),
  defaultTrainerId: varchar("default_trainer_id").references(() => trainers.id),
  membershipRequired: boolean("membership_required").notNull().default(false),
  active: boolean("active").notNull().default(true),
  bookingEnabled: boolean("booking_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameUnique: uniqueIndex("class_types_name_unique").on(table.name),
}));

export const classOccurrences = pgTable("class_occurrences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  calendarConnectionId: varchar("calendar_connection_id").notNull().references(() => calendarConnections.id),
  googleCalendarId: text("google_calendar_id").notNull(),
  googleEventId: text("google_event_id").notNull(),
  googleRecurringEventId: text("google_recurring_event_id"),
  googleOriginalStartTime: timestamp("google_original_start_time"),
  title: text("title").notNull(),
  description: text("description"),
  start: timestamp("start").notNull(),
  end: timestamp("end").notNull(),
  location: text("location"),
  instructorName: text("instructor_name"),
  trainerId: varchar("trainer_id").references(() => trainers.id),
  classTypeId: varchar("class_type_id").references(() => classTypes.id),
  status: text("status").notNull().default("active"),
  syncState: text("sync_state").notNull().default("unmapped"),
  syncError: text("sync_error"),
  capacity: integer("capacity").notNull().default(6),
  firstVisitEligible: boolean("first_visit_eligible").notNull().default(false),
  bookingEnabled: boolean("booking_enabled").notNull().default(false),
  audience: text("audience").notNull().default("members"),
  remoteUpdatedAt: timestamp("remote_updated_at"),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  googleEventUnique: uniqueIndex("class_occurrences_google_event_unique").on(table.googleCalendarId, table.googleEventId),
  startIndex: index("class_occurrences_start_idx").on(table.start),
  statusIndex: index("class_occurrences_status_idx").on(table.status),
}));

export const classReservations = pgTable("class_reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  occurrenceId: varchar("occurrence_id").notNull().references(() => classOccurrences.id),
  userId: varchar("user_id").references(() => users.id),
  visitorFirstName: text("visitor_first_name"),
  visitorLastName: text("visitor_last_name"),
  visitorEmail: text("visitor_email"),
  visitorPhone: text("visitor_phone"),
  locale: text("locale").notNull().default("en"),
  experience: text("experience"),
  status: text("status").notNull().default("confirmed"),
  waitlistPosition: integer("waitlist_position"),
  attendance: text("attendance"),
  attendanceRecordedAt: timestamp("attendance_recorded_at"),
  attendanceRecordedBy: varchar("attendance_recorded_by").references(() => users.id),
  attendanceUpdatedAt: timestamp("attendance_updated_at"),
  cancellationReason: text("cancellation_reason"),
  manageTokenHash: text("manage_token_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  cancelledAt: timestamp("cancelled_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  occurrenceIndex: index("class_reservations_occurrence_idx").on(table.occurrenceId),
  userIndex: index("class_reservations_user_idx").on(table.userId),
  visitorEmailIndex: index("class_reservations_visitor_email_idx").on(table.visitorEmail),
}));

export const classReservationEvents = pgTable("class_reservation_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reservationId: varchar("reservation_id").references(() => classReservations.id),
  occurrenceId: varchar("occurrence_id").references(() => classOccurrences.id),
  event: text("event").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  reservationIndex: index("class_reservation_events_reservation_idx").on(table.reservationId),
}));

export const insertCalendarConnectionSchema = createInsertSchema(calendarConnections).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClassTypeSchema = createInsertSchema(classTypes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClassOccurrenceSchema = createInsertSchema(classOccurrences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClassReservationSchema = createInsertSchema(classReservations).omit({ id: true, createdAt: true, updatedAt: true });

export type CalendarConnection = typeof calendarConnections.$inferSelect;
export type ClassType = typeof classTypes.$inferSelect;
export type ClassOccurrence = typeof classOccurrences.$inferSelect;
export type ClassReservation = typeof classReservations.$inferSelect;
export type ClassReservationEvent = typeof classReservationEvents.$inferSelect;
export type InsertCalendarConnection = z.infer<typeof insertCalendarConnectionSchema>;
export type InsertClassType = z.infer<typeof insertClassTypeSchema>;
export type InsertClassOccurrence = z.infer<typeof insertClassOccurrenceSchema>;
export type InsertClassReservation = z.infer<typeof insertClassReservationSchema>;
