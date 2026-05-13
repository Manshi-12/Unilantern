import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../../shared/response/success.js";
import { HttpStatus } from "../../../shared/response/http-status.js";
import {
  initiateDeletionSchema,
  confirmDeletionSchema,
  reactivateAccountSchema,
} from "./account-deletion.schema.js";
import type { AccountDeletionService } from "./account-deletion.service.js";

export class AccountDeletionController {
  constructor(private readonly service: AccountDeletionService) {}

  // ── Step 1: DELETE /students/me/account — Initiate deletion ──────────────
  initiateDeletion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = initiateDeletionSchema.parse(req.body);
      const studentId = res.locals.studentId as number;
      const result = await this.service.initiateDeletion(studentId, dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // ── Step 2: POST /students/me/account/confirm-deletion ──────────────────
  confirmDeletion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = confirmDeletionSchema.parse(req.body);
      const studentId = res.locals.studentId as number;
      const result = await this.service.confirmDeletion(studentId, dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // ── Step 3: POST /students/me/account/reactivate ────────────────────────
  reactivateAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = reactivateAccountSchema.parse(req.body);
      const studentId = res.locals.studentId as number;
      const result = await this.service.reactivateAccount(studentId, dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // ── GET /students/me/account/deletion-status ────────────────────────────
  getDeletionStatus = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const result = await this.service.getDeletionStatus(studentId);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };
}
