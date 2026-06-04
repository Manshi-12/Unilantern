import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ParsedQs } from 'qs';

export const validate = (schema: z.ZodType, source: 'body' | 'query' | 'params' = 'body') => (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const data = source === 'query' ? req.query
             : source === 'params' ? req.params
             : req.body;

  const result = schema.safeParse(data);

  if (!result.success) {
    const details: Record<string, string> = {};
    const error = result.error as ZodError;

    error.issues.forEach((e) => {
      details[e.path.join('.')] = e.message;
    });

    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        request_id: (req as any).requestId,
        details,
      },
    });
  }

  if (source === 'query') {
    Object.assign(req.query, result.data);
  }
  else if (source === 'params') {
    req.params = result.data as Record<string, string>;
  }
  else {
    req.body = result.data;
  }
 

  next();
};