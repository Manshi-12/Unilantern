import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../../shared/response/success.js";
import { HttpStatus } from "../../../shared/response/http-status.js";
import {
  registerPushTokenSchema,
  deregisterPushTokenSchema,
} from "./push-tokens.schema.js";
import type { PushTokensService } from "./push-tokens.service.js";

export class PushTokensController {
  constructor(private readonly service: PushTokensService) {}

  // ── POST /students/me/push-token — Register ────────────────────────────
  registerToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = registerPushTokenSchema.parse(req.body);
      const studentId = res.locals.studentId as number;
      const result = await this.service.registerToken(studentId, dto);
      sendSuccess(res, result, HttpStatus.CREATED);
    } catch (err) {
      next(err);
    }
  };

  // ── DELETE /students/me/push-token — Deregister ────────────────────────
  deregisterToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = deregisterPushTokenSchema.parse(req.body);
      const studentId = res.locals.studentId as number;
      const result = await this.service.deregisterToken(studentId, dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };
}
