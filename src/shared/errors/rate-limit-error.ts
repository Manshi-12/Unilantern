import { AppError } from "./app-error.js";
import { AuthErrorCode } from "../response/error-codes.js";

export class RateLimitError extends AppError {
  constructor(
    message = "Too many requests",
    public readonly retryAfterSeconds?: number,
  ) {
    super(AuthErrorCode.TOO_MANY_REQUESTS, message, 429);
  }
}
