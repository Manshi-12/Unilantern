import type { NextFunction, Request, Response } from "express";
import { HttpStatus } from "../../shared/response/http-status.js";
import { sendSuccess } from "../../shared/response/success.js";
import { analyticsBatchSchema } from "./analytics.schema.js";
import type { AnalyticsService } from "./analytics.service.js";

export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  trackEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = analyticsBatchSchema.parse(req.body);
      const user = res.locals.user as { student_id: number; school_id: number | null };
      const result = await this.analyticsService.trackEvents(user.student_id, user.school_id, dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };
}
