import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../../shared/response/success.js";
import { HttpStatus } from "../../../shared/response/http-status.js";
import {
  saveContentSchema,
  advanceStatusSchema,
  confirmReviewerSchema,
  finalizeSchema,
} from "./essay.schema.js";
import type { EssayService } from "./essay.service.js";

export class EssayController {
  constructor(private readonly essayService: EssayService) {}

  // 7.1 GET /students/me/essay
  getState = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const result = await this.essayService.getState(studentId);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // 7.2 PUT /students/me/essay/content
  saveContent = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const dto = saveContentSchema.parse(req.body);
      const result = await this.essayService.saveContent(studentId, dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // 7.3 POST /students/me/essay/status/advance
  advanceStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const dto = advanceStatusSchema.parse(req.body);
      const result = await this.essayService.advanceStatus(studentId, dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // 7.4 POST /students/me/essay/reviewer-confirm
  confirmReviewer = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const dto = confirmReviewerSchema.parse(req.body);
      const result = await this.essayService.confirmReviewer(studentId, dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // 7.5 POST /students/me/essay/finalize
  finalizeEssay = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const dto = finalizeSchema.parse(req.body);
      // confirmation=true is validated by schema; proceed to service
      void dto;
      const result = await this.essayService.finalizeEssay(studentId);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };
}
