import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../../shared/response/success.js";
import { HttpStatus } from "../../../shared/response/http-status.js";
import {
  sendOtpSchema,
  verifyOtpSchema,
  validateInviteTokenSchema,
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
} from "./student.schema.js";
import type { StudentService } from "./student.service.js";

export class StudentController {
  constructor(private readonly studentService: StudentService) {}
  
  // 1.1 POST /otp/send
  sendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = sendOtpSchema.parse(req.body);
      const result = await this.studentService.sendOtp(dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // 1.2 POST /otp/verify
  verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = verifyOtpSchema.parse(req.body);
      const result = await this.studentService.verifyOtp(dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // 1.3 POST /invite/validate
  validateInviteToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = validateInviteTokenSchema.parse(req.body);
      const result = await this.studentService.validateInviteToken(dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // 1.4 POST /signup
  signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = signupSchema.parse(req.body);
      const result = await this.studentService.signup(dto);
      sendSuccess(res, result, HttpStatus.CREATED);
    } catch (err) {
      next(err);
    }
  };

  // 1.5 POST /login
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = loginSchema.parse(req.body);
      const result = await this.studentService.login(dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // 1.6 POST /token/refresh
  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = refreshTokenSchema.parse(req.body);
      const result = await this.studentService.refreshToken(dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // 1.7 DELETE /logout
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = logoutSchema.parse(req.body);
      const studentId = res.locals.studentId as number;
      const result = await this.studentService.logout(dto, studentId);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // 1.8 GET /me
  getMe = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const result = await this.studentService.getMe(studentId);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };
}
