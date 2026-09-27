import { Router, type Express, type Request, type Response, type NextFunction } from "express";
import crypto from "node:crypto";
import { and, count, desc, eq, gte, ilike, isNull, lte, not, or } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import {
  bookings,
  contactStatuses,
  leadStatuses,
  membershipPlans,
  memberships,
  users,
} from "@shared/schema";
import { getStripeCheckoutReconciliationHealth } from "./membership-billing";
import { ADAPTIVE_CAPACITY_ENABLED, INTERNAL_TEST_EMAIL_PATTERN } from "./route-security";

const AI_API_PREFIX = "/api/ai/v1";
const MAX_PAGE_SIZE = 100;
const AI_PROVIDER_SCOPES = [
  "operations:summary:read",
  "schedule:read",
  "member:read",
  "booking:read",
  "booking:status:update",
  "reservation:read",
  "membership:read",
  "payment:read",
  "payment:reconciliation:read",
  "lead:read",
  "lead:status:update",
  "contact:read",
  "contact:status:update",
  "discovery-pass:report:read",
  "marketing:campaign-report:read",
] as const;
type AiProviderScope = typeof AI_PROVIDER_SCOPES[number];

const AI_API_ROUTE_SCOPES: Record<string, readonly AiProviderScope[]> = {
  "GET /operations/summary": ["operations:summary:read", "discovery-pass:report:read"],
  "GET /operations/schedule": ["schedule:read"],
  "GET /operations/members": ["member:read"],
  "GET /operations/bookings": ["booking:read"],
  "GET /operations/reservations": ["reservation:read"],
  "PATCH /operations/bookings/:id/status": ["booking:status:update"],
  "GET /operations/memberships": ["membership:read"],
  "GET /operations/payments": ["payment:read"],
  "GET /operations/payments.csv": ["payment:read"],
  "GET /operations/reconciliation-health": ["payment:reconciliation:read"],
  "GET /operations/leads": ["lead:read"],
  "PATCH /operations/leads/:id/status": ["lead:status:update"],
  "GET /operations/contacts": ["contact:read"],
  "PATCH /operations/contacts/:id/status": ["contact:status:update"],
  "GET /marketing/discovery-funnel": ["discovery-pass:report:read"],
  "GET /marketing/discovery-ab": ["discovery-pass:report:read"],
  "GET /marketing/campaign-report": ["marketing:campaign-report:read"],
};
const AI_SCOPED_ROUTES = Object.entries(AI_API_ROUTE_SCOPES).map(([routeKey, scopes]) => {
  const separator = routeKey.indexOf(" ");
  const method = routeKey.slice(0, separator);
  const path = routeKey.slice(separator + 1);
  const pattern = path
    .split("/")
    .map((segment) => segment.startsWith(":")
      ? "[^/]+"
      : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("/");
  return { method, path, scopes, pattern: new RegExp(`^${pattern}/?$`, "i") };
});

type AiAuthContext = {
  credential: "lime_scoped" | "legacy_broad";
  scopes: ReadonlySet<string>;
};

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
  const providerKey = process.env.LIME_AGENT_API_KEY?.trim();
  const legacyKey = process.env.AI_MANAGEMENT_API_KEY?.trim();
  if (!providerKey && !legacyKey) {
    return res.status(503).json({
      code: "AI_MANAGEMENT_API_NOT_CONFIGURED",
      message: "AI management API is not configured.",
      requestId: res.locals.aiRequestId,
    });
  }

  const supplied = bearerToken(req);
  if (!supplied || (!tokensMatch(supplied, providerKey || "") && !tokensMatch(supplied, legacyKey || ""))) {
    return res.status(401).json({
      code: "AI_MANAGEMENT_UNAUTHORIZED",
      message: "A valid bearer credential is required.",
      requestId: res.locals.aiRequestId,
    });
  }

  const matchesProviderKey = Boolean(providerKey && tokensMatch(supplied, providerKey));
  const matchesLegacyKey = Boolean(legacyKey && tokensMatch(supplied, legacyKey));
  if (matchesProviderKey && matchesLegacyKey) {
    return res.status(503).json({
      code: "AI_PROVIDER_CREDENTIAL_COLLISION",
      message: "Provider and legacy credentials must be distinct.",
      requestId: res.locals.aiRequestId,
    });
  }

  if (matchesProviderKey) {
    const configuredScopes = (process.env.LIME_AGENT_API_SCOPES || "")
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean);
    const unknownScopes = configuredScopes.filter(
      (scope) => !AI_PROVIDER_SCOPES.includes(scope as AiProviderScope),
    );
    if (unknownScopes.length > 0) {
      return res.status(503).json({
        code: "AI_PROVIDER_SCOPE_CONFIGURATION_INVALID",
        message: "Provider scope configuration contains unsupported scopes.",
        requestId: res.locals.aiRequestId,
      });
    }
    res.locals.aiAuth = {
      credential: "lime_scoped",
      scopes: new Set(configuredScopes),
    } satisfies AiAuthContext;
  } else {
    res.locals.aiAuth = {
      credential: "legacy_broad",
      scopes: new Set(AI_PROVIDER_SCOPES),
    } satisfies AiAuthContext;
  }

  res.set("Cache-Control", "no-store");
  next();
}

function assignAiRequestId(req: Request, res: Response, next: NextFunction) {
  const suppliedId = req.get("x-request-id")?.trim();
  const requestId = suppliedId && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(suppliedId)
    ? suppliedId.toLowerCase()
    : crypto.randomUUID();
  res.locals.aiRequestId = requestId;
  res.set("X-Request-Id", requestId);
  next();
}

function auditAiRequest(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();
  res.once("finish", () => {
    if (req.route?.path === "/openapi.json") return;
    const auth = res.locals.aiAuth as AiAuthContext | undefined;
    const routeTemplate = res.locals.aiRouteTemplate
      || (typeof req.route?.path === "string" ? `${AI_API_PREFIX}${req.route.path}` : AI_API_PREFIX);
    console.info(JSON.stringify({
      event: "ai_api_request",
      requestId: res.locals.aiRequestId,
      credentialClass: auth?.credential || "unverified",
      method: req.method,
      route: routeTemplate,
      requiredScopes: res.locals.aiRequiredScopes || [],
      statusCode: res.statusCode,
      durationMs: Math.max(0, Date.now() - startedAt),
    }));
  });
  next();
}

function resolveAiRoute(req: Request, res: Response, next: NextFunction) {
  const requestPath = req.originalUrl.split(/[?#]/, 1)[0] || "";
  const routePath = requestPath.startsWith(AI_API_PREFIX)
    ? requestPath.slice(AI_API_PREFIX.length)
    : req.path;
  const routeMethod = req.method === "HEAD" ? "GET" : req.method;
  const matchedRoute = AI_SCOPED_ROUTES.find((route) =>
    route.method === routeMethod && route.pattern.test(routePath),
  );
  res.locals.aiRouteMapped = Boolean(matchedRoute);
  res.locals.aiRequiredScopes = matchedRoute?.scopes || [];
  res.locals.aiRouteTemplate = matchedRoute ? `${AI_API_PREFIX}${matchedRoute.path}` : AI_API_PREFIX;
  next();
}

function authorizeAiRoute(_req: Request, res: Response, next: NextFunction) {
  const requiredScopes = res.locals.aiRequiredScopes as readonly string[] | undefined;
  if (!res.locals.aiRouteMapped || !requiredScopes?.length) {
    return res.status(403).json({
      code: "AI_SCOPE_MAPPING_MISSING",
      message: "This operation has no provider authorization mapping.",
      requestId: res.locals.aiRequestId,
    });
  }

  const auth = res.locals.aiAuth as AiAuthContext | undefined;
  if (!auth) {
    return res.status(401).json({
      code: "AI_MANAGEMENT_UNAUTHORIZED",
      message: "A valid bearer credential is required.",
      requestId: res.locals.aiRequestId,
    });
  }
  if (auth.credential === "legacy_broad" || requiredScopes.every((scope) => auth.scopes.has(scope))) {
    return next();
  }
  return res.status(403).json({
    code: "AI_SCOPE_FORBIDDEN",
    message: "The bearer credential lacks a required capability scope.",
    requiredScopes,
    requestId: res.locals.aiRequestId,
  });
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

function stripeMode() {
  if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")) return "live" as const;
  if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) return "test" as const;
  return "unknown" as const;
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function csvLine(values: unknown[]) {
  return values.map(csvCell).join(",");
}

async function getPaymentReport(params: {
  from?: Date;
  to?: Date;
  status?: string;
  page: number;
  limit: number;
}) {
  const filters = [
    not(ilike(users.email, INTERNAL_TEST_EMAIL_PATTERN)),
    ...(params.from ? [gte(bookings.createdAt, params.from)] : []),
    ...(params.to ? [lte(bookings.createdAt, params.to)] : []),
    ...(params.status ? [eq(bookings.status, params.status)] : []),
  ];
  const [rows, total] = await Promise.all([
    db.select({
      id: bookings.id,
      memberId: bookings.userId,
      occurredAt: bookings.createdAt,
      amountCents: bookings.amountCents,
      currency: bookings.currency,
      paymentStatus: bookings.paymentStatus,
      bookingStatus: bookings.status,
      stripeSessionId: bookings.stripeSessionId,
    })
      .from(bookings)
      .leftJoin(users, eq(bookings.userId, users.id))
      .where(or(isNull(users.id), and(...filters)))
      .orderBy(desc(bookings.createdAt))
      .limit(params.limit)
      .offset((params.page - 1) * params.limit),
    db.select({ count: count() })
      .from(bookings)
      .leftJoin(users, eq(bookings.userId, users.id))
      .where(or(isNull(users.id), and(...filters))),
  ]);
  return {
    source: "application_booking_records",
    accountingNote: "Fees, refunds, and bank payouts are not stored in the application record and are returned as unavailable.",
    mode: stripeMode(),
    page: params.page,
    limit: params.limit,
    total: Number(total[0]?.count || 0),
    rows: rows.map((row) => ({
      ...row,
      recordType: "booking_payment",
      feeCents: null,
      refundStatus: "unavailable",
      reconciliationStatus: row.paymentStatus === "paid" ? "recorded" : "not_paid",
    })),
  };
}

async function getMembershipReport(params: {
  page: number;
  limit: number;
  status?: string;
  billingState?: string;
}) {
  const filters = [
    not(ilike(users.email, INTERNAL_TEST_EMAIL_PATTERN)),
    ...(params.status ? [eq(memberships.status, params.status)] : []),
    ...(params.billingState ? [eq(memberships.billingState, params.billingState)] : []),
  ];
  const [rows, total] = await Promise.all([
    db.select({
      id: memberships.id,
      memberId: memberships.userId,
      planKey: membershipPlans.internalKey,
      planName: membershipPlans.displayName,
      status: memberships.status,
      billingState: memberships.billingState,
      billingSource: memberships.billingSource,
      priceCents: memberships.priceCents,
      startDate: memberships.startDate,
      endDate: memberships.endDate,
      currentPeriodStart: memberships.currentPeriodStart,
      currentPeriodEnd: memberships.currentPeriodEnd,
      cancelAtPeriodEnd: memberships.cancelAtPeriodEnd,
      billingFailureAt: memberships.billingFailureAt,
      stripeCustomerId: memberships.stripeCustomerId,
      stripeSubscriptionId: memberships.stripeSubscriptionId,
      stripeCheckoutSessionId: memberships.stripeCheckoutSessionId,
      stripeLatestInvoiceId: memberships.stripeLatestInvoiceId,
      createdAt: memberships.createdAt,
      updatedAt: memberships.updatedAt,
    })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .leftJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
      .where(and(...filters))
      .orderBy(desc(memberships.updatedAt))
      .limit(params.limit)
      .offset((params.page - 1) * params.limit),
    db.select({ count: count() })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(and(...filters)),
  ]);
  return {
    source: "application_membership_records",
    accountingNote: "This is a membership entitlement snapshot, not an invoice or payout ledger.",
    mode: stripeMode(),
    page: params.page,
    limit: params.limit,
    total: Number(total[0]?.count || 0),
    rows: rows.map((row) => ({
      ...row,
      currency: "usd",
      reconciliationStatus: row.billingState === "pending" ? "pending" : "recorded",
    })),
  };
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
    description: "HTTPS REST operations and marketing management. Protected operations require a bearer credential and the listed x-required-scopes. The OpenAPI document is public; credentials are never included here.",
  },
  "x-provider-scopes": AI_PROVIDER_SCOPES,
  tags: [
    { name: "Operations" },
    { name: "Marketing" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "Bearer",
      },
    },
    schemas: {
      AiApiError: {
        type: "object",
        required: ["code", "message", "requestId"],
        properties: {
          code: { type: "string" },
          message: { type: "string" },
          requestId: { type: "string", format: "uuid" },
          requiredScopes: { type: "array", items: { type: "string" } },
        },
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
    "/api/ai/v1/operations/reservations": {
      get: {
        tags: ["Operations"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["confirmed", "waitlisted", "cancelled"] } },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
        ],
        responses: { "200": { description: "Class reservation records that back schedule counts" } },
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
    "/api/ai/v1/operations/memberships": {
      get: {
        tags: ["Operations"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "billingState", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Paginated membership snapshots" } },
      },
    },
    "/api/ai/v1/operations/payments": {
      get: {
        tags: ["Operations"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
        ],
        responses: { "200": { description: "Paginated application payment records" } },
      },
    },
    "/api/ai/v1/operations/payments.csv": {
      get: {
        tags: ["Operations"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Bounded UTF-8 CSV export of application payment records" } },
      },
    },
    "/api/ai/v1/operations/reconciliation-health": {
      get: { tags: ["Operations"], security: [{ bearerAuth: [] }], responses: { "200": { description: "Current Stripe checkout reconciliation health" } },
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
  const paths = Object.fromEntries(
    Object.entries(openApiTemplate.paths).map(([path, pathItem]) => {
      const routePath = path.slice(AI_API_PREFIX.length).replace(/\{([^}]+)\}/g, ":$1");
      const operations = Object.fromEntries(
        Object.entries(pathItem).map(([method, operation]) => {
          const requiredScopes = AI_API_ROUTE_SCOPES[`${method.toUpperCase()} ${routePath}`] || [];
          const responses = (operation as { responses?: Record<string, unknown> }).responses || {};
          return [method, {
            ...operation,
            "x-required-scopes": requiredScopes,
            responses: {
              ...responses,
              "401": {
                description: "Missing or invalid bearer credential.",
                content: { "application/json": { schema: { $ref: "#/components/schemas/AiApiError" } } },
              },
              "403": {
                description: "Bearer credential is missing a required scope or route mapping.",
                content: { "application/json": { schema: { $ref: "#/components/schemas/AiApiError" } } },
              },
              "503": {
                description: "Provider credential or scope configuration is unavailable or invalid.",
                content: { "application/json": { schema: { $ref: "#/components/schemas/AiApiError" } } },
              },
            },
          }];
        }),
      );
      return [path, operations];
    }),
  );
  return { ...openApiTemplate, paths, servers: [{ url: origin }] };
}

export function registerAiManagementRoutes(app: Express) {
  const router = Router();
  const rateLimit = new Map<string, { count: number; resetAt: number }>();

  router.use(assignAiRequestId, auditAiRequest);

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
      return res.status(429).json({
        code: "AI_MANAGEMENT_RATE_LIMITED",
        message: "Too many API requests.",
        requestId: res.locals.aiRequestId,
      });
    } else {
      current.count++;
    }
    next();
  });
  router.use(resolveAiRoute, requireAiManagementKey, authorizeAiRoute);

  router.get("/operations/summary", async (req: Request, res: Response) => {
    try {
      const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
      const [stats, funnel] = await Promise.all([
        storage.getAdminStats(),
        storage.getDiscoveryFunnelReport({ days, from: parseDate(req.query.from), to: parseDate(req.query.to), timezone: queryText(req.query.timezone) }),
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

  router.get("/operations/reservations", async (req: Request, res: Response) => {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    if ((req.query.from && !from) || (req.query.to && !to) || (from && to && to <= from)) {
      return res.status(400).json({ code: "INVALID_DATE_RANGE", message: "from and to must be valid ISO dates with to after from." });
    }
    try {
      const rows = await storage.getClassReservationReport({
        status: queryText(req.query.status),
        startDate: from,
        endDate: to,
      });
      res.json({
        source: "application_class_reservation_records",
        accountingNote: "These reservations are the records counted by the schedule report; they are not Stripe payment records.",
        rows,
      });
    } catch (error) {
      sendServerError(res, "Failed to load class reservations.", error);
    }
  });

  router.get("/operations/memberships", async (req: Request, res: Response) => {
    try {
      res.json(await getMembershipReport({
        page: parsePage(req.query.page, 1),
        limit: parseLimit(req.query.limit),
        status: queryText(req.query.status),
        billingState: queryText(req.query.billingState),
      }));
    } catch (error) {
      sendServerError(res, "Failed to load membership report.", error);
    }
  });

  router.get("/operations/payments.csv", async (req: Request, res: Response) => {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    if ((req.query.from && !from) || (req.query.to && !to) || (from && to && to <= from)) {
      return res.status(400).json({ code: "INVALID_DATE_RANGE", message: "from and to must be valid ISO dates with to after from." });
    }
    try {
      const report = await getPaymentReport({ from, to, status: queryText(req.query.status), page: 1, limit: 5000 });
      const header = ["record_type", "id", "member_id", "occurred_at", "amount_cents", "currency", "payment_status", "booking_status", "stripe_session_id", "fee_cents", "refund_status", "reconciliation_status"];
      const lines = report.rows.map((row) => csvLine([
        row.recordType,
        row.id,
        row.memberId,
        row.occurredAt?.toISOString(),
        row.amountCents,
        row.currency,
        row.paymentStatus,
        row.bookingStatus,
        row.stripeSessionId,
        row.feeCents,
        row.refundStatus,
        row.reconciliationStatus,
      ]));
      res.set({
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="ground-up-payments.csv"',
        "Cache-Control": "no-store",
      }).send(`\uFEFF${csvLine(header)}\n${lines.join("\n")}\n`);
    } catch (error) {
      sendServerError(res, "Failed to export payment report.", error);
    }
  });

  router.get("/operations/payments", async (req: Request, res: Response) => {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    if ((req.query.from && !from) || (req.query.to && !to) || (from && to && to <= from)) {
      return res.status(400).json({ code: "INVALID_DATE_RANGE", message: "from and to must be valid ISO dates with to after from." });
    }
    try {
      res.json(await getPaymentReport({
        from,
        to,
        status: queryText(req.query.status),
        page: parsePage(req.query.page, 1),
        limit: parseLimit(req.query.limit),
      }));
    } catch (error) {
      sendServerError(res, "Failed to load payment report.", error);
    }
  });

  router.get("/operations/reconciliation-health", async (_req: Request, res: Response) => {
    res.json({
      mode: stripeMode(),
      source: "process_memory",
      warning: "History resets when the process restarts; use this as current process health, not durable accounting history.",
      health: getStripeCheckoutReconciliationHealth(),
    });
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
    const requestedStatus = queryText(req.query.status);
    if (requestedStatus && !leadStatuses.includes(requestedStatus as typeof leadStatuses[number])) {
      return res.status(400).json({ code: "INVALID_LEAD_STATUS", message: "Invalid lead status." });
    }
    try {
      const leads = await storage.getTrialLeads(program === "training" ? undefined : program, {
        status: requestedStatus as typeof leadStatuses[number] | undefined,
      });
      if (program === "adaptive-capacity" && !ADAPTIVE_CAPACITY_ENABLED) {
        return res.json({ source: "application_database", rows: [], page: 1, limit: 20, total: 0, notice: "Adaptive Capacity is paused." });
      }
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
      res.json(await storage.getDiscoveryFunnelReport({ days, locale, from: parseDate(req.query.from), to: parseDate(req.query.to), timezone: queryText(req.query.timezone) }));
    } catch (error) {
      sendServerError(res, "Failed to load Discovery Pass funnel.", error);
    }
  });

  router.get("/marketing/discovery-ab", async (req: Request, res: Response) => {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    try {
      res.json(await storage.getDiscoveryAbReport({ days, from: parseDate(req.query.from), to: parseDate(req.query.to), timezone: queryText(req.query.timezone) }));
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
        from: parseDate(req.query.from),
        to: parseDate(req.query.to),
        timezone: queryText(req.query.timezone),
      }));
    } catch (error) {
      sendServerError(res, "Failed to load campaign report.", error);
    }
  });

  app.use(AI_API_PREFIX, router);
}