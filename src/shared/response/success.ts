import { v4 as uuidv4 } from "uuid";
import type { Response } from "express";

export interface ApiSuccessShape<T> {
  success: true;
  request_id: string;
  data: T;
  meta?: Record<string, unknown>;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  status = 200,
  meta?: Record<string, unknown>,
): void {
  const body: ApiSuccessShape<T> = {
    success: true,
    request_id:
      typeof res.locals.requestId === "string"
        ? res.locals.requestId
        : uuidv4(),
    data,
    ...(meta ? { meta } : {}),
  };
  res.status(status).json(body);
}
