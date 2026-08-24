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
    const current = requestCounts.get(key);
    if (!current || current.resetAt <= now) {
      requestCounts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (current.count >= limit) {
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }
    current.count++;
    next();
  };
}