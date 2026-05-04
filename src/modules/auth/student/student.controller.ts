import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../../shared/response/success.js";
import { HttpStatus } from "../../../shared/response/http-status.js";
import {
  registerInitSchema,
  registerVerifySchema,
  loginSendOtpSchema,
  loginVerifySchema,
  profileUpdateSchema,
  extracurricularCreateSchema,
  extracurricularUpdateSchema,
  extracurricularReorderSchema,
} from "./student.schema.js";
import type { StudentService } from "./student.service.js";

export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  registerInit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = registerInitSchema.parse(req.body);
      const result = await this.studentService.registerInit(dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  registerVerify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = registerVerifySchema.parse(req.body);
      const result = await this.studentService.registerVerify(dto);
      sendSuccess(res, result, HttpStatus.CREATED);
    } catch (err) {
      next(err);
    }
  };

  loginSendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = loginSendOtpSchema.parse(req.body);
      const result = await this.studentService.loginSendOtp(dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  loginVerify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = loginVerifySchema.parse(req.body);
      const result = await this.studentService.loginVerify(dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.user as { student_id: number };
      const result = await this.studentService.getProfile(user.student_id);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = profileUpdateSchema.parse(req.body);
      const user = res.locals.user as { student_id: number };
      const result = await this.studentService.updateProfile(user.student_id, dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // ── EXTRACURRICULAR ACTIVITIES ──────────────────────────────────────────

  listExtracurriculars = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.user as { student_id: number };
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
      const result = await this.studentService.getExtracurriculars(user.student_id, limit, cursor);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  getExtracurricular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.user as { student_id: number };
      const activityId = Number(req.params.activity_id);
      const result = await this.studentService.getExtracurricular(activityId, user.student_id);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  createExtracurricular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = extracurricularCreateSchema.parse(req.body);
      const user = res.locals.user as { student_id: number };
      const result = await this.studentService.createExtracurricular(user.student_id, dto);
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
      const result = await this.studentService.updateExtracurricular(activityId, user.student_id, dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  deleteExtracurricular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.user as { student_id: number };
      const activityId = Number(req.params.activity_id);
      await this.studentService.deleteExtracurricular(activityId, user.student_id);
      sendSuccess(res, { deleted: true }, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  reorderExtracurriculars = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = extracurricularReorderSchema.parse(req.body);
      const user = res.locals.user as { student_id: number };
      const result = await this.studentService.reorderExtracurriculars(user.student_id, dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };
}
