import { Request, Response, NextFunction } from 'express';

/**
 * AggregateOnly — §1.6 middleware table
 * Marks the request as aggregate-only. Enforced on all dashboard section routes.
 * Controllers/services must only read from pre-aggregated snapshot tables.
 * This middleware is a guard marker — it sets req.aggregateOnly = true
 * so any accidental raw-record query path can check and reject.
 *
 * ■ Raw student records are NEVER queried on dashboard section endpoints (§1.8).
 */
export const AggregateOnly = (req: Request, res: Response, next: NextFunction) => {
  (req as any).aggregateOnly = true;
  next();
};