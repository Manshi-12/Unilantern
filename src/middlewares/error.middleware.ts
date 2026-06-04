import { Request, Response, NextFunction } from 'express';

export const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction): void => {
  const status = err.statusCode || 500;
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred',
      request_id: req.headers['x-request-id'] || null,
      details: err.details || {}
    }
  });
};
