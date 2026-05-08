import type { NextFunction, Request, Response } from "express";
import { HttpStatus } from "../../shared/response/http-status.js";
import { sendSuccess } from "../../shared/response/success.js";
import { linkSchoolSchema, mergeConfirmSchema, schoolSearchSchema } from "./school-linking.schema.js";
import type { SchoolLinkingService } from "./school-linking.service.js";

export class SchoolLinkingController {
  constructor(private readonly schoolLinkingService: SchoolLinkingService) {}

  searchSchools = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = schoolSearchSchema.parse(req.query);
      const result = await this.schoolLinkingService.searchSchools(dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };

  linkSchool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = linkSchoolSchema.parse(req.body);
      const user = res.locals.user as { student_id: number };
      const result = await this.schoolLinkingService.linkSchool(user.student_id, dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };

  confirmMerge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = mergeConfirmSchema.parse(req.body);
      const user = res.locals.user as { student_id: number };
      const result = await this.schoolLinkingService.confirmMerge(user.student_id, dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };

  getLinkedSchool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.user as { student_id: number };
      const result = await this.schoolLinkingService.getLinkedSchool(user.student_id);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };
}
