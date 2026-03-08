import { 
  trainers, 
  bookings, 
  adminUsers,
  users,
  forms,
  formResponses,
  memberships,
  sessionNotes,
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
  type SessionNote,
  type InsertSessionNote
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql, count, sum, or, ilike } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export interface IStorage {
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(email: string, password: string, firstName: string, lastName: string, phone?: string): Promise<SafeUser>;
  createUserFromWebhook(email: string, firstName: string, lastName: string): Promise<SafeUser>;
  validateUserPassword(email: string, password: string): Promise<SafeUser | null>;
  updateUser(id: string, updates: Partial<Pick<User, 'firstName' | 'lastName' | 'phone' | 'role' | 'beltRank' | 'attendanceCount' | 'assignedCoachId' | 'adminNotes'>>): Promise<SafeUser | undefined>;
  
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
  
  getBookings(filters?: { trainerId?: string; status?: string; startDate?: Date; endDate?: Date }): Promise<BookingWithTrainer[]>;
  getBooking(id: string): Promise<BookingWithTrainer | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: string, status: string, stripeSessionId?: string): Promise<Booking | undefined>;
  cancelBooking(id: string): Promise<Booking | undefined>;
  getTrainerBookings(trainerId: string, startDate: Date, endDate: Date): Promise<Booking[]>;
  
  getAllUsers(search?: string, page?: number, limit?: number): Promise<{ users: SafeUser[]; total: number }>;
  getUserProfile(userId: string): Promise<{ user: SafeUser; formResponses: (FormResponse & { form: Form })[]; bookings: BookingWithTrainer[]; memberships: Membership[]; sessionNotes: (SessionNote & { coach: SafeUser })[] } | undefined>;
  updateAdminNotes(userId: string, notes: string): Promise<SafeUser | undefined>;
  
  getAdminStats(): Promise<{ totalUsers: number; newUsers30Days: number; activeMemberships: number; upcomingSessions7Days: number; monthlyRevenue: number }>;
  
  getMemberships(userId: string): Promise<Membership[]>;
  createMembership(membership: InsertMembership): Promise<Membership>;
  updateMembership(id: string, updates: Partial<Pick<Membership, 'status' | 'endDate'>>): Promise<Membership | undefined>;
  
  getSessionNotes(userId: string): Promise<(SessionNote & { coach: SafeUser })[]>;
  createSessionNote(note: InsertSessionNote): Promise<SessionNote>;
  
  getCoachMembers(coachId: string): Promise<SafeUser[]>;
  
  createCalendlyBooking(data: { eventId: string; email: string; eventType: string; startTime: Date; paymentStatus: string; amount: number }): Promise<Booking>;
  
  getAdminUser(email: string): Promise<AdminUser | undefined>;
  createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser>;
}

export class DatabaseStorage implements IStorage {
  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async createUser(email: string, password: string, firstName: string, lastName: string, phone?: string): Promise<SafeUser> {
    const passwordHash = await bcrypt.hash(password, 10);
    const [newUser] = await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      phone: phone || null,
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

  async updateUser(id: string, updates: Partial<Pick<User, 'firstName' | 'lastName' | 'phone' | 'role' | 'beltRank' | 'attendanceCount' | 'assignedCoachId' | 'adminNotes'>>): Promise<SafeUser | undefined> {
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
    
    const [updated] = await db
      .update(formResponses)
      .set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() })
      .where(eq(formResponses.id, existing.id))
      .returning();
    return updated;
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

  async getBookings(filters?: { trainerId?: string; status?: string; startDate?: Date; endDate?: Date }): Promise<BookingWithTrainer[]> {
    const result = await db
      .select()
      .from(bookings)
      .leftJoin(trainers, eq(bookings.trainerId, trainers.id))
      .orderBy(desc(bookings.start));
    
    return result.map(row => ({
      ...row.bookings,
      trainer: row.trainers!
    }));
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

  async cancelBooking(id: string): Promise<Booking | undefined> {
    const [updated] = await db
      .update(bookings)
      .set({ status: "canceled" })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
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

  async getAllUsers(search?: string, page: number = 1, limit: number = 20): Promise<{ users: SafeUser[]; total: number }> {
    const offset = (page - 1) * limit;
    
    let whereClause;
    if (search) {
      const searchTerm = `%${search}%`;
      whereClause = or(
        ilike(users.firstName, searchTerm),
        ilike(users.lastName, searchTerm),
        ilike(users.email, searchTerm),
        ilike(users.phone, searchTerm)
      );
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

  async getUserProfile(userId: string): Promise<{ user: SafeUser; formResponses: (FormResponse & { form: Form })[]; bookings: BookingWithTrainer[]; memberships: Membership[]; sessionNotes: (SessionNote & { coach: SafeUser })[] } | undefined> {
    const user = await this.getUserById(userId);
    if (!user) return undefined;
    const { passwordHash: _, ...safeUser } = user;
    const userFormResponses = await this.getUserFormResponses(userId);
    const userBookings = await this.getUserBookings(userId);
    const userMemberships = await this.getMemberships(userId);
    const userSessionNotes = await this.getSessionNotes(userId);
    return { user: safeUser, formResponses: userFormResponses, bookings: userBookings, memberships: userMemberships, sessionNotes: userSessionNotes };
  }

  async updateAdminNotes(userId: string, notes: string): Promise<SafeUser | undefined> {
    return this.updateUser(userId, { adminNotes: notes });
  }

  async getAdminStats(): Promise<{ totalUsers: number; newUsers30Days: number; activeMemberships: number; upcomingSessions7Days: number; monthlyRevenue: number }> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const [totalUsersResult] = await db.select({ count: count() }).from(users);
    
    const [newUsersResult] = await db.select({ count: count() }).from(users).where(gte(users.createdAt, thirtyDaysAgo));
    
    const [activeMembershipsResult] = await db.select({ count: count() }).from(memberships).where(eq(memberships.status, "active"));
    
    const [upcomingSessionsResult] = await db.select({ count: count() }).from(bookings).where(
      and(gte(bookings.start, now), lte(bookings.start, sevenDaysFromNow), eq(bookings.status, "paid"))
    );
    
    const [revenueResult] = await db
      .select({ total: sum(bookings.amountCents) })
      .from(bookings)
      .where(and(
        gte(bookings.createdAt, startOfMonth),
        eq(bookings.status, "paid")
      ));
    
    return {
      totalUsers: totalUsersResult.count,
      newUsers30Days: newUsersResult.count,
      activeMemberships: activeMembershipsResult.count,
      upcomingSessions7Days: upcomingSessionsResult.count,
      monthlyRevenue: Number(revenueResult.total || 0)
    };
  }

  async getMemberships(userId: string): Promise<Membership[]> {
    return await db.select().from(memberships).where(eq(memberships.userId, userId)).orderBy(desc(memberships.createdAt));
  }

  async createMembership(membership: InsertMembership): Promise<Membership> {
    const [newMembership] = await db.insert(memberships).values(membership).returning();
    return newMembership;
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
    let user = await this.getUserByEmail(data.email);
    if (!user) {
      await this.createUserFromWebhook(data.email, "New", "Member");
      user = await this.getUserByEmail(data.email);
    }

    const allTrainers = await this.getTrainers();
    const defaultTrainer = allTrainers[0];
    if (!defaultTrainer) throw new Error("No trainers available");

    const endTime = new Date(data.startTime.getTime() + 60 * 60 * 1000);

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
  }

  async getAdminUser(email: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return admin;
  }

  async createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser> {
    const [newAdmin] = await db.insert(adminUsers).values(adminUser).returning();
    return newAdmin;
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
      fields: [
        { name: "mediaConsent", label: "Do you allow Ground Up Jiu-Jitsu to use photos and videos of you for marketing, social media, and promotional purposes?", type: "boolean", required: true }
      ]
    },
    {
      slug: "gym-rules",
      title: "Gym Rules Agreement",
      description: "Acknowledgment of gym policies and code of conduct",
      isRequired: true,
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
    }
  }
}

seedTrainerData().catch(console.error);
seedFormData().catch(console.error);
