import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("member"),
  beltRank: text("belt_rank"),
  attendanceCount: integer("attendance_count").notNull().default(0),
  assignedCoachId: varchar("assigned_coach_id"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const forms = pgTable("forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  fields: jsonb("fields").notNull(),
  isRequired: boolean("is_required").notNull().default(true),
  retakeable: boolean("retakeable").notNull().default(false),
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
});

export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memberships = pgTable("memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull().default("per_session"),
  status: text("status").notNull().default("active"),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  priceCents: integer("price_cents").notNull().default(2000),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

export const insertSessionNoteSchema = createInsertSchema(sessionNotes).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
  event: z.enum(["page_view", "cta_click", "funnel_step", "lead_form_started", "lead_form_submitted", "lead_form_succeeded", "lead_form_failed"]),
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
