/**
 * Logging middleware for Express
 * Logs all incoming requests and outgoing responses with timing
 */

import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

interface RequestWithStartTime extends Request {
  _startTime?: number;
  id?: string;
}

export function requestLogger(req: RequestWithStartTime, res: Response, next: NextFunction): void {
  // Record start time
  req._startTime = Date.now();
  req.id = (req.headers["x-request-id"] as string) || "no-id";

  // Log incoming request
  const body = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : "";
  const bodyLog = body ? ` | Body: ${body.substring(0, 100)}${body.length > 100 ? "..." : ""}` : "";
  logger.info(`→ Incoming request${bodyLog}`, {
    requestId: req.id,
    method: req.method,
    path: req.path,
  });

  // Log response only once when it's finished
  res.on("finish", () => {
    const duration = Date.now() - (req._startTime || 0);
    logger.http("Response sent", req.method, req.path, res.statusCode, duration, req.id);

    // Log response details for errors
    if (res.statusCode >= 400) {
      logger.warning(`← Response error (${res.statusCode})`, {
        requestId: req.id,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
      });
    }
  });

  next();
}
