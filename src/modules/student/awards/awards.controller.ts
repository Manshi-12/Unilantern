import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../../shared/response/success.js";
import { HttpStatus } from "../../../shared/response/http-status.js";
import { createAwardSchema, updateAwardSchema } from "./awards.schema.js";
import type { AwardsService } from "./awards.service.js";

export class AwardsController {
  constructor(private readonly awardsService: AwardsService) {}

  // 5.1 GET /students/me/awards
  list = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const result = await this.awardsService.list(studentId);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // 5.2 POST /students/me/awards
  create = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const dto = createAwardSchema.parse(req.body);
      const result = await this.awardsService.create(studentId, dto);
      sendSuccess(res, result, HttpStatus.CREATED);
    } catch (err) {
      next(err);
    }
  };

  // 5.3 PUT /students/me/awards/:award_id
  update = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const awardId   = Number(req.params.award_id);
      const dto = updateAwardSchema.parse(req.body);
      const result = await this.awardsService.update(studentId, awardId, dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // 5.4 DELETE /students/me/awards/:award_id
  remove = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const awardId   = Number(req.params.award_id);
      await this.awardsService.remove(studentId, awardId);
      sendSuccess(res, { deleted: true }, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };
}
