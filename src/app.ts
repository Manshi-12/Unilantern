import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { ZodError } from "zod";
import studentAuthRouter from "./modules/auth/student/student.routes.js";
import studentProfileRouter from "./modules/auth/student/student.profile.routes.js";
import studentExtracurricularRouter from "./modules/auth/student/student.extracurricular.routes.js";
import { AuthError } from "./shared/errors/auth-error.js";
import { ConflictError } from "./shared/errors/conflict-error.js";
import { RateLimitError } from "./shared/errors/rate-limit-error.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/auth/student", studentAuthRouter);
app.use("/api/v1", studentProfileRouter);
app.use("/api/v1", studentExtracurricularRouter);

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    message: "Welcome to UniLantern",
  });
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "unilantern-backend",
    timestamp: new Date().toISOString(),
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: "Route not found",
  });
});

app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  const ts = new Date().toISOString();

  if (error instanceof ZodError) {
    const fields = error.issues.map((e) => ({ field: e.path.join("."), message: e.message }));
    console.error(`[${ts}] VALIDATION_ERROR ${req.method} ${req.path}`, fields);
    return res.status(422).json({
      error: "VALIDATION_ERROR",
      message: "Invalid input",
      fields,
    });
  }

  if (error instanceof AuthError) {
    console.error(`[${ts}] ${error.code} (${error.statusCode}) ${req.method} ${req.path} — ${error.message}`);
    return res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
    });
  }

  if (error instanceof ConflictError) {
    console.error(`[${ts}] ${error.code} (409) ${req.method} ${req.path} — ${error.message}`);
    return res.status(409).json({
      error: error.code,
      message: error.message,
    });
  }

  if (error instanceof RateLimitError) {
    console.error(`[${ts}] RATE_LIMIT_EXCEEDED (429) ${req.method} ${req.path} — ${error.message}`);
    return res.status(429).json({
      error: "RATE_LIMIT_EXCEEDED",
      message: error.message,
    });
  }

  console.error(`[${ts}] INTERNAL_SERVER_ERROR ${req.method} ${req.path}`, error);
  res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: "Something went wrong",
  });
});

export default app;
