import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../../shared/response/success.js";
import { HttpStatus } from "../../../shared/response/http-status.js";
import { getReadinessHistoryQuerySchema } from "./readiness.schema.js";
import type { ReadinessService } from "./readiness.service.js";

export class ReadinessController {
  constructor(private readonly readinessService: ReadinessService) {}

  // 8.1 GET /students/me/readiness
  get = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const result = await this.readinessService.getCurrentReadiness(studentId);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // 8.2 GET /students/me/readiness/history
  getHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const query = getReadinessHistoryQuerySchema.parse(req.query);
      const result = await this.readinessService.getReadinessHistory(
        studentId,
        query.limit,
        query.cursor
      );
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // 8.3 GET /students/me/readiness/improvement
  getImprovement = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const result = await this.readinessService.getImprovementRecommendations(studentId);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // 8.4 POST /students/me/readiness/recalculate
  recalculate = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const result = await this.readinessService.recalculateReadiness(studentId);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };
}
