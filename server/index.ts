import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createOriginProtection, createScannerProbeGuard } from "./route-security";
import { applySecurityHeaders } from "./security-headers";
import { createRequire } from "module";
import { storage } from "./storage";
import Stripe from "stripe";
import {
  PENDING_CHECKOUT_RECONCILIATION_LIMIT,
  recordStripeCheckoutReconciliationFailure,
  recordStripeCheckoutReconciliationPass,
  reconcileStalePendingStripeCheckouts,
  withStripeCheckoutReconciliationLease,
} from "./membership-billing";

const MemStore = MemoryStore(session);
const require = createRequire(import.meta.url);
const PgSession = require("connect-pg-simple")(session);
const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const STRIPE_CHECKOUT_RECONCILIATION_INTERVAL_MS = 15 * 60 * 1000;

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((req, res, next) => {
  if (
    process.env.NODE_ENV === "production" &&
    req.hostname === "groundupbjj.com" &&
    !req.path.startsWith("/api/") &&
    !req.path.startsWith("/webhook/")
  ) {
    return res.redirect(301, `https://www.groundupbjj.com${req.originalUrl}`);
  }
  next();
});
app.use(applySecurityHeaders);
app.use(createScannerProbeGuard());
app.use((req, res, next) => {
  if (req.path === "/api/stripe/webhook" || req.path === "/webhook/calendly") return next();
  return express.json({ limit: "32kb", strict: true })(req, res, next);
});
app.use(express.urlencoded({ extended: false, limit: "16kb" }));

app.use(session({
  secret: process.env.SESSION_SECRET || (() => {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set in production");
    }
    return "development-only-session-secret";
  })(),
  resave: false,
  saveUninitialized: false,
  store: process.env.NODE_ENV === "production" && databaseUrl
    ? new PgSession({ conString: databaseUrl, tableName: "user_sessions", createTableIfMissing: true })
    : new MemStore({ checkPeriod: 86400000 }),
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: "lax"
  }
}));
app.use(createOriginProtection());

function startStripeCheckoutMaintenance() {
  if (!process.env.STRIPE_SECRET_KEY) return;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-08-27.basil",
  });
  let running = false;

  const reconcile = async () => {
    if (running) {
      log("Stripe checkout reconciliation skipped because the previous pass is still running.");
      return;
    }
    running = true;
    try {
      const summary = await withStripeCheckoutReconciliationLease(() =>
        reconcileStalePendingStripeCheckouts(stripe, {
          limit: PENDING_CHECKOUT_RECONCILIATION_LIMIT,
        }),
      );
      if (!summary) {
        log("Stripe checkout reconciliation skipped because another instance owns the lease.");
        return;
      }
      recordStripeCheckoutReconciliationPass(summary);
      log([
        "Stripe checkout reconciliation completed",
        `scanned=${summary.scanned}`,
        `completed=${summary.completed}`,
        `expired=${summary.expired}`,
        `missing=${summary.missing}`,
        `apiFailures=${summary.apiFailures}`,
        `processingFailures=${summary.processingFailures}`,
      ].join(" "));
    } catch (error) {
      // Maintenance must never prevent the app from serving traffic. A failed
      // pass remains retryable on the next interval.
      recordStripeCheckoutReconciliationFailure();
      console.error("Stripe checkout reconciliation failed:", error);
    } finally {
      running = false;
    }
  };

  void reconcile();
  const timer = setInterval(() => {
    void reconcile();
  }, STRIPE_CHECKOUT_RECONCILIATION_INTERVAL_MS);
  timer.unref();
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = status >= 500
      ? "Internal Server Error"
      : status === 413
        ? "Request body too large"
        : "Invalid request";

    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    startStripeCheckoutMaintenance();
  });

  // Do not delay the HTTP listener for this non-critical maintenance sync.
  // Autoscale promotion probes the app while it is starting, and the admin
  // password can be synchronized safely after the service is accepting traffic.
  if (process.env.DEMO_ADMIN_PASSWORD) {
    void storage.ensureAdminPassword(
      "admin@groundupbjj.com",
      process.env.DEMO_ADMIN_PASSWORD
    ).then((synchronized) => {
      if (synchronized) {
        log("Demo admin password synchronized from secure configuration.");
      } else {
        console.warn("Demo admin password sync skipped: admin account was not found.");
      }
    }).catch((error) => {
      console.error("Demo admin password sync failed:", error);
    });
  }
})();
