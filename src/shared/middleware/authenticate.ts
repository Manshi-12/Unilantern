import type { Request, Response, NextFunction } from "express";
import { verifyJWT, requireRole } from "./auth.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { AuthError } from "../errors/auth-error.js";
import { COOKIE_ACCESS } from "../../config/constants.js";

/** Asserts that the authenticated user has the "student" role */
export const requireStudentRole = requireRole("student");

export interface AdvisorAuthLocals extends Record<string, unknown> {
  advisorId: number;
  role: string;
  schoolId: number | null;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    let token = "";
    const authorization = req.headers.authorization;
    if (authorization && authorization.startsWith("Bearer ")) {
      token = authorization.slice(7).trim();
    } else if (req.cookies && req.cookies[COOKIE_ACCESS]) {
      token = req.cookies[COOKIE_ACCESS];
    } else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      return next(new AuthError("JWT_INVALID", "Authorization token missing"));
    }

    const payload = await verifyAccessToken(token);

    if (payload.role === "student") {
      // Ensure verifyJWT finds the token even if it came from a cookie
      if (!authorization) {
        req.headers.authorization = `Bearer ${token}`;
      }
      verifyJWT(req, res, next);
      return;
    } else if (payload.role === "advisor") {
      if (!payload.sub) {
        return next(new AuthError("JWT_INVALID", "Token missing subject"));
      }

      const advisorId = Number(payload.sub);
      if (!Number.isFinite(advisorId)) {
        return next(new AuthError("JWT_INVALID", "Invalid token subject"));
      }

      res.locals.advisorId = advisorId;
      res.locals.role = payload.role;
      res.locals.schoolId =
        typeof payload.school_id === "number" ? payload.school_id : null;

      return next();
    } else {
      return next(new AuthError("JWT_INVALID", "Unrecognized role in token"));
    }
  } catch (err) {
    next(err);
  }
}