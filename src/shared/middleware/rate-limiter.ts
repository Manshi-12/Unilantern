import type { Request, Response, NextFunction, RequestHandler } from "express";
import { RateLimitError } from "../errors/rate-limit-error.js";

type IdentifierSource = "phone_number" | "ip" | "user";

export interface RateLimiterOptions {
  identifier?: IdentifierSource;
}

interface RateEntry {
  count: number;
  expiresAt: number;
}

const store = new Map<string, RateEntry>();

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
      const now = Date.now();
      const entry = store.get(key);

      let count: number;
      let expiresAt: number;

      if (!entry || now >= entry.expiresAt) {
        count = 1;
        expiresAt = now + windowSeconds * 1000;
        store.set(key, { count, expiresAt });
      } else {
        entry.count += 1;
        count = entry.count;
        expiresAt = entry.expiresAt;
      }

      const remaining = Math.max(0, limit - count);
      res.setHeader("X-RateLimit-Limit", String(limit));
      res.setHeader("X-RateLimit-Remaining", String(remaining));

      if (count > limit) {
        const ttl = Math.ceil((expiresAt - now) / 1000);
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
  return req.ip ?? req.socket.remoteAddress ?? null;
}

function resLocals(req: Request): Record<string, unknown> {
  return (req as Request & { res?: Response }).res?.locals ?? {};
}
