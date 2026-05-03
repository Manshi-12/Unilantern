import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header("x-request-id");
  const id = incoming && incoming.length > 0 ? incoming : uuidv4();
  res.locals.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
