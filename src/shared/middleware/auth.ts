import type { Request, Response, NextFunction, RequestHandler } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { AuthError } from "../errors/auth-error.js";
import { AuthErrorCode } from "../response/error-codes.js";

export interface AuthUser {
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

    res.locals.user = {
      student_id: Number(sub),
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

export function auditLogger(action: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = res.locals.user as AuthUser | undefined;
    const studentId = user?.student_id ?? "anonymous";
    console.log(`[audit] action=${action} student_id=${studentId} path=${req.method} ${req.path}`);
    next();
  };
}

export const scoreRecalc: RequestHandler = (_req, _res, next) => {
  next();
};
