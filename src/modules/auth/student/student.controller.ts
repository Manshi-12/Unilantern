import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../../shared/response/success.js";
import { HttpStatus } from "../../../shared/response/http-status.js";
import {
  registerInitSchema,
  registerVerifySchema,
  loginSendOtpSchema,
  loginVerifySchema,
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
}
