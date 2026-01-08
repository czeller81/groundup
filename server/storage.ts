import { 
  trainers, 
  bookings, 
  adminUsers,
  users,
  forms,
  formResponses,
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
  type FormResponseWithForm
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Users (Portal Authentication)
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(email: string, password: string, firstName: string, lastName: string, phone?: string): Promise<SafeUser>;
  validateUserPassword(email: string, password: string): Promise<SafeUser | null>;
  updateUser(id: string, updates: Partial<Pick<User, 'firstName' | 'lastName' | 'phone'>>): Promise<SafeUser | undefined>;
  
  // Forms
  getForms(): Promise<Form[]>;
  getForm(id: string): Promise<Form | undefined>;
  getFormBySlug(slug: string): Promise<Form | undefined>;
  createForm(form: InsertForm): Promise<Form>;
  
  // Form Responses
  getUserFormResponses(userId: string): Promise<FormResponseWithForm[]>;
  getFormResponse(userId: string, formId: string): Promise<FormResponse | undefined>;
  saveFormResponse(userId: string, formId: string, answers: any, status: string): Promise<FormResponse>;
  submitFormResponse(userId: string, formId: string): Promise<FormResponse | undefined>;
  getAllFormResponses(): Promise<(FormResponse & { user: SafeUser; form: Form })[]>;
  
  // User Bookings
  getUserBookings(userId: string): Promise<BookingWithTrainer[]>;
  createUserBooking(userId: string, booking: Omit<InsertBooking, 'userId'>): Promise<Booking>;
  cancelUserBooking(userId: string, bookingId: string): Promise<Booking | undefined>;
  
  // Trainers
  getTrainers(): Promise<Trainer[]>;
  getTrainer(id: string): Promise<Trainer | undefined>;
  createTrainer(trainer: InsertTrainer): Promise<Trainer>;
  updateTrainerAvailability(id: string, availability: any): Promise<Trainer | undefined>;
  
  // Bookings
  getBookings(filters?: { trainerId?: string; status?: string; startDate?: Date; endDate?: Date }): Promise<BookingWithTrainer[]>;
  getBooking(id: string): Promise<BookingWithTrainer | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: string, status: string, stripeSessionId?: string): Promise<Booking | undefined>;
  cancelBooking(id: string): Promise<Booking | undefined>;
  getTrainerBookings(trainerId: string, startDate: Date, endDate: Date): Promise<Booking[]>;
  
  // Admin Users
  getAdminUser(email: string): Promise<AdminUser | undefined>;
  createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser>;
}

export class DatabaseStorage implements IStorage {
  // Users
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
      role: "user"
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

  async updateUser(id: string, updates: Partial<Pick<User, 'firstName' | 'lastName' | 'phone'>>): Promise<SafeUser | undefined> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (!updated) return undefined;
    const { passwordHash: _, ...safeUser } = updated;
    return safeUser;
  }

  // Forms
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

  // Form Responses
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

  // User Bookings
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
    
    // Check 12-hour cancellation policy
    const now = new Date();
    const hoursUntilStart = (booking.start.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilStart < 12) {
      throw new Error("Cannot cancel booking less than 12 hours before start time");
    }
    
    const [updated] = await db
      .update(bookings)
      .set({ status: "canceled" })
      .where(eq(bookings.id, bookingId))
      .returning();
    return updated;
  }

  // Trainers
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

  // Bookings
  async getBookings(filters?: { trainerId?: string; status?: string; startDate?: Date; endDate?: Date }): Promise<BookingWithTrainer[]> {
    let query = db
      .select()
      .from(bookings)
      .leftJoin(trainers, eq(bookings.trainerId, trainers.id))
      .orderBy(desc(bookings.start));

    // Apply filters - this is a simplified version, you'd want to build the where clause dynamically
    const result = await query;
    
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

  // Admin Users
  async getAdminUser(email: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return admin;
  }

  async createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser> {
    const [newAdmin] = await db.insert(adminUsers).values(adminUser).returning();
    return newAdmin;
  }
}

// In-memory storage for development
export class MemStorage implements IStorage {
  private trainersMap: Map<string, Trainer> = new Map();
  private bookingsMap: Map<string, Booking> = new Map();
  private adminUsersMap: Map<string, AdminUser> = new Map();
  private usersMap: Map<string, User> = new Map();
  private formsMap: Map<string, Form> = new Map();
  private formResponsesMap: Map<string, FormResponse> = new Map();

  constructor() {
    // Seed some initial data
    this.seedData();
  }

  // Users
  async getUserById(id: string): Promise<User | undefined> {
    return this.usersMap.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(u => u.email === email.toLowerCase());
  }

  async createUser(email: string, password: string, firstName: string, lastName: string, phone?: string): Promise<SafeUser> {
    const id = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser: User = {
      id,
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      phone: phone || null,
      role: "user",
      createdAt: new Date()
    };
    this.usersMap.set(id, newUser);
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

  async updateUser(id: string, updates: Partial<Pick<User, 'firstName' | 'lastName' | 'phone'>>): Promise<SafeUser | undefined> {
    const user = this.usersMap.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates };
    this.usersMap.set(id, updated);
    const { passwordHash: _, ...safeUser } = updated;
    return safeUser;
  }

  // Forms
  async getForms(): Promise<Form[]> {
    return Array.from(this.formsMap.values());
  }

  async getForm(id: string): Promise<Form | undefined> {
    return this.formsMap.get(id);
  }

  async getFormBySlug(slug: string): Promise<Form | undefined> {
    return Array.from(this.formsMap.values()).find(f => f.slug === slug);
  }

  async createForm(form: InsertForm): Promise<Form> {
    const id = randomUUID();
    const newForm: Form = { ...form, id, createdAt: new Date() } as Form;
    this.formsMap.set(id, newForm);
    return newForm;
  }

  // Form Responses
  async getUserFormResponses(userId: string): Promise<FormResponseWithForm[]> {
    const responses = Array.from(this.formResponsesMap.values()).filter(r => r.userId === userId);
    return responses.map(r => ({
      ...r,
      form: this.formsMap.get(r.formId)!
    }));
  }

  async getFormResponse(userId: string, formId: string): Promise<FormResponse | undefined> {
    return Array.from(this.formResponsesMap.values()).find(r => r.userId === userId && r.formId === formId);
  }

  async saveFormResponse(userId: string, formId: string, answers: any, status: string): Promise<FormResponse> {
    const existing = await this.getFormResponse(userId, formId);
    if (existing) {
      if (existing.status === "submitted") throw new Error("Cannot modify submitted form");
      const updated = { ...existing, answers, status, updatedAt: new Date() };
      this.formResponsesMap.set(existing.id, updated);
      return updated;
    }
    const id = randomUUID();
    const newResponse: FormResponse = {
      id, userId, formId, answers, status,
      submittedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.formResponsesMap.set(id, newResponse);
    return newResponse;
  }

  async submitFormResponse(userId: string, formId: string): Promise<FormResponse | undefined> {
    const existing = await this.getFormResponse(userId, formId);
    if (!existing) return undefined;
    const updated = { ...existing, status: "submitted", submittedAt: new Date(), updatedAt: new Date() };
    this.formResponsesMap.set(existing.id, updated);
    return updated;
  }

  async getAllFormResponses(): Promise<(FormResponse & { user: SafeUser; form: Form })[]> {
    return Array.from(this.formResponsesMap.values()).map(r => {
      const user = this.usersMap.get(r.userId)!;
      const { passwordHash: _, ...safeUser } = user;
      return { ...r, user: safeUser, form: this.formsMap.get(r.formId)! };
    });
  }

  // User Bookings
  async getUserBookings(userId: string): Promise<BookingWithTrainer[]> {
    return Array.from(this.bookingsMap.values())
      .filter(b => b.userId === userId)
      .map(b => ({ ...b, trainer: this.trainersMap.get(b.trainerId)! }));
  }

  async createUserBooking(userId: string, booking: Omit<InsertBooking, 'userId'>): Promise<Booking> {
    const id = randomUUID();
    const newBooking: Booking = {
      ...booking, id, userId,
      status: booking.status || "pending",
      stripeSessionId: booking.stripeSessionId || null,
      notes: booking.notes || null,
      currency: booking.currency || "usd",
      createdAt: new Date()
    };
    this.bookingsMap.set(id, newBooking);
    return newBooking;
  }

  async cancelUserBooking(userId: string, bookingId: string): Promise<Booking | undefined> {
    const booking = this.bookingsMap.get(bookingId);
    if (!booking || booking.userId !== userId) return undefined;
    const now = new Date();
    const hoursUntilStart = (booking.start.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilStart < 12) throw new Error("Cannot cancel booking less than 12 hours before start time");
    const updated = { ...booking, status: "canceled" };
    this.bookingsMap.set(bookingId, updated);
    return updated;
  }

  private seedData() {
    // Seed trainers
    const trainer1: Trainer = {
      id: "trainer-1",
      name: "Sofia Martinez",
      bio: "Head instructor and founder with 12+ years of teaching experience. Multiple-time World Champion specializing in women's self-defense and technical development.",
      photoUrl: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
      specialties: ["Women's Self-Defense", "Competition Training", "Fundamentals"],
      beltRank: "3rd Degree Black Belt",
      availability: {
        "Monday": ["09:00", "10:30", "12:00", "14:00", "16:00", "18:00"],
        "Tuesday": ["10:00", "12:00", "14:00", "16:00", "18:00", "20:00"],
        "Wednesday": ["09:00", "10:30", "12:00", "14:00", "16:00", "18:00"],
        "Friday": ["09:00", "10:30", "12:00", "14:00", "16:00"]
      },
      createdAt: new Date()
    };

    const trainer2: Trainer = {
      id: "trainer-2", 
      name: "Isabella Chen",
      bio: "Advanced instructor and women's empowerment advocate. Pan Am medalist specializing in technical precision, guard play, and building confidence in female athletes.",
      photoUrl: "https://images.unsplash.com/photo-1594381898411-846e7d193883?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
      specialties: ["Women's Empowerment", "Guard Play", "Technical Development"],
      beltRank: "2nd Degree Black Belt",
      availability: {
        "Monday": ["14:00", "16:00", "18:00", "20:00"],
        "Tuesday": ["14:00", "16:00", "18:00", "20:00"],
        "Thursday": ["14:00", "16:00", "18:00", "20:00"],
        "Friday": ["14:00", "16:00", "18:00"]
      },
      createdAt: new Date()
    };

    const trainer3: Trainer = {
      id: "trainer-3",
      name: "Carmen Delgado", 
      bio: "Former competitive athlete and fitness specialist. Focuses on strength training for women, conditioning, and practical self-defense applications in a supportive environment.",
      photoUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
      specialties: ["Women's Conditioning", "Self-Defense", "No-Gi"],
      beltRank: "1st Degree Brown Belt",
      availability: {
        "Monday": ["06:00", "07:30", "09:00", "10:30"],
        "Tuesday": ["06:00", "07:30", "09:00", "10:30"], 
        "Wednesday": ["06:00", "07:30", "09:00", "10:30"],
        "Thursday": ["06:00", "07:30", "09:00", "10:30"],
        "Friday": ["06:00", "07:30", "09:00"]
      },
      createdAt: new Date()
    };

    const trainer4: Trainer = {
      id: "trainer-4",
      name: "Raymi Gonzalez",
      bio: "Purple belt 3rd degree with 5 years of experience. Leads the women's only program at Gracie Barra Ventura and specializes in strength and conditioning fitness classes. Offers the best 1-on-1 for BJJ training.",
      photoUrl: "https://images.unsplash.com/photo-1594381898411-846e7d193883?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
      specialties: ["1-on-1 BJJ Training", "Strength & Conditioning", "Women's Program Leadership", "Fitness Classes"],
      beltRank: "Purple Belt 3rd Degree",
      availability: {
        "Monday": ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"],
        "Tuesday": ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"],
        "Wednesday": ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"],
        "Thursday": ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"],
        "Friday": ["08:00", "10:00", "12:00", "14:00", "16:00"],
        "Saturday": ["09:00", "11:00", "13:00", "15:00"]
      },
      createdAt: new Date()
    };

    this.trainersMap.set(trainer1.id, trainer1);
    this.trainersMap.set(trainer2.id, trainer2);
    this.trainersMap.set(trainer3.id, trainer3);
    this.trainersMap.set(trainer4.id, trainer4);

    // Seed admin user
    const admin: AdminUser = {
      id: "admin-1",
      email: "admin@groundupbjj.com",
      password: "ChangeMe123!", // In real app, this would be hashed
      createdAt: new Date()
    };
    this.adminUsersMap.set(admin.email, admin);
  }

  async getTrainers(): Promise<Trainer[]> {
    return Array.from(this.trainersMap.values());
  }

  async getTrainer(id: string): Promise<Trainer | undefined> {
    return this.trainersMap.get(id);
  }

  async createTrainer(trainer: InsertTrainer): Promise<Trainer> {
    const id = randomUUID();
    const newTrainer: Trainer = {
      ...trainer,
      id,
      specialties: trainer.specialties || [],
      createdAt: new Date()
    };
    this.trainersMap.set(id, newTrainer);
    return newTrainer;
  }

  async updateTrainerAvailability(id: string, availability: any): Promise<Trainer | undefined> {
    const trainer = this.trainersMap.get(id);
    if (!trainer) return undefined;
    
    const updated = { ...trainer, availability };
    this.trainersMap.set(id, updated);
    return updated;
  }

  async getBookings(): Promise<BookingWithTrainer[]> {
    const bookingsList = Array.from(this.bookingsMap.values());
    return bookingsList.map(booking => ({
      ...booking,
      trainer: this.trainersMap.get(booking.trainerId)!
    }));
  }

  async getBooking(id: string): Promise<BookingWithTrainer | undefined> {
    const booking = this.bookingsMap.get(id);
    if (!booking) return undefined;
    
    return {
      ...booking,
      trainer: this.trainersMap.get(booking.trainerId)!
    };
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    const newBooking: Booking = {
      ...booking,
      id,
      status: booking.status || "pending",
      stripeSessionId: booking.stripeSessionId || null,
      notes: booking.notes || null,
      currency: booking.currency || "usd",
      userId: booking.userId || null,
      createdAt: new Date()
    };
    this.bookingsMap.set(id, newBooking);
    return newBooking;
  }

  async updateBookingStatus(id: string, status: string, stripeSessionId?: string): Promise<Booking | undefined> {
    const booking = this.bookingsMap.get(id);
    if (!booking) return undefined;
    
    const updated = { 
      ...booking, 
      status,
      ...(stripeSessionId && { stripeSessionId })
    };
    this.bookingsMap.set(id, updated);
    return updated;
  }

  async cancelBooking(id: string): Promise<Booking | undefined> {
    return this.updateBookingStatus(id, "canceled");
  }

  async getTrainerBookings(trainerId: string, startDate: Date, endDate: Date): Promise<Booking[]> {
    return Array.from(this.bookingsMap.values()).filter(booking => 
      booking.trainerId === trainerId &&
      booking.start >= startDate &&
      booking.end <= endDate &&
      booking.status === "paid"
    );
  }

  async getAdminUser(email: string): Promise<AdminUser | undefined> {
    return this.adminUsersMap.get(email);
  }

  async createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser> {
    const id = randomUUID();
    const newAdmin: AdminUser = {
      ...adminUser,
      id,
      createdAt: new Date()
    };
    this.adminUsersMap.set(adminUser.email, newAdmin);
    return newAdmin;
  }
}

// Always use DatabaseStorage for permanent data
export const storage = new DatabaseStorage();

// Seed forms if they don't exist
async function seedFormsData() {
  const existingForms = await storage.getForms();
  if (existingForms.length === 0) {
    // Personal Training Intake Form
    await storage.createForm({
      slug: "personal-training-intake",
      title: "Personal Training Intake Form",
      description: "Please complete this form before your first session",
      isRequired: true,
      fields: [
        { id: "fullName", type: "text", label: "Full Name", required: true },
        { id: "dateOfBirth", type: "date", label: "Date of Birth", required: true },
        { id: "address", type: "text", label: "Address", required: true },
        { id: "emergencyContact", type: "text", label: "Emergency Contact Name", required: true },
        { id: "emergencyPhone", type: "text", label: "Emergency Contact Phone", required: true },
        { id: "bjjExperience", type: "select", label: "BJJ Experience Level", options: ["Complete Beginner", "Less than 6 months", "6 months - 2 years", "2+ years"], required: true },
        { id: "currentBelt", type: "select", label: "Current Belt (if applicable)", options: ["White", "Blue", "Purple", "Brown", "Black", "No Belt"], required: false },
        { id: "otherMartialArts", type: "textarea", label: "Other Martial Arts Experience", required: false }
      ]
    });

    // Health & PAR-Q Form
    await storage.createForm({
      slug: "health-parq",
      title: "Health & Physical Activity Readiness (PAR-Q)",
      description: "Required health screening questionnaire",
      isRequired: true,
      fields: [
        { id: "heartCondition", type: "boolean", label: "Has your doctor ever said that you have a heart condition?", required: true },
        { id: "chestPain", type: "boolean", label: "Do you feel pain in your chest when you do physical activity?", required: true },
        { id: "dizziness", type: "boolean", label: "Do you lose your balance because of dizziness or do you ever lose consciousness?", required: true },
        { id: "jointProblem", type: "boolean", label: "Do you have a bone or joint problem that could be made worse by physical activity?", required: true },
        { id: "medication", type: "boolean", label: "Are you currently taking medication for blood pressure or heart condition?", required: true },
        { id: "otherReason", type: "boolean", label: "Do you know of any other reason why you should not do physical activity?", required: true },
        { id: "injuries", type: "textarea", label: "Please list any current injuries or physical limitations", required: false },
        { id: "medicalConditions", type: "textarea", label: "Any medical conditions we should be aware of?", required: false }
      ]
    });

    // Goals & Preferences Form
    await storage.createForm({
      slug: "goals-preferences",
      title: "Training Goals & Preferences",
      description: "Help us personalize your training experience",
      isRequired: true,
      fields: [
        { id: "primaryGoals", type: "multiselect", label: "What are your primary training goals?", options: ["Weight Loss", "Build Muscle", "Learn Self-Defense", "Improve Fitness", "Competition Preparation", "Stress Relief", "Build Confidence"], required: true },
        { id: "fitnessLevel", type: "select", label: "How would you rate your current fitness level?", options: ["Beginner", "Intermediate", "Advanced"], required: true },
        { id: "availableDays", type: "multiselect", label: "Which days are you typically available?", options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], required: true },
        { id: "preferredTimes", type: "select", label: "Preferred training time", options: ["Early Morning (6-9am)", "Morning (9am-12pm)", "Afternoon (12-5pm)", "Evening (5-8pm)"], required: true },
        { id: "sessionFrequency", type: "select", label: "How often do you plan to train?", options: ["1x per week", "2x per week", "3x per week", "4+ times per week"], required: true },
        { id: "additionalNotes", type: "textarea", label: "Anything else you'd like us to know?", required: false }
      ]
    });

    console.log("Forms seeded successfully");
  }
}

// Run seed on module load
seedFormsData().catch(console.error);
