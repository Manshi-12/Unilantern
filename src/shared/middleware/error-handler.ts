import { Request, Response, NextFunction } from 'express'
import { AppError } from '../errors/app-error.js'

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {

  // ✅ Handles ALL custom errors (NotFound, Gone, etc.)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        request_id: `req_${Date.now()}`,
      },
    })
  }

  // ❌ fallback (unknown errors)
  console.error('Unhandled error:', err)

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong',
      request_id: `req_${Date.now()}`,
    },
  })
}

 