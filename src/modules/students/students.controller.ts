import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../shared/response/success.js";
import { HttpStatus } from "../../shared/response/http-status.js";
import {
  profileUpdateSchema,
} from "./students.schema.js";
import type { StudentsService } from "./students.service.js";

export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.user as { student_id: number };
      const result = await this.studentsService.getProfile(user.student_id);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = profileUpdateSchema.parse(req.body);
      const user = res.locals.user as { student_id: number };
      const result = await this.studentsService.updateProfile(user.student_id, dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };
}
