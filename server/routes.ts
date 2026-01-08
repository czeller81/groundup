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

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY not found. Stripe functionality will be disabled.');
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
}) : null;

// Session types and pricing
const SESSION_TYPES = {
  PT60: { name: "60-Minute 1:1 Training", duration: 60, price: 20 },
  UNLIMITED: { name: "Monthly Unlimited", duration: 0, price: 280 }
};

// Simple admin auth middleware (in production, use proper session management)
const adminAuth = (req: any, res: any, next: any) => {
  const { email, password } = req.body || req.query;
  if (email === "admin@groundupbjj.com" && password === "ChangeMe123!") {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Trainers endpoints
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
      console.error("Error fetching trainer:", error);
      res.status(500).json({ message: "Failed to fetch trainer" });
    }
  });

  // Get trainer availability for a specific date
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
      
      // Get trainer's availability for that day
      const dayAvailability = trainer.availability[dayName] || [];
      
      // Get existing bookings for that day
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const existingBookings = await storage.getTrainerBookings(
        req.params.id, 
        startOfDay, 
        endOfDay
      );

      // Filter out booked slots
      const bookedTimes = existingBookings.map(booking => 
        format(booking.start, 'HH:mm')
      );

      const availableTimes = dayAvailability.filter(time => 
        !bookedTimes.includes(time)
      );

      res.json({ availableTimes });
    } catch (error) {
      console.error("Error fetching trainer availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  // Bookings endpoints
  app.get("/api/bookings", async (req, res) => {
    try {
      const bookings = await storage.getBookings();
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      // Validate request body
      const bookingData = insertBookingSchema.parse(req.body);
      
      // Validate session type
      if (!SESSION_TYPES[bookingData.sessionType as keyof typeof SESSION_TYPES]) {
        return res.status(400).json({ message: "Invalid session type" });
      }

      // Check if the time slot is available
      const existingBookings = await storage.getTrainerBookings(
        bookingData.trainerId,
        new Date(bookingData.start),
        new Date(bookingData.end)
      );

      if (existingBookings.length > 0) {
        return res.status(400).json({ message: "Time slot is already booked" });
      }

      // Create the booking
      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating booking:", error);
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
      console.error("Error updating booking status:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // Stripe payment endpoints
  app.post("/api/create-payment-intent", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe is not configured" });
    }

    try {
      const { sessionType, bookingId } = req.body;
      
      const sessionConfig = SESSION_TYPES[sessionType as keyof typeof SESSION_TYPES];
      if (!sessionConfig) {
        return res.status(400).json({ message: "Invalid session type" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: sessionConfig.price * 100, // Convert to cents
        currency: "usd",
        metadata: {
          sessionType,
          bookingId: bookingId || "",
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ 
        message: "Error creating payment intent: " + error.message 
      });
    }
  });

  // Stripe webhook endpoint
  app.post("/api/stripe/webhook", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe is not configured" });
    }

    const sig = req.headers['stripe-signature'] as string;
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const bookingId = paymentIntent.metadata.bookingId;
        
        if (bookingId) {
          await storage.updateBookingStatus(bookingId, "paid", paymentIntent.id);
          
          // TODO: Send confirmation email with calendar invite
          console.log(`Payment succeeded for booking ${bookingId}`);
        }
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  // Contact form endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const { firstName, lastName, email, phone, subject, message } = req.body;
      
      // TODO: Send email using Resend or similar service
      console.log("Contact form submission:", { firstName, lastName, email, phone, subject, message });
      
      res.json({ message: "Thank you for your message. We'll get back to you soon!" });
    } catch (error) {
      console.error("Error processing contact form:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Admin endpoints
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const admin = await storage.getAdminUser(email);
      
      if (admin && admin.password === password) {
        // TODO: In production, use proper JWT or session management
        res.json({ success: true, message: "Login successful" });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/admin/bookings", async (req, res) => {
    try {
      // In production, add proper authentication middleware
      const bookings = await storage.getBookings();
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching admin bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.put("/api/admin/bookings/:id/cancel", async (req, res) => {
    try {
      // In production, add proper authentication middleware
      const booking = await storage.cancelBooking(req.params.id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      res.json(booking);
    } catch (error) {
      console.error("Error canceling booking:", error);
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });

  app.put("/api/admin/trainers/:id/availability", async (req, res) => {
    try {
      // In production, add proper authentication middleware
      const { availability } = req.body;
      const trainer = await storage.updateTrainerAvailability(req.params.id, availability);
      
      if (!trainer) {
        return res.status(404).json({ message: "Trainer not found" });
      }
      
      res.json(trainer);
    } catch (error) {
      console.error("Error updating trainer availability:", error);
      res.status(500).json({ message: "Failed to update availability" });
    }
  });

  // ============================================
  // PORTAL AUTHENTICATION ROUTES
  // ============================================
  
  // User signup
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
      
      // Set session
      (req.session as any).userId = user.id;
      (req.session as any).userRole = user.role;
      
      res.status(201).json({ user });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // User login
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

      // Set session
      (req.session as any).userId = user.id;
      (req.session as any).userRole = user.role;
      
      res.json({ user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // User logout
  app.post("/api/portal/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/portal/me", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
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
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // ============================================
  // PORTAL FORMS ROUTES
  // ============================================

  // Get all forms
  app.get("/api/portal/forms", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const allForms = await storage.getForms();
      const userResponses = await storage.getUserFormResponses(userId);
      
      // Combine forms with user's response status
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
      console.error("Get forms error:", error);
      res.status(500).json({ message: "Failed to get forms" });
    }
  });

  // Get form by slug
  app.get("/api/portal/forms/:slug", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const form = await storage.getFormBySlug(req.params.slug);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      const response = await storage.getFormResponse(userId, form.id);
      
      res.json({
        form,
        response: response || null
      });
    } catch (error) {
      console.error("Get form error:", error);
      res.status(500).json({ message: "Failed to get form" });
    }
  });

  // Save form response (autosave/draft)
  app.post("/api/portal/forms/:slug/save", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const form = await storage.getFormBySlug(req.params.slug);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      const { answers } = req.body;
      const response = await storage.saveFormResponse(userId, form.id, answers, "draft");
      
      res.json(response);
    } catch (error: any) {
      console.error("Save form error:", error);
      res.status(400).json({ message: error.message || "Failed to save form" });
    }
  });

  // Submit form response
  app.post("/api/portal/forms/:slug/submit", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const form = await storage.getFormBySlug(req.params.slug);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      const { answers } = req.body;
      
      // Save final answers first
      await storage.saveFormResponse(userId, form.id, answers, "draft");
      
      // Then submit
      const response = await storage.submitFormResponse(userId, form.id);
      
      res.json(response);
    } catch (error: any) {
      console.error("Submit form error:", error);
      res.status(400).json({ message: error.message || "Failed to submit form" });
    }
  });

  // ============================================
  // PORTAL BOOKING ROUTES
  // ============================================

  // Get user's bookings
  app.get("/api/portal/bookings", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userBookings = await storage.getUserBookings(userId);
      res.json(userBookings);
    } catch (error) {
      console.error("Get bookings error:", error);
      res.status(500).json({ message: "Failed to get bookings" });
    }
  });

  // Create booking through portal
  app.post("/api/portal/bookings", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const { trainerId, sessionType, date, time, notes } = req.body;
      
      if (!trainerId || !sessionType || !date || !time) {
        return res.status(400).json({ message: "Trainer, session type, date, and time are required" });
      }

      const sessionConfig = SESSION_TYPES[sessionType as keyof typeof SESSION_TYPES];
      if (!sessionConfig) {
        return res.status(400).json({ message: "Invalid session type" });
      }

      const startDateTime = new Date(`${date}T${time}`);
      const endDateTime = addMinutes(startDateTime, sessionConfig.duration || 60);

      // Check availability
      const existingBookings = await storage.getTrainerBookings(
        trainerId,
        startDateTime,
        endDateTime
      );

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
      console.error("Create booking error:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // Cancel user booking
  app.put("/api/portal/bookings/:id/cancel", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const booking = await storage.cancelUserBooking(userId, req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      res.json(booking);
    } catch (error: any) {
      console.error("Cancel booking error:", error);
      res.status(400).json({ message: error.message || "Failed to cancel booking" });
    }
  });

  // ============================================
  // PORTAL ADMIN ROUTES
  // ============================================

  // Admin middleware
  const portalAdminAuth = async (req: any, res: any, next: any) => {
    const userId = (req.session as any).userId;
    const userRole = (req.session as any).userRole;
    
    if (!userId || userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  // Get all form responses (admin)
  app.get("/api/portal/admin/form-responses", portalAdminAuth, async (req, res) => {
    try {
      const responses = await storage.getAllFormResponses();
      res.json(responses);
    } catch (error) {
      console.error("Get form responses error:", error);
      res.status(500).json({ message: "Failed to get form responses" });
    }
  });

  // Get all portal bookings (admin)
  app.get("/api/portal/admin/bookings", portalAdminAuth, async (req, res) => {
    try {
      const allBookings = await storage.getBookings();
      res.json(allBookings);
    } catch (error) {
      console.error("Get admin bookings error:", error);
      res.status(500).json({ message: "Failed to get bookings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
