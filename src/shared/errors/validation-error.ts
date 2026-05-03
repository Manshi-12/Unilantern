import { ZodError } from "zod";
import { AppError } from "./app-error.js";
import { AuthErrorCode } from "../response/error-codes.js";

export class ValidationError extends AppError {
  constructor(
    message = "Validation failed",
    details: Record<string, string[]> = {},
  ) {
    super(AuthErrorCode.VALIDATION_ERROR, message, 422, details);
  }

  static fromZod(err: ZodError): ValidationError {
    return new ValidationError("Validation failed", buildZodDetails(err));
  }
}

export function buildZodDetails(err: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const field = issue.path.length > 0 ? issue.path.join(".") : "_";
    if (!details[field]) details[field] = [];
    details[field].push(issue.message);
  }
  return details;
}
