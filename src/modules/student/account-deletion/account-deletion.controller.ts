import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../../shared/response/success.js";
import { HttpStatus } from "../../../shared/response/http-status.js";
import { AuthError } from "../../../shared/errors/auth-error.js";
import { AuthErrorCode } from "../../../shared/response/error-codes.js";
import { deleteAccountSchema } from "./account-deletion.schema.js";
import type { AccountDeletionService } from "./account-deletion.service.js";

export class AccountDeletionController {
  constructor(private readonly service: AccountDeletionService) {}

  deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = deleteAccountSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AuthError(
          AuthErrorCode.CONFIRMATION_MISMATCH,
          "Confirmation must be exactly DELETE",
          400,
        );
      }

      const user = res.locals.user as { student_id: number };
      const result = await this.service.deleteAccount(String(user.student_id), parsed.data);

      res.cookie("refresh_token", "", {
        httpOnly: true,
        expires: new Date(0),
      });

      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };
}
