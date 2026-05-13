import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { ZodError } from "zod";

// Middlewares
import { requestId } from "./shared/middleware/request-id.js";
import { AppError } from "./shared/errors/app-error.js";
import { AuthError } from "./shared/errors/auth-error.js";
import { ConflictError } from "./shared/errors/conflict-error.js";
import { RateLimitError } from "./shared/errors/rate-limit-error.js";
import { sendError } from "./shared/response/error.js";

// Routers
import studentAuthRouter from "./modules/auth/student/student.routes.js";
import studentProfileRouter from "./modules/student/student_profile/students.routes.js";
import studentExtracurricularRouter from "./modules/student/extracurriculars/extracurriculars.routes.js";
import serviceRouter from "./modules/student/service/service.routes.js";
import scholarshipsRouter from "./modules/student/scholarships/scholarships.routes.js";
import consentsRouter from "./modules/student/consents/consents.routes.js";
import settingsRouter from "./modules/student/settings/settings.routes.js";
import schoolLinkingRouter from "./modules/student/school-linking/school-linking.routes.js";
import analyticsRouter from "./modules/student/analytics/analytics.routes.js";

// Migrated Routers from DV
import academicsRouter from "./modules/student/academics/academics.routes.js";
import awardsRouter from "./modules/student/awards/awards.routes.js";
import collegesRouter from "./modules/student/colleges/colleges.routes.js";
import savedCollegesRouter from "./modules/student/colleges/saved-colleges.routes.js";
import accountDeletionRouter from "./modules/student/account-deletion/account-deletion.routes.js";
import collegeDataSharingRouter from "./modules/student/college-data-sharing/college-data-sharing.routes.js";
import notificationsRouter from "./modules/student/notifications/notifications.routes.js";
import pushTokensRouter from "./modules/student/push-tokens/push-tokens.routes.js";
import essayRouter from "./modules/student/essay/essay.routes.js";

const app = express();

app.use(cors());
app.use(requestId);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging

// ── Auth Routes ──────────────────────────────────────────────────────────────
app.use("/api/v1/auth/student", studentAuthRouter);

// ── Student Profile & Core ───────────────────────────────────────────────────
app.use("/api/v1", studentProfileRouter);
app.use("/api/v1", studentExtracurricularRouter);
app.use("/api/v1", serviceRouter);
app.use("/api/v1", scholarshipsRouter);
app.use("/api/v1", consentsRouter);
app.use("/api/v1", settingsRouter);
app.use("/api/v1", schoolLinkingRouter);
app.use("/api/v1", analyticsRouter);

// ── Migrated Student Features (DV) ───────────────────────────────────────────
app.use("/api/v1/students/me/academics", academicsRouter);
app.use("/api/v1/students/me/awards", awardsRouter);
app.use("/api/v1/students/me/essay", essayRouter);
app.use("/api/v1/colleges", collegesRouter);
app.use("/api/v1/students/me/colleges/saved", savedCollegesRouter);
app.use("/api/v1/students/me/account", accountDeletionRouter);
app.use("/api/v1/students/me/college-data-sharing", collegeDataSharingRouter);
app.use("/api/v1/students/me/notifications", notificationsRouter);
app.use("/api/v1/students/me/push-token", pushTokensRouter);

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

// 404 Handler
app.use((_req: Request, res: Response) => {
  sendError(res, "NOT_FOUND", "Route not found", 404);
});

// Global Error Handler
app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  const ts = new Date().toISOString();

  if (error instanceof ZodError) {
    const fields = error.issues.reduce<Record<string, string[]>>((acc, e) => {
      const field = e.path.length > 0 ? e.path.join(".") : "_";
      acc[field] = [...(acc[field] ?? []), e.message];
      return acc;
    }, {});
    console.error(`[${ts}] VALIDATION_ERROR ${req.method} ${req.path}`, fields);
    return sendError(res, "VALIDATION_ERROR", "Invalid input", 422, fields);
  }

  if (error instanceof AuthError) {
    console.error(`[${ts}] ${error.code} (${error.statusCode}) ${req.method} ${req.path} — ${error.message}`);
    return sendError(res, error.code, error.message, error.statusCode);
  }

  if (error instanceof ConflictError) {
    console.error(`[${ts}] ${error.code} (409) ${req.method} ${req.path} — ${error.message}`);
    return sendError(res, error.code, error.message, 409, error.details);
  }

  if (error instanceof RateLimitError) {
    console.error(`[${ts}] RATE_LIMIT_EXCEEDED (429) ${req.method} ${req.path} — ${error.message}`);
    return sendError(res, "RATE_LIMIT_EXCEEDED", error.message, 429);
  }

  if (error instanceof AppError) {
    console.error(`[${ts}] ${error.code} (${error.statusCode}) ${req.method} ${req.path} - ${error.message}`);
    return sendError(res, error.code, error.message, error.statusCode, error.details);
  }

  console.error(`[${ts}] INTERNAL_SERVER_ERROR ${req.method} ${req.path}`, error);
  sendError(res, "INTERNAL_SERVER_ERROR", "Something went wrong", 500);
});

export default app;
