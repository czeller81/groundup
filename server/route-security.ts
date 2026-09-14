import type { Request, Response, NextFunction } from "express";
import { createHash } from "node:crypto";
import { lte, sql } from "drizzle-orm";
import { db } from "./db";
import { publicRateLimits } from "@shared/schema";

export function bookingBelongsToUser(booking: { userId: string | null } | undefined, userId: string | undefined) {
  return Boolean(booking && userId && booking.userId === userId);
}

export function coachCanManageMember(member: { assignedCoachId?: string | null } | undefined, coachId: string | undefined) {
  return Boolean(member && coachId && member.assignedCoachId === coachId);
}

export function isPublicOccurrenceText(title?: string | null, description?: string | null, location?: string | null) {
  return ![title, description, location].some((value) => value?.toLowerCase().includes("test"));
}

export const INTERNAL_TEST_EMAIL_PATTERN = "%@example.invalid";

export function isInternalTestEmail(email?: string | null) {
  return Boolean(email && email.toLowerCase().endsWith("@example.invalid"));
}

export function isOperationalAccount(user: { emailVerifiedAt?: Date | null; accountStatus?: string | null }) {
  return Boolean(
    user.emailVerifiedAt &&
    user.accountStatus !== "unverified" &&
    user.accountStatus !== "suspicious" &&
    user.accountStatus !== "needs_review" &&
    user.accountStatus !== "archived",
  );
}

export function accountCanUseMemberFeatures(user: { emailVerifiedAt?: Date | null; accountStatus?: string | null }) {
  return Boolean(
    isOperationalAccount(user),
  );
}

export function canRetryWebhook(status: string, lockedUntil: Date | null | undefined, now = new Date()) {
  if (status === "completed" || status === "failed_terminal") return false;
  if (status === "processing" && lockedUntil && lockedUntil > now) return false;
  return true;
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.userId) return res.status(401).json({ message: "Not authenticated" });
  next();
};

export const requireRole = (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.userId) return res.status(401).json({ message: "Not authenticated" });
  if (!roles.includes(req.session.userRole || "")) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }
  next();
};

export function createOriginProtection() {
  const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
  const webhookPaths = new Set(["/api/stripe/webhook", "/webhook/calendly"]);

  return (req: Request, res: Response, next: NextFunction) => {
    if (safeMethods.has(req.method) || webhookPaths.has(req.path) || !req.path.startsWith("/api/")) {
      return next();
    }

    const fetchSite = req.get("sec-fetch-site");
    if (fetchSite === "cross-site") {
      return res.status(403).json({ message: "Cross-site mutation blocked" });
    }

    const expectedOrigin = `${req.protocol}://${req.get("host")}`;
    const origin = req.get("origin");
    const referer = req.get("referer");

    if (origin && origin !== expectedOrigin) {
      return res.status(403).json({ message: "Invalid request origin" });
    }

    if (!origin && referer) {
      try {
        if (new URL(referer).origin !== expectedOrigin) {
          return res.status(403).json({ message: "Invalid request origin" });
        }
      } catch {
        return res.status(403).json({ message: "Invalid request origin" });
      }
    }

    next();
  };
}

export function hashClientSignal(value: string) {
  return createHash("sha256")
    .update(`${process.env.SESSION_SECRET || "ground-up-public-protection"}:${value}`)
    .digest("hex");
}

export function getRequestSignalHashes(req: Request) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const userAgent = req.get("user-agent") || "unknown";
  return {
    ipHash: hashClientSignal(ip),
    deviceHash: hashClientSignal(`${userAgent}|${req.get("accept-language") || ""}`),
  };
}

export function publicBotCheck(req: Request, minimumCompletionMs = 1500) {
  const honeypot = typeof req.body?.website === "string" ? req.body.website.trim() : "";
  const startedAt = Number(req.body?.formStartedAt);
  if (honeypot) return "honeypot";
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < minimumCompletionMs) return "completion_time";
  return null;
}

export type PublicRateLimitRule = {
  key: string;
  limit: number;
  windowMs: number;
  windowStart?: Date;
};

export type PublicRateLimitResult = {
  allowed: boolean;
  resetAt?: Date;
};

class PublicRateLimitExceeded extends Error {
  constructor(public resetAt: Date) {
    super("Public rate limit exceeded");
    this.name = "PublicRateLimitExceeded";
  }
}

function durablePublicRateLimitKey(key: string) {
  return hashClientSignal(`public-rate-limit:${key}`);
}

/**
 * Atomically consumes one or more public rate-limit counters.
 *
 * The counter key is hashed before it reaches the database. The transaction
 * lets callers reserve several related limits (such as signup IP and device)
 * without allowing a partial reservation when one of them is already full.
 */
export async function consumePublicRateLimits(rules: PublicRateLimitRule[], now = new Date()): Promise<PublicRateLimitResult> {
  if (!rules.length) return { allowed: true };
  if (rules.some((rule) => rule.limit < 1 || rule.windowMs < 1)) {
    throw new Error("Public rate limit rules must have positive limits and windows");
  }

  try {
    return await db.transaction(async (tx) => {
      await tx.delete(publicRateLimits).where(lte(publicRateLimits.resetAt, now));

      for (const rule of rules) {
        const resetAt = new Date((rule.windowStart || now).getTime() + rule.windowMs);
        const [counter] = await tx.insert(publicRateLimits).values({
          key: durablePublicRateLimitKey(rule.key),
          count: 1,
          resetAt,
          updatedAt: now,
        }).onConflictDoUpdate({
          target: publicRateLimits.key,
          set: {
            count: sql<number>`CASE WHEN ${publicRateLimits.resetAt} <= ${now} THEN 1 ELSE ${publicRateLimits.count} + 1 END`,
            resetAt: sql<Date>`CASE WHEN ${publicRateLimits.resetAt} <= ${now} THEN ${resetAt} ELSE ${publicRateLimits.resetAt} END`,
            updatedAt: now,
          },
        }).returning({
          count: publicRateLimits.count,
          resetAt: publicRateLimits.resetAt,
        });

        if (!counter) throw new Error("Public rate limit counter was not returned");
        if (counter.count > rule.limit) {
          throw new PublicRateLimitExceeded(counter.resetAt);
        }
      }

      return { allowed: true } satisfies PublicRateLimitResult;
    });
  } catch (error) {
    if (error instanceof PublicRateLimitExceeded) {
      return { allowed: false, resetAt: error.resetAt };
    }
    throw error;
  }
}

export function createPublicRateLimit(
  limit = 12,
  windowMs = 60 * 60 * 1000,
  keyExtractor: (req: Request) => string = (req) => req.ip || req.socket.remoteAddress || "unknown",
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const extractedKey = keyExtractor(req);
      const result = await consumePublicRateLimits([{
        key: `${req.path}:${extractedKey}`,
        limit,
        windowMs,
      }]);
      if (!result.allowed) {
        const retryAfter = Math.max(1, Math.ceil(((result.resetAt?.getTime() || Date.now()) - Date.now()) / 1000));
        res.set("Retry-After", String(retryAfter));
        return res.status(429).json({ message: "Too many requests. Please try again later." });
      }
      return next();
    } catch (error) {
      console.error("Public rate limiter unavailable:", error instanceof Error ? error.message : error);
      return res.status(503).json({ message: "This request could not be processed. Please try again later." });
    }
  };
}

const scannerPathPatterns = [
  /\.php(?:$|\/)/i,
  /(?:^|\/)wp-admin(?:\/|$)/i,
  /(?:^|\/)wp-login\.php(?:$|\/)/i,
  /(?:^|\/)xmlrpc\.php(?:$|\/)/i,
  /(?:^|\/)\.env(?:$|\/)/i,
  /(?:^|\/)\.git(?:\/|$)/i,
  /(?:^|\/)phpmyadmin(?:\/|$)/i,
  /(?:^|\/)vendor\/phpunit(?:\/|$)/i,
];

export function isScannerProbePath(url: string) {
  let decoded = url;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    // A malformed encoded path is suspicious and should not reach the SPA.
    return true;
  }
  return scannerPathPatterns.some((pattern) => pattern.test(decoded)) || /(?:^|\/)\.\.(?:\/|$)/.test(decoded);
}

export function createScannerProbeGuard(limit = 30, windowMs = 10 * 60 * 1000) {
  const requestCounts = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    if (!isScannerProbePath(req.originalUrl)) return next();

    const key = req.ip || "unknown";
    const now = Date.now();
    if (requestCounts.size > 5000) {
      requestCounts.forEach((entry, storedKey) => {
        if (entry.resetAt <= now) requestCounts.delete(storedKey);
      });
    }
    const current = requestCounts.get(key);
    if (current && current.resetAt > now && current.count >= limit) {
      res.set("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
      return res.status(429).type("text").send("Too many requests");
    }
    if (!current || current.resetAt <= now) {
      requestCounts.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      current.count++;
    }
    return res.status(404).type("text").send("Not found");
  };
}