import { Response } from 'express';

/**
 * ApiResponse — standard success envelope.
 * Wraps data in a consistent shape and sets the HTTP status code.
 */
export class ApiResponse {
  static success(res: Response, data: unknown, statusCode = 200): void {
    res.status(statusCode).json(data);
  }
}
