import type { Request, Response, NextFunction, RequestHandler } from "express";
import { getRedis } from "./redis.js";
import { RateLimitError } from "../errors/rate-limit-error.js";

type IdentifierSource = "phone_number" | "ip";

export interface RateLimiterOptions {
  identifier?: IdentifierSource;
}

export function rateLimiter(
  action: string,
  limit: number,
  windowSeconds: number,
  options: RateLimiterOptions = {},
): RequestHandler {
  const identifierSource: IdentifierSource = options.identifier
    ?? (action.startsWith("otp_") ? "phone_number" : "ip");

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const identifier = resolveIdentifier(req, identifierSource);
      if (!identifier) {
        // Without an identifier, skip rate limiting (validation will catch missing fields).
        return next();
      }

      const key = `rate:${action}:${identifier}`;
      const redis = getRedis();

      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }

      const remaining = Math.max(0, limit - count);
      res.setHeader("X-RateLimit-Limit", String(limit));
      res.setHeader("X-RateLimit-Remaining", String(remaining));

      if (count > limit) {
        const ttl = await redis.ttl(key);
        if (ttl > 0) res.setHeader("Retry-After", String(ttl));
        throw new RateLimitError(
          `Rate limit exceeded for ${action}`,
          ttl > 0 ? ttl : undefined,
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
  return req.ip ?? req.socket.remoteAddress ?? null;
}
