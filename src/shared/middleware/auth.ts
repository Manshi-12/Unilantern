import type { Request, Response, NextFunction, RequestHandler } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { AuthError } from "../errors/auth-error.js";
import { AuthErrorCode } from "../response/error-codes.js";
import { AuditRepository } from "../repository/audit.repository.js";
import { sql, getPool } from "../../db/client.js";
import { STUDENTS_TABLE } from "../../db/schema/students.js";

export interface AuthUser {
  user_id: string;
  student_id: number;
  role: string;
  school_id: number | null;
}

export async function verifyJWT(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith("Bearer ")) {
      throw new AuthError(AuthErrorCode.TOKEN_INVALID, "Missing or malformed Authorization header", 401);
    }

    const token = authorization.slice(7).trim();
    if (!token) {
      throw new AuthError(AuthErrorCode.TOKEN_INVALID, "Missing access token", 401);
    }

    const payload = await verifyAccessToken(token);
    const sub = typeof payload.sub === "string" ? payload.sub : undefined;
    const role = typeof payload.role === "string" ? payload.role : undefined;
    const school_id = payload.school_id == null ? null : Number(payload.school_id);

    if (!sub || !role || Number.isNaN(Number(sub)) || (school_id !== null && Number.isNaN(school_id))) {
      throw new AuthError(AuthErrorCode.TOKEN_INVALID, "Malformed access token", 401);
    }

    const studentId = Number(sub);
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<{ student_id: number; is_active: boolean }>(
        `SELECT TOP 1 student_id, is_active
           FROM ${STUDENTS_TABLE}
          WHERE student_id = @student_id;`,
      );

    const row = result.recordset[0];
    if (!row || !row.is_active) {
      throw new AuthError(
        AuthErrorCode.ACCOUNT_DELETED,
        "This account has been deleted.",
        401,
      );
    }

    res.locals.user = {
      user_id: sub,
      student_id: studentId,
      role,
      school_id,
    };

    next();
  } catch (error) {
    next(error);
  }
}

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
