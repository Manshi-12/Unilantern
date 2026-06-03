import type { NextFunction, Request, Response } from "express";
import { HttpStatus } from "../../../shared/response/http-status.js";
import { sendSuccess } from "../../../shared/response/success.js";
import { saveScholarshipSchema, scholarshipsListQuerySchema } from "./scholarships.schema.js";
import type { ScholarshipsService } from "./scholarships.service.js";

export class ScholarshipsController {
  constructor(private readonly scholarshipsService: ScholarshipsService) {}

  listScholarships = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.user as { student_id: number };
      const query = scholarshipsListQuerySchema.parse(req.query);
      sendSuccess(res, await this.scholarshipsService.list(user.student_id, query), HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };

  getScholarship = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.user as { student_id: number };
      const scholarshipId = Number(req.params.scholarship_id);
      sendSuccess(res, await this.scholarshipsService.getDetail(user.student_id, scholarshipId), HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };

  listSavedScholarships = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.user as { student_id: number };
      sendSuccess(res, await this.scholarshipsService.listSaved(user.student_id), HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };

  listFlaggedScholarships = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.user as { student_id: number };
      sendSuccess(res, await this.scholarshipsService.listFlagged(user.student_id), HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };

  saveScholarship = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.user as { student_id: number };
      const dto = saveScholarshipSchema.parse(req.body);
      sendSuccess(res, await this.scholarshipsService.save(user.student_id, dto), HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  };

  unsaveScholarship = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.user as { student_id: number };
      const savedId = Number(req.params.saved_id);
      sendSuccess(res, await this.scholarshipsService.unsave(user.student_id, savedId), HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };
}
