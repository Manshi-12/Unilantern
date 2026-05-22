import type { Request, Response, NextFunction } from "express";
import { verifyJWT, requireRole } from "./auth.js";

/**
 * authenticate.ts
 * Re-exports canonical auth middleware and provides compatibility aliases
 * for res.locals expected by DV-sourced modules (studentId, role, schoolId).
 */

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  await verifyJWT(req, res, (err) => {
    if (err) return next(err);
    next();
  });
}

/** Alias: asserts that the authenticated user has the "student" role */
export const requireStudentRole = requireRole("student");
