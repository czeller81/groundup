import { 
  trainers, 
  bookings, 
  adminUsers,
  type Trainer, 
  type InsertTrainer,
  type Booking,
  type InsertBooking,
  type BookingWithTrainer,
  type AdminUser,
  type InsertAdminUser
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
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

  constructor() {
    // Seed some initial data
    this.seedData();
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

// Use memory storage for development to have seeded data, database storage for production
export const storage = process.env.NODE_ENV === "production" ? new DatabaseStorage() : new MemStorage();
