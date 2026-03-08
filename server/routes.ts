import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookingSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import { addHours, addMinutes, format, parseISO } from "date-fns";

declare module "express-session" {
  interface SessionData {
    userId: string;
    userRole: string;
  }
}

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY not found. Stripe functionality will be disabled.');
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
}) : null;

const SESSION_TYPES: Record<string, { name: string; duration: number; price: number }> = {
  PT60: { name: "60-Minute 1:1 Training", duration: 60, price: 20 },
  UNLIMITED: { name: "Monthly Unlimited", duration: 0, price: 280 }
};

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
};

const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.session?.userId;
    const userRole = req.session?.userRole;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (!roles.includes(userRole || "")) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ============================================
  // TRAINER ROUTES
  // ============================================
  app.get("/api/trainers", async (req, res) => {
    try {
      const trainers = await storage.getTrainers();
      res.json(trainers);
    } catch (error) {
      console.error("Error fetching trainers:", error);
      res.status(500).json({ message: "Failed to fetch trainers" });
    }
  });

  app.get("/api/trainers/:id", async (req, res) => {
    try {
      const trainer = await storage.getTrainer(req.params.id);
      if (!trainer) {
        return res.status(404).json({ message: "Trainer not found" });
      }
      res.json(trainer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trainer" });
    }
  });

  app.get("/api/trainers/:id/availability", async (req, res) => {
    try {
      const { date } = req.query;
      if (!date || typeof date !== 'string') {
        return res.status(400).json({ message: "Date parameter is required" });
      }

      const trainer = await storage.getTrainer(req.params.id);
      if (!trainer) {
        return res.status(404).json({ message: "Trainer not found" });
      }

      const selectedDate = parseISO(date);
      const dayName = format(selectedDate, 'EEEE');
      const dayAvailability = (trainer.availability as Record<string, string[]>)[dayName] || [];
      
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const existingBookings = await storage.getTrainerBookings(req.params.id, startOfDay, endOfDay);
      const bookedTimes = existingBookings.map(booking => format(booking.start, 'HH:mm'));
      const availableTimes = dayAvailability.filter((time: string) => !bookedTimes.includes(time));

      res.json({ availableTimes });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  // ============================================
  // BOOKING ROUTES
  // ============================================
  app.get("/api/bookings", async (req, res) => {
    try {
      const bookingsList = await storage.getBookings();
      res.json(bookingsList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const bookingData = insertBookingSchema.parse(req.body);
      
      if (!SESSION_TYPES[bookingData.sessionType]) {
        return res.status(400).json({ message: "Invalid session type" });
      }

      const existingBookings = await storage.getTrainerBookings(
        bookingData.trainerId,
        new Date(bookingData.start),
        new Date(bookingData.end)
      );

      if (existingBookings.length > 0) {
        return res.status(400).json({ message: "Time slot is already booked" });
      }

      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.put("/api/bookings/:id/status", async (req, res) => {
    try {
      const { status, stripeSessionId } = req.body;
      const booking = await storage.updateBookingStatus(req.params.id, status, stripeSessionId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // ============================================
  // STRIPE ROUTES
  // ============================================
  app.post("/api/create-payment-intent", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe is not configured" });
    }
    try {
      const { sessionType, bookingId } = req.body;
      const sessionConfig = SESSION_TYPES[sessionType];
      if (!sessionConfig) {
        return res.status(400).json({ message: "Invalid session type" });
      }
      const paymentIntent = await stripe.paymentIntents.create({
        amount: sessionConfig.price * 100,
        currency: "usd",
        metadata: { sessionType, bookingId: bookingId || "" },
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  app.post("/api/stripe/webhook", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe is not configured" });
    }
    const sig = req.headers['stripe-signature'] as string;
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const bookingId = paymentIntent.metadata.bookingId;
        if (bookingId) {
          await storage.updateBookingStatus(bookingId, "paid", paymentIntent.id);
        }
        break;
    }
    res.json({ received: true });
  });

  // ============================================
  // CONTACT ROUTE
  // ============================================
  app.post("/api/contact", async (req, res) => {
    try {
      const { firstName, lastName, email, phone, subject, message } = req.body;
      console.log("Contact form submission:", { firstName, lastName, email, phone, subject, message });
      res.json({ message: "Thank you for your message. We'll get back to you soon!" });
    } catch (error) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // ============================================
  // CALENDLY WEBHOOK
  // ============================================
  const calendlyWebhookSchema = z.object({
    event_id: z.string(),
    email: z.string().email(),
    event_type: z.string(),
    start_time: z.string(),
    payment_status: z.string().optional().default("pending"),
    amount: z.number().optional().default(2000),
  });

  app.post("/webhook/calendly", async (req, res) => {
    try {
      let payload = req.body;
      
      if (payload.event === "invitee.created" && payload.payload) {
        payload = {
          event_id: payload.payload.event?.uuid || payload.payload.uri || "",
          email: payload.payload.email || "",
          event_type: payload.payload.event?.name || "PT60",
          start_time: payload.payload.event?.start_time || payload.payload.scheduled_event?.start_time || new Date().toISOString(),
          payment_status: payload.payload.payment?.successful ? "paid" : "pending",
          amount: payload.payload.payment?.amount ? payload.payload.payment.amount * 100 : 2000,
        };
      }

      const validated = calendlyWebhookSchema.parse(payload);
      
      const booking = await storage.createCalendlyBooking({
        eventId: validated.event_id,
        email: validated.email,
        eventType: validated.event_type,
        startTime: new Date(validated.start_time),
        paymentStatus: validated.payment_status,
        amount: validated.amount,
      });

      res.status(201).json({ message: "Booking created", bookingId: booking.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid webhook payload", errors: error.errors });
      }
      console.error("Calendly webhook error:", error);
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  // ============================================
  // PORTAL AUTHENTICATION ROUTES
  // ============================================
  app.post("/api/portal/signup", async (req, res) => {
    try {
      const { email, password, firstName, lastName, phone } = req.body;
      
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "Email, password, first name, and last name are required" });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const user = await storage.createUser(email, password, firstName, lastName, phone);
      req.session.userId = user.id;
      req.session.userRole = user.role;
      
      res.status(201).json({ user });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/portal/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.validateUserPassword(email, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.userId = user.id;
      req.session.userRole = user.role;
      
      res.json({ user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/portal/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/portal/me", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const { passwordHash: _, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // ============================================
  // PORTAL FORMS ROUTES
  // ============================================
  app.get("/api/portal/forms", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const allForms = await storage.getForms();
      const userResponses = await storage.getUserFormResponses(userId);
      
      const formsWithStatus = allForms.map(form => {
        const response = userResponses.find(r => r.formId === form.id);
        return {
          ...form,
          responseStatus: response?.status || "not_started",
          responseId: response?.id
        };
      });

      res.json(formsWithStatus);
    } catch (error) {
      res.status(500).json({ message: "Failed to get forms" });
    }
  });

  app.get("/api/portal/forms/:slug", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const form = await storage.getFormBySlug(req.params.slug);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      const response = await storage.getFormResponse(userId, form.id);
      res.json({ form, response: response || null });
    } catch (error) {
      res.status(500).json({ message: "Failed to get form" });
    }
  });

  app.post("/api/portal/forms/:slug/save", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const form = await storage.getFormBySlug(req.params.slug);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      const { answers } = req.body;
      const response = await storage.saveFormResponse(userId, form.id, answers, "draft");
      res.json(response);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to save form" });
    }
  });

  app.post("/api/portal/forms/:slug/submit", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const form = await storage.getFormBySlug(req.params.slug);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      const { answers } = req.body;
      await storage.saveFormResponse(userId, form.id, answers, "draft");
      const response = await storage.submitFormResponse(userId, form.id);
      res.json(response);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to submit form" });
    }
  });

  // ============================================
  // PORTAL BOOKING ROUTES
  // ============================================
  app.get("/api/portal/bookings", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const userBookings = await storage.getUserBookings(userId);
      res.json(userBookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get bookings" });
    }
  });

  app.post("/api/portal/bookings", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const { trainerId, sessionType, date, time, notes } = req.body;
      if (!trainerId || !sessionType || !date || !time) {
        return res.status(400).json({ message: "Trainer, session type, date, and time are required" });
      }

      const sessionConfig = SESSION_TYPES[sessionType];
      if (!sessionConfig) {
        return res.status(400).json({ message: "Invalid session type" });
      }

      const startDateTime = new Date(`${date}T${time}`);
      const endDateTime = addMinutes(startDateTime, sessionConfig.duration || 60);

      const existingBookings = await storage.getTrainerBookings(trainerId, startDateTime, endDateTime);
      if (existingBookings.length > 0) {
        return res.status(400).json({ message: "Time slot is not available" });
      }

      const booking = await storage.createUserBooking(userId, {
        trainerId,
        sessionType,
        start: startDateTime,
        end: endDateTime,
        customerName: `${user.firstName} ${user.lastName}`,
        customerEmail: user.email,
        customerPhone: user.phone || "",
        notes: notes || "",
        amountCents: sessionConfig.price * 100,
        currency: "usd",
        status: "pending"
      });

      res.status(201).json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.put("/api/portal/bookings/:id/cancel", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const booking = await storage.cancelUserBooking(userId, req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to cancel booking" });
    }
  });

  // ============================================
  // ADMIN ROUTES
  // ============================================
  app.get("/api/portal/admin/stats", requireRole("admin"), async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  app.get("/api/portal/admin/members", requireRole("admin"), async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await storage.getAllUsers(search, page, limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to get members" });
    }
  });

  app.get("/api/portal/admin/members/:id", requireRole("admin"), async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to get member profile" });
    }
  });

  app.put("/api/portal/admin/members/:id/notes", requireRole("admin"), async (req, res) => {
    try {
      const { notes } = req.body;
      if (typeof notes !== "string") {
        return res.status(400).json({ message: "Notes must be a string" });
      }
      const user = await storage.updateAdminNotes(req.params.id, notes);
      if (!user) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update notes" });
    }
  });

  app.put("/api/portal/admin/members/:id/role", requireRole("admin"), async (req, res) => {
    try {
      const { role } = req.body;
      if (!["admin", "coach", "member"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      const user = await storage.updateUser(req.params.id, { role });
      if (!user) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.put("/api/portal/admin/members/:id/belt", requireRole("admin", "coach"), async (req, res) => {
    try {
      const { beltRank } = req.body;
      const user = await storage.updateUser(req.params.id, { beltRank });
      if (!user) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update belt rank" });
    }
  });

  app.put("/api/portal/admin/members/:id/attendance", requireRole("admin", "coach"), async (req, res) => {
    try {
      const { attendanceCount } = req.body;
      const user = await storage.updateUser(req.params.id, { attendanceCount });
      if (!user) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update attendance" });
    }
  });

  app.get("/api/portal/admin/form-responses", requireRole("admin"), async (req, res) => {
    try {
      const responses = await storage.getAllFormResponses();
      res.json(responses);
    } catch (error) {
      res.status(500).json({ message: "Failed to get form responses" });
    }
  });

  app.get("/api/portal/admin/bookings", requireRole("admin"), async (req, res) => {
    try {
      const allBookings = await storage.getBookings();
      res.json(allBookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get bookings" });
    }
  });

  // ============================================
  // SESSION NOTES ROUTES (Admin & Coach)
  // ============================================
  app.get("/api/portal/session-notes/:userId", requireRole("admin", "coach"), async (req, res) => {
    try {
      const notes = await storage.getSessionNotes(req.params.userId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to get session notes" });
    }
  });

  app.post("/api/portal/session-notes/:userId", requireRole("admin", "coach"), async (req, res) => {
    try {
      const coachId = req.session.userId!;
      const { notes, sessionDate } = req.body;
      if (!notes || typeof notes !== "string") {
        return res.status(400).json({ message: "Notes are required" });
      }
      const note = await storage.createSessionNote({
        userId: req.params.userId,
        coachId,
        notes,
        sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
      });
      res.status(201).json(note);
    } catch (error) {
      res.status(500).json({ message: "Failed to create session note" });
    }
  });

  // ============================================
  // MEMBERSHIP ROUTES (Admin)
  // ============================================
  app.get("/api/portal/my-membership", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const memberships = await storage.getMemberships(userId);
      const active = memberships.find(m => m.status === "active") || null;
      res.json(active);
    } catch (error) {
      res.status(500).json({ message: "Failed to get membership" });
    }
  });

  app.get("/api/portal/memberships/:userId", requireRole("admin"), async (req, res) => {
    try {
      const membershipsList = await storage.getMemberships(req.params.userId);
      res.json(membershipsList);
    } catch (error) {
      res.status(500).json({ message: "Failed to get memberships" });
    }
  });

  app.post("/api/portal/memberships", requireRole("admin"), async (req, res) => {
    try {
      const { userId, type, priceCents, endDate } = req.body;
      if (!userId || !type) {
        return res.status(400).json({ message: "User ID and type are required" });
      }
      const membership = await storage.createMembership({
        userId,
        type,
        status: "active",
        priceCents: priceCents || 2000,
        startDate: new Date(),
        endDate: endDate ? new Date(endDate) : null,
      });
      res.status(201).json(membership);
    } catch (error) {
      res.status(500).json({ message: "Failed to create membership" });
    }
  });

  // ============================================
  // COACH ROUTES
  // ============================================
  app.get("/api/portal/coach/members", requireRole("coach", "admin"), async (req, res) => {
    try {
      const coachId = req.session.userId!;
      const userRole = req.session.userRole;
      
      if (userRole === "admin") {
        const result = await storage.getAllUsers(undefined, 1, 100);
        return res.json(result.users);
      }
      
      const coachMembers = await storage.getCoachMembers(coachId);
      res.json(coachMembers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get coach members" });
    }
  });

  // ============================================
  // LEGACY ADMIN ROUTES
  // ============================================
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const admin = await storage.getAdminUser(email);
      if (admin && admin.password === password) {
        res.json({ success: true, message: "Login successful" });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/admin/bookings", async (req, res) => {
    try {
      const bookingsList = await storage.getBookings();
      res.json(bookingsList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.put("/api/admin/bookings/:id/cancel", async (req, res) => {
    try {
      const booking = await storage.cancelBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });

  app.put("/api/admin/trainers/:id/availability", async (req, res) => {
    try {
      const { availability } = req.body;
      const trainer = await storage.updateTrainerAvailability(req.params.id, availability);
      if (!trainer) {
        return res.status(404).json({ message: "Trainer not found" });
      }
      res.json(trainer);
    } catch (error) {
      res.status(500).json({ message: "Failed to update availability" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
