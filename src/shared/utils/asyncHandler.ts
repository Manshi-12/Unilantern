import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * asyncHandler — wraps an async Express handler so that any rejected
 * promise is forwarded to next(err) instead of causing an unhandled rejection.
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
