import type { Request, Response, NextFunction } from "express";

export function applySecurityHeaders(req: Request, res: Response, next: NextFunction) {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "X-Frame-Options": "SAMEORIGIN",
  });

  if (process.env.NODE_ENV === "production") {
    res.set({
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' https://connect.facebook.net https://js.stripe.com",
        "connect-src 'self' https://connect.facebook.net https://www.facebook.com https://api.stripe.com https://r.stripe.com wss://*.replit.dev",
        "img-src 'self' data: blob: https://www.facebook.com https://*.fbcdn.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
        "media-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
      ].join("; "),
    });
  }

  if (req.path.startsWith("/api/") || req.path.startsWith("/portal/") || req.path === "/admin") {
    res.set("Cache-Control", "no-store");
  }
  next();
}