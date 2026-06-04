import { Request, Response, NextFunction } from 'express';

/**
 * SchoolScope — §1.6 middleware table
 * Injects school_id from the verified JWT payload into req.schoolId.
 * All data queries must use this value — never trust school_id from request body/params.
 * Prevents cross-school data leakage.
 * Must run after verifyJWT.
 */
export const SchoolScope = (req: Request, res: Response, next: NextFunction) => {
  const payload = (req as any).jwtPayload;

  if (!payload || !payload.school_id) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'School scope could not be determined from token.',
        request_id: (req as any).requestId,
        details: {},
      },
    });
  }

  // Already on jwtPayload — confirm it's set correctly for downstream use
  (req as any).schoolId = payload.school_id;
  next();
};