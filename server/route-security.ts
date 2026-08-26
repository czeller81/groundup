import type { Request, Response, NextFunction } from "express";

export function bookingBelongsToUser(booking: { userId: string | null } | undefined, userId: string | undefined) {
  return Boolean(booking && userId && booking.userId === userId);
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