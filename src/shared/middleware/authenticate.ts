import type { Request, Response, NextFunction } from "express";
import { verifyJWT, requireRole } from "./auth.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { AuthError } from "../errors/auth-error.js";
import { COOKIE_ACCESS } from "../../config/constants.js";

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT AUTH
//
// Reads a Bearer token from the Authorization header.
// Validates the token, queries the DB to confirm the student account is active,
// and sets res.locals.user / res.locals.studentId / res.locals.role / etc.
//
// Internally delegates to verifyJWT in auth.ts (which contains the full logic
// including the DB lookup). All existing student route files that call
// verifyJWT directly from auth.ts continue to work with zero changes.
// ─────────────────────────────────────────────────────────────────────────────

export async function authenticateStudent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await verifyJWT(req, res, (err) => {
    if (err) return next(err);
    next();
  });
}

/**
 * Legacy alias kept for any code that imports `authenticate` from this file.
 * Points to the student authenticator — student routes imported this before
 * the advisor module was added.
 */
export const authenticate = authenticateStudent;

/** Asserts that the authenticated user has the "student" role */
export const requireStudentRole = requireRole("student");

// ─────────────────────────────────────────────────────────────────────────────
// ADVISOR AUTH
//
// Reads the access token from an HttpOnly cookie (set by the advisor login
// endpoint). Decodes and verifies the JWT, then sets:
//   res.locals.advisorId  — numeric advisor ID (from token subject)
//   res.locals.role       — role string (e.g. "advisor")
//   res.locals.schoolId   — linked school ID or null
//
// Does NOT hit the database — the advisor token carries all needed claims.
// ─────────────────────────────────────────────────────────────────────────────

export interface AdvisorAuthLocals extends Record<string, unknown> {
  advisorId: number;
  role: string;
  schoolId: number | null;
}

export async function authenticateAdvisor(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.[COOKIE_ACCESS];

    if (!token) {
      return next(
        new AuthError("JWT_INVALID", "Authorization token missing"),
      );
    }

    const payload = await verifyAccessToken(token);

    if (!payload.sub) {
      return next(
        new AuthError("JWT_INVALID", "Token missing subject"),
      );
    }

    const advisorId = Number(payload.sub);

    if (!Number.isFinite(advisorId)) {
      return next(
        new AuthError("JWT_INVALID", "Invalid token subject"),
      );
    }

    res.locals.advisorId = advisorId;
    res.locals.role =
      typeof payload.role === "string" ? payload.role : "";
    res.locals.schoolId =
      typeof payload.school_id === "number" ? payload.school_id : null;

    next();
  } catch (err) {
    next(err);
  }
}