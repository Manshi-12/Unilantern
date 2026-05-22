import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../../shared/response/success.js";
import { HttpStatus } from "../../../shared/response/http-status.js";
import { updateCollegeDataSharingSchema } from "./college-data-sharing.schema.js";
import type { CollegeDataSharingService } from "./college-data-sharing.service.js";

export class CollegeDataSharingController {
  constructor(private readonly service: CollegeDataSharingService) {}

  getPreference = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const result = await this.service.getCollegeDataSharing(studentId);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  updatePreference = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const dto = updateCollegeDataSharingSchema.parse(req.body);
      const studentId = res.locals.studentId as number;
      const result = await this.service.updatePreference(studentId, dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };
}
