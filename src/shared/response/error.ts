import { v4 as uuidv4 } from "uuid";
import type { Response } from "express";

export interface ApiErrorShape {
  success: false;
  request_id: string;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  status: number,
  details?: Record<string, string[]>,
): void {
  const body: ApiErrorShape = {
    success: false,
    request_id:
      typeof res.locals.requestId === "string"
        ? res.locals.requestId
        : uuidv4(),
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
  res.status(status).json(body);
}
