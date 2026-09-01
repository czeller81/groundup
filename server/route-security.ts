import type { Request, Response, NextFunction } from "express";

export function bookingBelongsToUser(booking: { userId: string | null } | undefined, userId: string | undefined) {
  return Boolean(booking && userId && booking.userId === userId);
}

export function coachCanManageMember(member: { assignedCoachId?: string | null } | undefined, coachId: string | undefined) {
  return Boolean(member && coachId && member.assignedCoachId === coachId);
}

export function isPublicOccurrenceText(title?: string | null, description?: string | null, location?: string | null) {
  return ![title, description, location].some((value) => value?.toLowerCase().includes("test"));
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

export function createPublicRateLimit(limit = 12, windowMs = 60 * 60 * 1000) {
  const requestCounts = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    if (requestCounts.size > 5000) {
      requestCounts.forEach((entry, storedKey) => {
        if (entry.resetAt <= now) requestCounts.delete(storedKey);
      });
    }
    const current = requestCounts.get(key);
    if (!current || current.resetAt <= now) {
      requestCounts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (current.count >= limit) {
      res.set("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }
    current.count++;
    next();
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