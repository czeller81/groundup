import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookingSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import { addHours, addMinutes, format, parseISO } from "date-fns";
import fs from "fs";
import path from "path";
import { parseRawJsonBody, verifyCalendlySignature, verifyStripeSignature } from "./webhook-security";
import { bookingBelongsToUser, createPublicRateLimit, requireAuth, requireRole } from "./route-security";
import { sendStaffNotificationEmail } from "./email";

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
  "/privacy": {
    title: "Privacy Policy | Ground Up BJJ",
    description: "Learn how Ground Up BJJ in Oxnard collects, uses, and protects information submitted through our website, forms, and marketing channels.",
    canonical: "https://groundupbjj.com/privacy",
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
  "/adaptive-capacity": {
    title: "Adaptive Capacity — Build the Capacity to Adapt | Ground Up",
    description: "A Ground Up learning experience for building clearer thinking, better decisions, and practical adaptability as work and life change.",
    canonical: "https://groundupbjj.com/adaptive-capacity",
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
<p>Phone: (786) 757-1175 | Email: info@groundupbjj.com | Location: Oxnard, CA</p>
<a href="/contact">Book Your Free Trial</a>`,
  "/privacy": `<h1>Privacy Policy | Ground Up BJJ</h1>
<p>Ground Up BJJ / Ground Up explains how we collect, use, and protect information submitted through our website, forms, bookings, and marketing channels.</p>
<p>Ground Up is located in Oxnard, California. Privacy questions can be sent to <a href="mailto:info@groundupbjj.com">info@groundupbjj.com</a>.</p>
<h2>Information and choices</h2>
<p>We may collect contact details, program interest, booking requests, form responses, website usage, and optional marketing attribution. We use this information to respond, administer programs, improve the site, and protect our community. See the full policy for details about Meta Instant Forms, service providers, analytics, retention, minors, and California privacy requests.</p>`,
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
  "/adaptive-capacity": `<h1>Adaptive Capacity — Build the Capacity to Adapt to Whatever Comes Next</h1>
  <p>Ground Up is developing a separate learning experience for people who want practical tools for clearer thinking, better decisions, and more adaptable work and life.</p>
  <p>Join the interest list to hear when the first cohort is ready. Details will be shared as they are confirmed.</p>
  <a href="/adaptive-capacity">Join the interest list</a>`,
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
const publicRateLimit = createPublicRateLimit;
const authRateLimit = () => createPublicRateLimit(10, 15 * 60 * 1000);
const bookingRateLimit = () => createPublicRateLimit(30, 15 * 60 * 1000);
const staffMutationRateLimit = () => createPublicRateLimit(120, 15 * 60 * 1000);

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api/portal/admin", staffMutationRateLimit());
  app.use("/api/admin", staffMutationRateLimit());
  app.use("/api/bookings", staffMutationRateLimit());

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
  <url><loc>https://groundupbjj.com/privacy</loc><lastmod>${today}</lastmod><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>https://groundupbjj.com/book</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>
  <url><loc>https://groundupbjj.com/womens-self-defense</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://groundupbjj.com/kids</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://groundupbjj.com/adaptive-capacity</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
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
  app.get("/api/bookings", requireRole("admin", "coach"), async (req, res) => {
    try {
      const bookingsList = await storage.getBookings();
      res.json(bookingsList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.post("/api/bookings", bookingRateLimit(), requireAuth, async (req, res) => {
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

      const booking = await storage.createUserBooking(req.session.userId!, bookingData);
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.put("/api/bookings/:id/status", requireRole("admin", "coach"), async (req, res) => {
    try {
      const { status, stripeSessionId } = req.body;
      if (!["pending", "paid", "canceled"].includes(status)) {
        return res.status(400).json({ message: "Invalid booking status" });
      }
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
  app.post("/api/create-payment-intent", bookingRateLimit(), requireAuth, async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe is not configured" });
    }
    try {
      const { sessionType, bookingId } = req.body;
      const sessionConfig = SESSION_TYPES[sessionType];
      if (!sessionConfig) {
        return res.status(400).json({ message: "Invalid session type" });
      }
      if (bookingId) {
        const booking = await storage.getBooking(bookingId);
        if (!bookingBelongsToUser(booking, req.session.userId)) {
          return res.status(404).json({ message: "Booking not found" });
        }
      }
      const paymentIntent = await stripe.paymentIntents.create({
        amount: sessionConfig.price * 100,
        currency: "usd",
        metadata: { sessionType, bookingId: bookingId || "" },
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error("Payment intent error:", error);
      res.status(500).json({ message: "Failed to create payment intent" });
    }
  });

  app.post("/api/stripe/webhook", express.raw({ type: "application/json", limit: "256kb" }), async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe is not configured" });
    }
    const sig = req.headers['stripe-signature'] as string;
    if (!process.env.STRIPE_WEBHOOK_SECRET || !sig) {
      return res.status(400).json({ message: "Webhook signature is not configured" });
    }
    let event;
    try {
      event = verifyStripeSignature(stripe, req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err);
      return res.status(400).json({ message: "Invalid webhook signature" });
    }
    if (!(await storage.claimWebhookEvent("stripe", event.id))) {
      return res.json({ received: true, duplicate: true });
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
  app.post("/api/contact", publicRateLimit(), async (req, res) => {
    try {
      const { insertContactSubmissionSchema } = await import("@shared/schema");
      const parsed = insertContactSubmissionSchema.safeParse({
        ...req.body,
        source: req.body.source || "contact",
        consentedAt: req.body.consentedAt || null,
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      const submission = await storage.createContactSubmission(parsed.data);
      try {
        const notificationMessage = `${submission.firstName} ${submission.lastName} sent a ${submission.subject.toLowerCase()} message.`;
        await storage.createStaffNotification({
          kind: "contact_message",
          title: "New contact message",
          message: notificationMessage,
          href: "/portal/admin?inbox=messages",
        });
        try {
          await sendStaffNotificationEmail({
            subject: "New Ground Up contact message",
            text: notificationMessage,
            inboxPath: "/portal/admin?inbox=messages",
          });
        } catch (emailError) {
          console.error("Staff email failed for contact submission:", emailError);
        }
      } catch (notificationError) {
        console.error("Staff notification failed for contact submission:", notificationError);
      }
      res.json({ message: "Thank you for your message. We'll get back to you soon!" });
    } catch (error) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // ============================================
  // TRIAL LEAD CAPTURE (public booking funnel)
  // ============================================
  app.post("/api/trial-leads", publicRateLimit(), async (req, res) => {
    try {
      const { insertTrialLeadSchema } = await import("@shared/schema");
      const parsed = insertTrialLeadSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      const lead = await storage.createTrialLead({
        ...parsed.data,
        program: parsed.data.program === "adaptive-capacity" ? "adaptive-capacity" : parsed.data.program,
        source: parsed.data.source || "training-book",
        consentedAt: parsed.data.consentedAt || new Date(),
      });
      try {
        const adaptive = lead.program === "adaptive-capacity";
        const notificationTitle = adaptive ? "New Adaptive Capacity signup" : "New training lead";
        const notificationMessage = `${lead.firstName} ${lead.lastName} joined the ${adaptive ? "Adaptive Capacity interest list" : "training trial"} list.`;
        const inboxPath = `/portal/admin?inbox=${adaptive ? "adaptive" : "training"}`;
        await storage.createStaffNotification({
          kind: adaptive ? "adaptive_lead" : "training_lead",
          title: notificationTitle,
          message: notificationMessage,
          href: inboxPath,
        });
        try {
          await sendStaffNotificationEmail({
            subject: `Ground Up: ${notificationTitle}`,
            text: notificationMessage,
            inboxPath,
          });
        } catch (emailError) {
          console.error("Staff email failed for trial lead:", emailError);
        }
      } catch (notificationError) {
        console.error("Staff notification failed for trial lead:", notificationError);
      }
      res.json({ message: lead.program === "adaptive-capacity" ? "You're on the interest list." : "Booking confirmed!" });
    } catch (error) {
      console.error("Trial lead error:", error);
      res.status(500).json({ message: "Failed to save booking" });
    }
  });

  app.post("/api/analytics/events", publicRateLimit(), async (req, res) => {
    try {
      const { insertAnalyticsEventSchema } = await import("@shared/schema");
      const parsed = insertAnalyticsEventSchema.safeParse({
        event: req.body.event,
        funnel: req.body.funnel,
        sessionId: req.body.sessionId,
        path: req.body.path,
        properties: req.body.properties || {},
      });
      if (!parsed.success) return res.status(400).json({ message: "Invalid analytics event" });
      await storage.createAnalyticsEvent(parsed.data);
      res.status(204).end();
    } catch (error) {
      console.error("Analytics event error:", error);
      res.status(500).json({ message: "Failed to record analytics event" });
    }
  });

  app.get("/api/portal/admin/campaign-report", requireRole("admin", "coach"), async (req, res) => {
    const funnel = req.query.funnel === "adaptive_capacity" ? "adaptive_capacity" : req.query.funnel === "training" ? "training" : null;
    if (!funnel) return res.status(400).json({ message: "funnel must be training or adaptive_capacity" });
    const clean = (key: string) => typeof req.query[key] === "string" ? (req.query[key] as string).trim().slice(0, 200) || undefined : undefined;
    try {
      res.json(await storage.getCampaignReport({
        funnel,
        source: clean("source"),
        medium: clean("medium"),
        campaign: clean("campaign"),
        landingPath: clean("landingPath"),
      }));
    } catch (error) {
      console.error("Campaign report error:", error);
      res.status(500).json({ message: "Failed to build campaign report" });
    }
  });

  app.get("/api/portal/notifications", requireRole("admin", "coach"), async (_req, res) => {
    try {
      res.json(await storage.getStaffNotifications());
    } catch (error) {
      console.error("Staff notification fetch failed:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/portal/notifications/:id/read", requireRole("admin", "coach"), async (req, res) => {
    try {
      const notification = await storage.markStaffNotificationRead(req.params.id);
      if (!notification) return res.status(404).json({ message: "Notification not found" });
      res.json(notification);
    } catch (error) {
      console.error("Staff notification update failed:", error);
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  app.get("/api/portal/admin/trial-leads", requireRole("admin", "coach"), async (req, res) => {
    try {
      const program = req.query.program as string | undefined;
      if (program && !["training", "adaptive-capacity"].includes(program)) {
        return res.status(400).json({ message: "Invalid lead program" });
      }
      const leads = await storage.getTrialLeads(program === "training" ? undefined : program);
      const filtered = program === "training"
        ? leads.filter((lead) => lead.program !== "adaptive-capacity")
        : leads;
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.patch("/api/portal/admin/trial-leads/:id/status", requireRole("admin", "coach"), async (req, res) => {
    const { leadStatuses } = await import("@shared/schema");
    if (!leadStatuses.includes(req.body.status)) {
      return res.status(400).json({ message: "Invalid lead status" });
    }
    try {
      const lead = await storage.updateTrialLeadStatus(req.params.id, req.body.status);
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      res.json(lead);
    } catch (error) {
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.get("/api/portal/admin/contact-submissions", requireRole("admin"), async (_req, res) => {
    try {
      res.json(await storage.getContactSubmissions());
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.patch("/api/portal/admin/contact-submissions/:id/status", requireRole("admin"), async (req, res) => {
    const { contactStatuses } = await import("@shared/schema");
    if (!contactStatuses.includes(req.body.status)) {
      return res.status(400).json({ message: "Invalid message status" });
    }
    try {
      const submission = await storage.updateContactSubmissionStatus(req.params.id, req.body.status);
      if (!submission) return res.status(404).json({ message: "Message not found" });
      res.json(submission);
    } catch (error) {
      res.status(500).json({ message: "Failed to update message" });
    }
  });

  // ============================================
  // CALENDLY WEBHOOK
  // ============================================
  const calendlyWebhookSchema = z.object({
    event_id: z.string(),
    email: z.string().email(),
    event_type: z.string(),
    start_time: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid start time"),
    payment_status: z.string().optional().default("pending"),
    amount: z.number().optional().default(2000),
  });

  app.post("/webhook/calendly", publicRateLimit(60), async (req, res) => {
    try {
      const rawBody = req.body;
      const signature = req.headers["calendly-webhook-signature"] as string | undefined;
      if (!process.env.CALENDLY_WEBHOOK_SIGNING_KEY) {
        return res.status(503).json({ message: "Calendly webhook is not configured" });
      }
      if (!verifyCalendlySignature(rawBody, signature, process.env.CALENDLY_WEBHOOK_SIGNING_KEY)) {
        return res.status(401).json({ message: "Invalid webhook signature" });
      }
      let payload = parseRawJsonBody(rawBody) as Record<string, any>;
      
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
      if (!(await storage.claimWebhookEvent("calendly", validated.event_id))) {
        const existing = await storage.getBookingByCalendlyEventId(validated.event_id);
        return res.status(200).json({ message: "Webhook already processed", bookingId: existing?.id });
      }
      
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
  app.post("/api/portal/signup", authRateLimit(), async (req, res) => {
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

  app.post("/api/portal/login", authRateLimit(), async (req, res) => {
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
  app.post("/api/admin/login", requireRole("admin"), async (req, res) => {
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

  app.get("/api/admin/bookings", requireRole("admin", "coach"), async (req, res) => {
    try {
      const bookingsList = await storage.getBookings();
      res.json(bookingsList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.put("/api/admin/bookings/:id/cancel", requireRole("admin", "coach"), async (req, res) => {
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

  app.put("/api/admin/trainers/:id/availability", requireRole("admin"), async (req, res) => {
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
