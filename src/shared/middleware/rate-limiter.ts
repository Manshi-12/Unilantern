import type { Request, Response, NextFunction, RequestHandler } from "express";
import { RateLimitError } from "../errors/rate-limit-error.js";

type IdentifierSource = "phone_number" | "ip" | "user";

export interface RateLimiterOptions {
  identifier?: IdentifierSource;
}

export const RATE_LIMITER_STORAGE_MODE = "memory";

interface RateLimitEntry {
  count: number;
  expiresAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.expiresAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

/**
 * In-memory rate limit check + increment.
 * Returns: [count, ttlSeconds] where count is the new count and ttlSeconds is the remaining TTL
 */
function checkAndIncrementRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): [count: number, ttlSeconds: number] {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.expiresAt < now) {
    // New or expired entry
    const expiresAt = now + windowSeconds * 1000;
    rateLimitStore.set(key, { count: 1, expiresAt });
    return [1, windowSeconds];
  }

  // Existing valid entry
  entry.count += 1;
  const ttlSeconds = Math.ceil((entry.expiresAt - now) / 1000);
  return [entry.count, ttlSeconds];
}

export function rateLimiter(
  action: string,
  limit: number,
  windowSeconds: number,
  options: RateLimiterOptions = {},
): RequestHandler {
  const identifierSource: IdentifierSource = options.identifier
    ?? (action.startsWith("otp_") ? "phone_number" : "ip");

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const identifier = resolveIdentifier(req, identifierSource);
      if (!identifier) {
        return next();
      }

      const key = `rate:${action}:${identifier}`;

      // Check and increment rate limit
      const [count, ttl] = checkAndIncrementRateLimit(key, limit, windowSeconds);

      const remaining = Math.max(0, limit - count);
      res.setHeader("X-RateLimit-Limit", String(limit));
      res.setHeader("X-RateLimit-Remaining", String(remaining));

      if (count > limit) {
        const retryAfter = Math.ceil(ttl);
        if (retryAfter > 0) res.setHeader("Retry-After", String(retryAfter));
        throw new RateLimitError(
          `Rate limit exceeded for ${action}`,
          retryAfter > 0 ? retryAfter : undefined,
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

function resolveIdentifier(req: Request, source: IdentifierSource): string | null {
  if (source === "phone_number") {
    const body = req.body as { phone_number?: unknown } | undefined;
    if (body && typeof body.phone_number === "string" && body.phone_number.length > 0) {
      return body.phone_number.trim();
    }
    return null;
  }
  if (source === "user") {
    const user = (resLocals(req) as { user?: { user_id?: unknown; student_id?: unknown } }).user;
    if (typeof user?.user_id === "string") return user.user_id;
    if (typeof user?.student_id === "number") return String(user.student_id);

    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith("Bearer ")) return null;

    const tokenParts = authorization.slice(7).trim().split(".");
    if (tokenParts.length < 2) return null;

    try {
      const payload = JSON.parse(Buffer.from(tokenParts[1], "base64url").toString("utf8")) as { sub?: unknown };
      return typeof payload.sub === "string" && payload.sub.length > 0 ? payload.sub : null;
    } catch {
      return null;
    }
  }
  // Default: use IP address (handle X-Forwarded-For)
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded && typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip ?? req.socket.remoteAddress ?? null;
}

function resLocals(req: Request): unknown {
  return (req as any).locals ?? req.app.locals ?? {};
}
