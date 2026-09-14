import { Router, type Express, type Request, type Response, type NextFunction } from "express";
import crypto from "node:crypto";
import { storage } from "./storage";
import { leadStatuses, contactStatuses } from "@shared/schema";

const AI_API_PREFIX = "/api/ai/v1";
const MAX_PAGE_SIZE = 100;

function bearerToken(req: Request) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function tokensMatch(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

function requireAiManagementKey(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.AI_MANAGEMENT_API_KEY?.trim();
  if (!expected) {
    return res.status(503).json({
      code: "AI_MANAGEMENT_API_NOT_CONFIGURED",
      message: "AI management API is not configured.",
    });
  }

  if (!tokensMatch(bearerToken(req), expected)) {
    return res.status(401).json({
      code: "AI_MANAGEMENT_UNAUTHORIZED",
      message: "A valid bearer token is required.",
    });
  }

  res.set("Cache-Control", "no-store");
  next();
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parsePage(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseLimit(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return 20;
  return Math.min(parsed, MAX_PAGE_SIZE);
}

function queryText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 200) || undefined : undefined;
}

function sendServerError(res: Response, message: string, error: unknown) {
  console.error(`AI management API: ${message}`, error);
  return res.status(500).json({ code: "AI_MANAGEMENT_REQUEST_FAILED", message });
}

function publicScheduleOccurrence(occurrence: Awaited<ReturnType<typeof storage.listClassOccurrences>>[number]) {
  return {
    id: occurrence.id,
    title: occurrence.title,
    description: occurrence.description,
    start: occurrence.start,
    end: occurrence.end,
    location: occurrence.location,
    instructorName: occurrence.instructorName,
    capacity: occurrence.capacity,
    confirmedCount: occurrence.confirmedCount,
    waitlistCount: occurrence.waitlistCount,
    bookingEnabled: occurrence.bookingEnabled,
    firstVisitEligible: occurrence.firstVisitEligible,
    audience: occurrence.audience,
    canonicalCategory: occurrence.canonicalCategory,
    classType: occurrence.classType
      ? { id: occurrence.classType.id, name: occurrence.classType.name, category: occurrence.classType.category }
      : null,
  };
}

const openApiTemplate = {
  openapi: "3.0.3",
  info: {
    title: "Ground Up AI Management API",
    version: "1.0.0",
    description: "Scoped operations and marketing management for the Ground Up member portal.",
  },
  tags: [
    { name: "Operations" },
    { name: "Marketing" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "AI_MANAGEMENT_API_KEY",
      },
    },
  },
  paths: {
    "/api/ai/v1/operations/summary": {
      get: { tags: ["Operations"], security: [{ bearerAuth: [] }], responses: { "200": { description: "Operations summary" } } },
    },
    "/api/ai/v1/operations/schedule": {
      get: {
        tags: ["Operations"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
        ],
        responses: { "200": { description: "Live schedule and availability" } },
      },
    },
    "/api/ai/v1/operations/members": {
      get: {
        tags: ["Operations"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
          { name: "incompleteFormsOnly", in: "query", schema: { type: "boolean" } },
        ],
        responses: { "200": { description: "Paginated member list" } },
      },
    },
    "/api/ai/v1/operations/bookings": {
      get: {
        tags: ["Operations"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
        ],
        responses: { "200": { description: "Bookings" } },
      },
    },
    "/api/ai/v1/operations/bookings/{id}/status": {
      patch: {
        tags: ["Operations"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["pending", "paid", "canceled"] } } } } },
        },
        responses: { "200": { description: "Updated booking" } },
      },
    },
    "/api/ai/v1/operations/leads": {
      get: { tags: ["Operations"], security: [{ bearerAuth: [] }], responses: { "200": { description: "Leads" } } },
    },
    "/api/ai/v1/operations/leads/{id}/status": {
      patch: {
        tags: ["Operations"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["status"], properties: { status: { type: "string", enum: [...leadStatuses] } } } } },
        },
        responses: { "200": { description: "Updated lead" } },
      },
    },
    "/api/ai/v1/operations/contacts": {
      get: { tags: ["Operations"], security: [{ bearerAuth: [] }], responses: { "200": { description: "Contact submissions" } } },
    },
    "/api/ai/v1/operations/contacts/{id}/status": {
      patch: {
        tags: ["Operations"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["status"], properties: { status: { type: "string", enum: [...contactStatuses] } } } } },
        },
        responses: { "200": { description: "Updated contact submission" } },
      },
    },
    "/api/ai/v1/marketing/discovery-funnel": {
      get: {
        tags: ["Marketing"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "days", in: "query", schema: { type: "integer", minimum: 1, maximum: 365 } },
          { name: "locale", in: "query", schema: { type: "string", enum: ["en", "es"] } },
        ],
        responses: { "200": { description: "Discovery Pass funnel report" } },
      },
    },
    "/api/ai/v1/marketing/discovery-ab": {
      get: { tags: ["Marketing"], security: [{ bearerAuth: [] }], responses: { "200": { description: "Discovery Pass A/B report" } } },
    },
    "/api/ai/v1/marketing/campaign-report": {
      get: {
        tags: ["Marketing"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "funnel", in: "query", required: true, schema: { type: "string", enum: ["training", "adaptive_capacity"] } },
          { name: "source", in: "query", schema: { type: "string" } },
          { name: "medium", in: "query", schema: { type: "string" } },
          { name: "campaign", in: "query", schema: { type: "string" } },
          { name: "landingPath", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Campaign performance report" } },
      },
    },
  },
} as const;

export function getAiManagementOpenApi(origin: string) {
  return { ...openApiTemplate, servers: [{ url: origin }] };
}

export function registerAiManagementRoutes(app: Express) {
  const router = Router();
  const rateLimit = new Map<string, { count: number; resetAt: number }>();

  router.get("/openapi.json", (req: Request, res: Response) => {
    const origin = `${req.protocol}://${req.get("host")}`;
    res.json(getAiManagementOpenApi(origin));
  });

  router.use((req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || "unknown";
    const now = Date.now();
    const current = rateLimit.get(key);
    if (!current || current.resetAt <= now) {
      rateLimit.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    } else if (current.count >= 120) {
      res.set("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
      return res.status(429).json({ code: "AI_MANAGEMENT_RATE_LIMITED", message: "Too many API requests." });
    } else {
      current.count++;
    }
    next();
  });
  router.use(requireAiManagementKey);

  router.get("/operations/summary", async (req: Request, res: Response) => {
    try {
      const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
      const [stats, funnel] = await Promise.all([
        storage.getAdminStats(),
        storage.getDiscoveryFunnelReport({ days }),
      ]);
      res.json({ generatedAt: new Date().toISOString(), stats, discoveryFunnel: funnel });
    } catch (error) {
      sendServerError(res, "Failed to load operations summary.", error);
    }
  });

  router.get("/operations/schedule", async (req: Request, res: Response) => {
    const from = parseDate(req.query.from) || new Date();
    const to = parseDate(req.query.to) || new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);
    if (to <= from || to.getTime() - from.getTime() > 31 * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ code: "INVALID_DATE_RANGE", message: "Use a date range from 1 to 31 days." });
    }
    try {
      const occurrences = await storage.listClassOccurrences(from, to, false, false);
      res.json({
        timezone: "America/Los_Angeles",
        from,
        to,
        occurrences: occurrences.map(publicScheduleOccurrence),
      });
    } catch (error) {
      sendServerError(res, "Failed to load schedule.", error);
    }
  });

  router.get("/operations/members", async (req: Request, res: Response) => {
    try {
      const result = await storage.getAllUsers(
        queryText(req.query.search),
        parsePage(req.query.page, 1),
        parseLimit(req.query.limit),
        req.query.incompleteFormsOnly === "true",
      );
      res.json(result);
    } catch (error) {
      sendServerError(res, "Failed to load members.", error);
    }
  });

  router.get("/operations/bookings", async (req: Request, res: Response) => {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    if ((req.query.from && !from) || (req.query.to && !to)) {
      return res.status(400).json({ code: "INVALID_DATE", message: "from and to must be ISO date values." });
    }
    try {
      res.json(await storage.getBookings({
        status: queryText(req.query.status),
        startDate: from,
        endDate: to,
      }));
    } catch (error) {
      sendServerError(res, "Failed to load bookings.", error);
    }
  });

  router.patch("/operations/bookings/:id/status", async (req: Request, res: Response) => {
    const status = req.body?.status;
    if (!["pending", "paid", "canceled"].includes(status)) {
      return res.status(400).json({ code: "INVALID_BOOKING_STATUS", message: "status must be pending, paid, or canceled." });
    }
    try {
      const booking = await storage.updateBookingStatus(req.params.id, status, undefined);
      if (!booking) return res.status(404).json({ code: "BOOKING_NOT_FOUND", message: "Booking not found." });
      res.json(booking);
    } catch (error) {
      sendServerError(res, "Failed to update booking.", error);
    }
  });

  router.get("/operations/leads", async (req: Request, res: Response) => {
    const program = queryText(req.query.program);
    if (program && !["training", "adaptive-capacity"].includes(program)) {
      return res.status(400).json({ code: "INVALID_PROGRAM", message: "program must be training or adaptive-capacity." });
    }
    try {
      const leads = await storage.getTrialLeads(program === "training" ? undefined : program);
      res.json(program === "training" ? leads.filter((lead) => lead.program !== "adaptive-capacity") : leads);
    } catch (error) {
      sendServerError(res, "Failed to load leads.", error);
    }
  });

  router.patch("/operations/leads/:id/status", async (req: Request, res: Response) => {
    if (!leadStatuses.includes(req.body?.status)) {
      return res.status(400).json({ code: "INVALID_LEAD_STATUS", message: "Invalid lead status." });
    }
    try {
      const lead = await storage.updateTrialLeadStatus(req.params.id, req.body.status);
      if (!lead) return res.status(404).json({ code: "LEAD_NOT_FOUND", message: "Lead not found." });
      res.json(lead);
    } catch (error) {
      sendServerError(res, "Failed to update lead.", error);
    }
  });

  router.get("/operations/contacts", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getContactSubmissions());
    } catch (error) {
      sendServerError(res, "Failed to load contact submissions.", error);
    }
  });

  router.patch("/operations/contacts/:id/status", async (req: Request, res: Response) => {
    if (!contactStatuses.includes(req.body?.status)) {
      return res.status(400).json({ code: "INVALID_CONTACT_STATUS", message: "Invalid contact status." });
    }
    try {
      const submission = await storage.updateContactSubmissionStatus(req.params.id, req.body.status);
      if (!submission) return res.status(404).json({ code: "CONTACT_NOT_FOUND", message: "Contact submission not found." });
      res.json(submission);
    } catch (error) {
      sendServerError(res, "Failed to update contact submission.", error);
    }
  });

  router.get("/marketing/discovery-funnel", async (req: Request, res: Response) => {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const locale = req.query.locale === "en" || req.query.locale === "es" ? req.query.locale : undefined;
    try {
      res.json(await storage.getDiscoveryFunnelReport({ days, locale }));
    } catch (error) {
      sendServerError(res, "Failed to load Discovery Pass funnel.", error);
    }
  });

  router.get("/marketing/discovery-ab", async (req: Request, res: Response) => {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    try {
      res.json(await storage.getDiscoveryAbReport({ days }));
    } catch (error) {
      sendServerError(res, "Failed to load Discovery Pass A/B report.", error);
    }
  });

  router.get("/marketing/campaign-report", async (req: Request, res: Response) => {
    const funnel = req.query.funnel === "adaptive_capacity" || req.query.funnel === "training"
      ? req.query.funnel
      : undefined;
    if (!funnel) {
      return res.status(400).json({ code: "INVALID_FUNNEL", message: "funnel must be training or adaptive_capacity." });
    }
    try {
      res.json(await storage.getCampaignReport({
        funnel,
        source: queryText(req.query.source),
        medium: queryText(req.query.medium),
        campaign: queryText(req.query.campaign),
        landingPath: queryText(req.query.landingPath),
      }));
    } catch (error) {
      sendServerError(res, "Failed to load campaign report.", error);
    }
  });

  app.use(AI_API_PREFIX, router);
}