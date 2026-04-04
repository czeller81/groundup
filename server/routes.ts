import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookingSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import { addHours, addMinutes, format, parseISO } from "date-fns";
import fs from "fs";
import path from "path";

const PAGE_META: Record<string, { title: string; description: string; canonical: string }> = {
  "/": {
    title: "Master Brazilian Jiu-Jitsu in Oxnard, CA | Ground Up Jiu-Jitsu & Fitness",
    description: "Ground Up Jiu-Jitsu & Fitness offers beginner-friendly BJJ classes for women, kids, and adults in Oxnard, CA. No experience needed. Book your free trial class today.",
    canonical: "https://groundupbjj.com/",
  },
  "/schedule": {
    title: "Class Schedule — BJJ, Kids & Women's Classes in Oxnard, CA | Ground Up Jiu-Jitsu",
    description: "View the full weekly class schedule at Ground Up Jiu-Jitsu in Oxnard, CA. Women's BJJ, Kids Jiu-Jitsu, Strength & Conditioning, and more. Max 6 students per class.",
    canonical: "https://groundupbjj.com/schedule",
  },
  "/pricing": {
    title: "BJJ Programs & Pricing — Women's, Kids & Adult Classes | Ground Up Jiu-Jitsu Oxnard",
    description: "Explore BJJ programs and pricing at Ground Up Jiu-Jitsu in Oxnard, CA. Women's self-defense, kids BJJ, strength & conditioning, and personal training. Beginner friendly.",
    canonical: "https://groundupbjj.com/pricing",
  },
  "/coaches": {
    title: "Our BJJ Coach — Raymi Gonzalez, Gracie Barra Lineage | Ground Up Jiu-Jitsu Oxnard",
    description: "Meet Coach Raymi Gonzalez, Purple Belt (3rd Degree) under the Gracie Barra lineage. Head instructor at Ground Up Jiu-Jitsu & Fitness in Oxnard, CA with 5+ years of coaching experience.",
    canonical: "https://groundupbjj.com/coaches",
  },
  "/personal-training": {
    title: "Personal Training in Oxnard, CA — 1-on-1 BJJ & Fitness Coaching | Ground Up BJJ",
    description: "Book a private personal training session at Ground Up Jiu-Jitsu in Oxnard, CA. Custom 1-on-1 coaching for all fitness levels. Your first session is free.",
    canonical: "https://groundupbjj.com/personal-training",
  },
  "/contact": {
    title: "Contact Us — Book Your Free Trial Class in Oxnard, CA | Ground Up Jiu-Jitsu",
    description: "Ready to start your BJJ journey? Contact Ground Up Jiu-Jitsu & Fitness in Oxnard, CA to book your free trial class or ask us anything. No experience needed.",
    canonical: "https://groundupbjj.com/contact",
  },
  "/book": {
    title: "Book Your Free Trial Class — Ground Up Jiu-Jitsu & Fitness, Oxnard CA",
    description: "Reserve your first free BJJ class at Ground Up Jiu-Jitsu in Oxnard, CA. Women's BJJ, Kids Jiu-Jitsu, Self-Defense, and more. No experience needed. Takes 2 minutes.",
    canonical: "https://groundupbjj.com/book",
  },
  "/womens-self-defense": {
    title: "Women's Self-Defense Program — 8 Weeks in Oxnard, CA | Ground Up Jiu-Jitsu",
    description: "An 8-week Women's Self-Defense program in Oxnard, CA. Practical BJJ-based techniques, situational awareness, and confidence in a women-only class. First class free.",
    canonical: "https://groundupbjj.com/womens-self-defense",
  },
  "/kids": {
    title: "Kids Jiu-Jitsu in Oxnard, CA — Ages 4–14 | Ground Up Jiu-Jitsu",
    description: "Kids BJJ classes in Oxnard, CA for ages 4–14. Build confidence, discipline, coordination, and anti-bullying awareness in a small, structured program. First class free.",
    canonical: "https://groundupbjj.com/kids",
  },
};

const PAGE_CONTENT: Record<string, string> = {
  "/": `<h1>Master Brazilian Jiu-Jitsu from the Ground Up in Oxnard, CA</h1>
<p>A structured, foundational approach to BJJ for beginners and advanced practitioners.</p>
<p>Ground Up Jiu-Jitsu &amp; Fitness offers Brazilian Jiu-Jitsu classes for women, kids, and beginners in Oxnard, CA. No experience needed.</p>
<ul><li>Women's BJJ Fundamentals</li><li>Kids Jiu-Jitsu (Ages 6–14)</li><li>Women's Self-Defense Program</li><li>Strength &amp; Conditioning</li><li>Personal Training</li></ul>
<p>Head Coach: Raymi Gonzalez — Purple Belt, 3rd Degree, Gracie Barra Lineage. 5+ years coaching experience in Oxnard, CA.</p>
<a href="/contact">Book Your Free Trial</a> <a href="/schedule">View Class Schedule</a>`,
  "/schedule": `<h1>Class Schedule — Ground Up Jiu-Jitsu &amp; Fitness, Oxnard CA</h1>
<p>Weekly BJJ classes for women, kids, and beginners in Oxnard, CA. Max 6 students per class.</p>
<ul><li>Women's BJJ — Monday, Wednesday, Friday</li><li>Kids Jiu-Jitsu — Tuesday, Thursday, Saturday</li><li>Women's Self-Defense — Wednesday evenings</li><li>Strength &amp; Conditioning — Monday, Wednesday, Friday</li></ul>
<a href="/contact">Book Your Free Trial</a>`,
  "/pricing": `<h1>BJJ Programs &amp; Pricing — Ground Up Jiu-Jitsu, Oxnard CA</h1>
<p>Beginner-friendly Brazilian Jiu-Jitsu programs for women, kids, and adults. No experience required.</p>
<ul><li>Women's Self-Defense — 8-week program, 2 classes per week</li><li>Women's BJJ Fundamentals — ongoing membership</li><li>Kids Jiu-Jitsu (Ages 6–14)</li><li>Strength &amp; Conditioning</li><li>Personal Training — first session free</li></ul>
<a href="/contact">Book Your Free Trial</a>`,
  "/coaches": `<h1>BJJ Instructor — Raymi Gonzalez | Ground Up Jiu-Jitsu, Oxnard CA</h1>
<p>Meet Raymi Gonzalez, Purple Belt (3rd Degree) under the Gracie Barra lineage. 5+ years of coaching experience in Oxnard, CA.</p>
<p>Specialties: Women's Self-Defense, Kids BJJ, Strength &amp; Conditioning, Personal Training.</p>
<a href="/contact">Book Your Free Trial</a>`,
  "/personal-training": `<h1>Personal Training in Oxnard, CA — 1-on-1 BJJ &amp; Fitness Coaching</h1>
<p>Private personal training sessions at Ground Up Jiu-Jitsu in Oxnard, CA. Custom coaching tailored to your goals. Your first session is free.</p>
<ul><li>1-on-1 personalized sessions</li><li>Monday through Saturday, 8am–5pm</li><li>All fitness levels welcome</li><li>First session free</li></ul>
<a href="/contact">Book Your Free Session</a>`,
  "/contact": `<h1>Contact Ground Up Jiu-Jitsu &amp; Fitness — Oxnard, CA</h1>
<p>Book your free trial class or get in touch with us. No experience needed to start your BJJ journey.</p>
<p>Phone: (786) 757-1175 | Email: raymin33@gmail.com | Location: Oxnard, CA</p>
<a href="/contact">Book Your Free Trial</a>`,
  "/book": `<h1>Book Your Free Trial Class — Ground Up Jiu-Jitsu, Oxnard CA</h1>
<p>Reserve your first free BJJ class. Choose your program, pick a time, and we'll see you on the mat.</p>
<ul><li>Women's BJJ Fundamentals</li><li>Women's Self-Defense (8-week program)</li><li>Kids Jiu-Jitsu (Ages 4–14)</li><li>Strength &amp; Conditioning</li><li>Personal Training</li></ul>
<p>No experience needed. No gear required. First class is completely free.</p>`,
  "/womens-self-defense": `<h1>Women's Self-Defense Program — 8 Weeks in Oxnard, CA</h1>
<p>A structured 8-week Women's Self-Defense program at Ground Up Jiu-Jitsu in Oxnard, CA. Practical BJJ-based techniques for real situations.</p>
<ul><li>Awareness &amp; prevention</li><li>Breaking grips &amp; escaping</li><li>Ground defense</li><li>Confident body language</li><li>Scenario practice</li></ul>
<p>Women-only class. Max 6 students. No experience needed. First class free.</p>
<a href="/book">Book Your Free Trial</a>`,
  "/kids": `<h1>Kids Jiu-Jitsu in Oxnard, CA — Ages 4–14 | Ground Up Jiu-Jitsu</h1>
<p>Kids BJJ classes for ages 4–14 at Ground Up Jiu-Jitsu in Oxnard, CA. Build confidence, discipline, coordination, and anti-bullying awareness.</p>
<ul><li>Ages 4–7: Kids Intro to Jiu-Jitsu</li><li>Ages 8–14: Youth Jiu-Jitsu</li><li>Max 6 kids per class</li><li>Belt progression system</li><li>Anti-bullying focus</li></ul>
<p>First class is free. No gear required. Come see the mat.</p>
<a href="/book">Book a Free Trial Class</a>`,
};

async function serveWithMeta(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV !== "production") return next();
  const routePath = req.path;
  const meta = PAGE_META[routePath];
  if (!meta) return next();

  try {
    const indexPath = path.resolve(import.meta.dirname, "public", "index.html");
    let html = await fs.promises.readFile(indexPath, "utf-8");

    const title = meta.title.replace(/&/g, "&amp;");
    const desc = meta.description.replace(/"/g, "&quot;");

    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
      .replace(
        /<meta name="description"[^>]*>/,
        `<meta name="description" content="${desc}" />`
      )
      .replace(
        /<meta property="og:title"[^>]*>/,
        `<meta property="og:title" content="${title}" />`
      )
      .replace(
        /<meta property="og:description"[^>]*>/,
        `<meta property="og:description" content="${desc}" />`
      )
      .replace(
        /<link rel="canonical"[^>]*>/,
        `<link rel="canonical" href="${meta.canonical}" />`
      );

    const content = PAGE_CONTENT[routePath] || "";
    if (content) {
      const noscript = `<noscript style="display:block;padding:20px;font-family:sans-serif;max-width:800px;margin:0 auto">${content}</noscript>`;
      html = html.replace("</body>", `${noscript}\n</body>`);
    }

    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch {
    next();
  }
}

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
  // SEO: robots.txt and sitemap.xml
  // ============================================
  app.get("/robots.txt", (_req, res) => {
    res.set("Content-Type", "text/plain").send(
      `User-agent: *\nAllow: /\nDisallow: /portal/\nDisallow: /admin\n\nSitemap: https://groundupbjj.com/sitemap.xml\n`
    );
  });

  app.get("/sitemap.xml", (_req, res) => {
    const today = new Date().toISOString().split("T")[0];
    res.set("Content-Type", "application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://groundupbjj.com/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://groundupbjj.com/schedule</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>https://groundupbjj.com/pricing</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>
  <url><loc>https://groundupbjj.com/coaches</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://groundupbjj.com/personal-training</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://groundupbjj.com/contact</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://groundupbjj.com/book</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>
</urlset>`);
  });

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
  // TRIAL LEAD CAPTURE (public booking funnel)
  // ============================================
  app.post("/api/trial-leads", async (req, res) => {
    try {
      const { insertTrialLeadSchema } = await import("@shared/schema");
      const parsed = insertTrialLeadSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      const lead = await storage.createTrialLead(parsed.data);
      console.log("New trial lead:", lead.firstName, lead.lastName, lead.email, lead.program);
      res.json({ message: "Booking confirmed!", lead });
    } catch (error) {
      console.error("Trial lead error:", error);
      res.status(500).json({ message: "Failed to save booking" });
    }
  });

  app.get("/api/portal/admin/trial-leads", requireRole("admin", "coach"), async (req, res) => {
    try {
      const leads = await storage.getTrialLeads();
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leads" });
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

  app.post("/api/portal/forms/:slug/retake", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const form = await storage.getFormBySlug(req.params.slug);
      if (!form) return res.status(404).json({ message: "Form not found" });
      if (!form.retakeable) return res.status(403).json({ message: "This form cannot be retaken" });
      await storage.deleteFormResponse(userId, form.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset form" });
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
      const incompleteFormsOnly = req.query.incompleteFormsOnly === "true";
      const result = await storage.getAllUsers(search, page, limit, incompleteFormsOnly);
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

  for (const pagePath of Object.keys(PAGE_META)) {
    app.get(pagePath, serveWithMeta);
  }

  const httpServer = createServer(app);
  return httpServer;
}
