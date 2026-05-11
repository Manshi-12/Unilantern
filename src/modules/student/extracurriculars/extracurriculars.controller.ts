import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../../shared/response/success.js";
import { HttpStatus } from "../../../shared/response/http-status.js";
import {
  extracurricularCreateSchema,
  extracurricularUpdateSchema,
  extracurricularReorderSchema,
} from "./extracurriculars.schema.js";
import type { ExtracurricularsService } from "./extracurriculars.service.js";

export class ExtracurricularsController {
  constructor(private readonly extracurricularsService: ExtracurricularsService) {}

  listExtracurriculars = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.user as { student_id: number };
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
      const result = await this.extracurricularsService.getExtracurriculars(user.student_id, limit, cursor);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  getExtracurricular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.user as { student_id: number };
      const activityId = Number(req.params.activity_id);
      const result = await this.extracurricularsService.getExtracurricular(activityId, user.student_id);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  createExtracurricular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = extracurricularCreateSchema.parse(req.body);
      const user = res.locals.user as { student_id: number };
      const result = await this.extracurricularsService.createExtracurricular(user.student_id, dto);
      sendSuccess(res, result, HttpStatus.CREATED);
    } catch (err) {
      next(err);
    }
  };

  updateExtracurricular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = extracurricularUpdateSchema.parse(req.body);
      const user = res.locals.user as { student_id: number };
      const activityId = Number(req.params.activity_id);
      const result = await this.extracurricularsService.updateExtracurricular(activityId, user.student_id, dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  deleteExtracurricular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.user as { student_id: number };
      const activityId = Number(req.params.activity_id);
      await this.extracurricularsService.deleteExtracurricular(activityId, user.student_id);
      sendSuccess(res, { deleted: true }, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  reorderExtracurriculars = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = extracurricularReorderSchema.parse(req.body);
      const user = res.locals.user as { student_id: number };
      const result = await this.extracurricularsService.reorderExtracurriculars(user.student_id, dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };
}
