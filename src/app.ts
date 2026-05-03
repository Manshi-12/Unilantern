import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { ZodError } from "zod";

import { requestId } from "./shared/middleware/request-id.js";
import { sendSuccess } from "./shared/response/success.js";
import { sendError } from "./shared/response/error.js";
import { AppError } from "./shared/errors/app-error.js";
import { buildZodDetails } from "./shared/errors/validation-error.js";
import { AuthErrorCode } from "./shared/response/error-codes.js";
import { HttpStatus } from "./shared/response/http-status.js";

import studentAuthRouter from "./modules/auth/student/student.routes.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(requestId);

app.get("/", (_req: Request, res: Response) => {
  sendSuccess(res, { message: "Welcome to UniLantern" });
});

app.get("/health", (_req: Request, res: Response) => {
  sendSuccess(res, {
    status: "ok",
    service: "unilantern-backend",
    timestamp: new Date().toISOString(),
  });
});

app.use("/auth/student", studentAuthRouter);

app.use((_req: Request, res: Response) => {
  sendError(res, "NOT_FOUND", "Route not found", HttpStatus.NOT_FOUND);
});

app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof ZodError) {
      sendError(
        res,
        AuthErrorCode.VALIDATION_ERROR,
        "Validation failed",
        HttpStatus.UNPROCESSABLE_ENTITY,
        buildZodDetails(err),
      );
      return;
    }
    if (err instanceof AppError) {
      sendError(res, err.code, err.message, err.statusCode, err.details);
      return;
    }
    console.error("[unhandled]", err);
    sendError(
      res,
      AuthErrorCode.INTERNAL_ERROR,
      "An unexpected error occurred",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  },
);

export default app;
