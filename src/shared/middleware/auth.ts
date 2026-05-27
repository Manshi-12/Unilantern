import type { Request, Response, NextFunction, RequestHandler } from "express";
import { authenticate } from "./authenticate.js";
import { AuthError } from "../errors/auth-error.js";
import { AuthErrorCode } from "../response/error-codes.js";
import { AuditRepository } from "../repository/audit.repository.js";

export interface AuthUser {
  user_id: string;
  student_id: number;
  role: string;
  school_id: number | null;
}

export const verifyJWT = authenticate;

export function requireRole(role: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = res.locals.user as AuthUser | undefined;
      if (!user || user.role !== role) {
        throw new AuthError(AuthErrorCode.FORBIDDEN, "Insufficient permissions", 403);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

const auditRepo = new AuditRepository();

function redact(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  const sensitiveKeys = ["otp_code"];
  const redacted = { ...obj };
  for (const key of Object.keys(redacted)) {
    if (sensitiveKeys.includes(key)) {
      redacted[key] = "[REDACTED]";
    } else if (typeof redacted[key] === "object") {
      redacted[key] = redact(redacted[key]);
    }
  }
  return redacted;
}

export function auditLogger(action: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = res.locals.user as AuthUser | undefined;

    if (!user) return next();

    // Fire and forget logging
    auditRepo.log({
      actor_id: user.student_id,
      actor_role: user.role,
      actor_school_id: user.school_id ?? null,
      action_type: action,
      target_resource: action === "account_deletion"
        ? `user:${user.user_id}`
        : `${req.method} ${req.path}`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
      metadata: {
        query: req.query,
        params: req.params,
        body: redact(req.body),
      }
    });

    next();
  };
}

export const scoreRecalc: RequestHandler = (_req, _res, next) => {
  next();
};
