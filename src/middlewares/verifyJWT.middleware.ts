import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getPool, sql } from '../database/db'; // adjust path if needed

/**
 * verifyJWT — §1.2
 * Reads the access_token from the HTTP-only cookie (never from Authorization header).
 * Verifies JWT signature, then checks session is not invalidated in DB.
 * On success, attaches decoded payload to req.jwtPayload.
 * On failure, returns 401 with standard error format.
 */
export const verifyJWT = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.access_token;
  const JWT_SECRET = process.env.JWT_SECRET!;

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'TOKEN_INVALID',
        message: 'Access token cookie is missing.',
        request_id: (req as any).requestId,
        details: {},
      },
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      role: string;
      school_id: number;
      registration_status: string;
      session_id: number;
      iat: number;
      exp: number;
    };

    // ── Session DB check ──────────────────────────────────────────────────────
    // Even if JWT is valid, reject if session has been revoked in DB
    if (payload.session_id) {
      const pool = await getPool();
      const result = await pool
        .request()
        .input('sessionId', sql.Int, payload.session_id)
        .query(`
          SELECT invalidated_at
          FROM   admin_sessions
          WHERE  session_id = @sessionId
        `);

      const session = result.recordset[0];

      if (!session || session.invalidated_at !== null) {
        return res.status(401).json({
          error: {
            code: 'SESSION_REVOKED',
            message: 'Session has been revoked. Please log in again.',
            request_id: (req as any).requestId,
            details: {},
          },
        });
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    (req as any).jwtPayload = {
      adminId:             Number(payload.sub),
      role:                payload.role,
      school_id:           payload.school_id,
      registration_status: payload.registration_status,
      sessionId:           payload.session_id ?? null,
    };

    next();
  } catch (err: any) {
    console.log('JWT ERROR:', err.message);
    return res.status(401).json({
      error: {
        code: 'TOKEN_INVALID',
        message: 'Access token is expired or malformed.',
        request_id: (req as any).requestId,
        details: {},
      },
    });
  }
};