import type { Request, Response, NextFunction } from "express";
import { requireRole } from "./auth.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { AuthError } from "../errors/auth-error.js";
import { AuthErrorCode } from "../response/error-codes.js";
import { COOKIE_ACCESS } from "../../config/constants.js";
import { sql, getPool } from "../../db/client.js";
import { STUDENTS_TABLE } from "../../db/schema/students.js";

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
      return next(new AuthError(AuthErrorCode.TOKEN_INVALID, "Authorization token missing", 401));
    }

    const payload = await verifyAccessToken(token);
    const sub = typeof payload.sub === "string" ? payload.sub : undefined;
    const role = typeof payload.role === "string" ? payload.role : undefined;
    const school_id = payload.school_id == null ? null : Number(payload.school_id);

    if (!sub || !role || Number.isNaN(Number(sub)) || (school_id !== null && Number.isNaN(school_id))) {
      return next(new AuthError(AuthErrorCode.TOKEN_INVALID, "Malformed access token", 401));
    }

    if (role === "student") {
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
        return next(
          new AuthError(
            AuthErrorCode.ACCOUNT_DELETED,
            "This account has been deleted.",
            401,
          ),
        );
      }

      res.locals.user = {
        user_id: sub,
        student_id: studentId,
        role,
        school_id,
      };
      res.locals.userId = sub;
      res.locals.studentId = studentId;
      res.locals.role = role;
      res.locals.schoolId = school_id;

      return next();
    } else if (role === "advisor") {
      const advisorId = Number(sub);
      if (!Number.isFinite(advisorId)) {
        return next(new AuthError(AuthErrorCode.TOKEN_INVALID, "Invalid token subject", 401));
      }

      res.locals.advisorId = advisorId;
      res.locals.role = role;
      res.locals.schoolId = school_id;

      return next();
    } else {
      return next(new AuthError(AuthErrorCode.TOKEN_INVALID, "Unrecognized role in token", 401));
    }
  } catch (err) {
    next(err);
  }
}