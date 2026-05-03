import { AppError } from "./app-error.js";

export class ConflictError extends AppError {
  constructor(code: string, message: string, details?: Record<string, string[]>) {
    super(code, message, 409, details);
  }
}
