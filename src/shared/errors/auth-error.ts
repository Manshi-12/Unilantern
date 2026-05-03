import { AppError } from "./app-error.js";
import type { AuthErrorCode } from "../response/error-codes.js";

export class AuthError extends AppError {
  constructor(code: AuthErrorCode, message: string, statusCode = 401) {
    super(code, message, statusCode);
  }
}
