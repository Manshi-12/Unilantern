import type { Request, Response, NextFunction } from "express";
import { verifyJWT, requireRole, type AuthUser } from "./auth.js";

/**
 * authenticate.ts
 * Re-exports canonical auth middleware and provides compatibility aliases
 * for res.locals expected by DV-sourced modules (studentId, role, schoolId).
 */

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  // 1. Call the canonical verifyJWT middleware
  await verifyJWT(req, res, (err) => {
    if (err) return next(err);

    // 2. Populate compatibility fields in res.locals
    const user = res.locals.user as AuthUser;
    if (user) {
      res.locals.studentId = user.student_id;
      res.locals.role      = user.role;
      res.locals.schoolId  = user.school_id;
    }
    next();
  });
}

/** Alias: asserts that the authenticated user has the "student" role */
export const requireStudentRole = requireRole("student");
