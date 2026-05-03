import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../../shared/response/success.js";
import { HttpStatus } from "../../../shared/response/http-status.js";
import {
  loginSchema,
  registerSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from "./student.schema.js";
import type { StudentService } from "./student.service.js";

export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  sendOtp = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const dto = sendOtpSchema.parse(req.body);
      const result = await this.studentService.sendOtp(dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  verifyOtp = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const dto = verifyOtpSchema.parse(req.body);
      const result = await this.studentService.verifyOtp(dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  register = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const dto = registerSchema.parse(req.body);
      const result = await this.studentService.register(dto);
      sendSuccess(res, result, HttpStatus.CREATED);
    } catch (err) {
      next(err);
    }
  };

  login = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const dto = loginSchema.parse(req.body);
      const result = await this.studentService.login(dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };
}
