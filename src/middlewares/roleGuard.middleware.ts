import { Request, Response, NextFunction } from 'express';

/**
 * RoleGuard — §1.6 middleware table
 * Ensures the JWT role exactly matches the required role.
 * Must run after verifyJWT (requires req.jwtPayload to be set).
 * Rejects all other roles with 403.
 */
export const RoleGuard = (requiredRole: string) => (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const payload = (req as any).jwtPayload;

  if (!payload || payload.role !== requiredRole) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: `Access denied. Required role: ${requiredRole}.`,
        request_id: (req as any).requestId,
        details: {},
      },
    });
  }

  next();
};
