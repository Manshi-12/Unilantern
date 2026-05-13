import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../../shared/response/success.js";
import { HttpStatus } from "../../../shared/response/http-status.js";
import { updateAcademicsSchema } from "./academics.schema.js";
import type { AcademicsService } from "./academics.service.js";

export class AcademicsController {
  constructor(private readonly academicsService: AcademicsService) {}

  // 3.1 GET /students/me/academics
  get = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const result = await this.academicsService.get(studentId);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // 3.2 PUT /students/me/academics
  update = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const dto = updateAcademicsSchema.parse(req.body);
      const result = await this.academicsService.update(studentId, dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };
}
