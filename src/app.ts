import cors from "cors";
import helmet from "helmet";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { ZodError } from "zod";

// ── Shared Middleware ─────────────────────────────────────────────────────────
import { requestId } from "./shared/middleware/request-id.js";
import { requestLogger } from "./shared/middleware/logger.js";
import { authenticate } from "./shared/middleware/authenticate.js";
import { auditLogger as globalAuditLogger } from "./shared/middleware/audit-logger.js";

// ── Error Classes ─────────────────────────────────────────────────────────────
import { AppError } from "./shared/errors/app-error.js";
import { AuthError } from "./shared/errors/auth-error.js";
import { ConflictError } from "./shared/errors/conflict-error.js";
import { RateLimitError } from "./shared/errors/rate-limit-error.js";

// ── Response Helpers ──────────────────────────────────────────────────────────
import { sendError } from "./shared/response/error.js";
import { logger } from "./shared/utils/logger.js";

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT ROUTERS
// ─────────────────────────────────────────────────────────────────────────────

// Auth
import studentAuthRouter from "./modules/auth/student/student.routes.js";

// Core student module routes
import studentProfileRouter from "./modules/student/student_profile/students.routes.js";
import studentExtracurricularRouter from "./modules/student/extracurriculars/extracurriculars.routes.js";
import serviceRouter from "./modules/student/service/service.routes.js";
import scholarshipsRouter from "./modules/student/scholarships/scholarships.routes.js";
import consentsRouter from "./modules/student/consents/consents.routes.js";
import settingsRouter from "./modules/student/settings/settings.routes.js";
import schoolLinkingRouter from "./modules/student/school-linking/school-linking.routes.js";
import analyticsRouter from "./modules/student/analytics/analytics.routes.js";

// Migrated student feature routes
import academicsRouter from "./modules/student/academics/academics.routes.js";
import awardsRouter from "./modules/student/awards/awards.routes.js";
import collegesRouter from "./modules/student/colleges/colleges.routes.js";
import savedCollegesRouter from "./modules/student/colleges/saved-colleges.routes.js";
import accountDeletionRouter from "./modules/student/account-deletion/account-deletion.routes.js";
import collegeDataSharingRouter from "./modules/student/college-data-sharing/college-data-sharing.routes.js";
import notificationsRouter from "./modules/student/notifications/notifications.routes.js";
import pushTokensRouter from "./modules/student/push-tokens/push-tokens.routes.js";
import essayRouter from "./modules/student/essay/essay.routes.js";
import readinessRouter from "./modules/student/readiness/readiness.routes.js";

// ─────────────────────────────────────────────────────────────────────────────
// ADVISOR ROUTERS
// ─────────────────────────────────────────────────────────────────────────────

// Auth (public — no authenticateAdvisor here, this IS the login endpoint)
import advisorAuthRoutes from "./modules/auth/advisor/advisor-auth.routes.js";

// Protected advisor module routes
import rosterRoutes from "./modules/advisor/roster/roster.routes.js";
import studentDetailRoutes from "./modules/advisor/student-detail/student-detail.routes.js";
import advisorReadinessRoutes from "./modules/advisor/readiness/readiness.routes.js";
import consentRoutes from "./modules/advisor/consent/consent.routes.js";
import advisorCollegesRoutes from "./modules/advisor/colleges/colleges.routes.js";
import advisorScholarshipsRoutes from "./modules/advisor/scholarships/scholarships.routes.js";
import tasksRoutes from "./modules/advisor/tasks/tasks.routes.js";
import notesRoutes from "./modules/advisor/notes/notes.routes.js";
import advisorNotificationsRoutes from "./modules/advisor/notifications/notifications.routes.js";
import feedbackRoutes from "./modules/advisor/feedback/feedback.routes.js";

// ─────────────────────────────────────────────────────────────────────────────
// APP SETUP
// ─────────────────────────────────────────────────────────────────────────────

const app = express();

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(requestId);
app.use(requestLogger);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(helmet());       // Security headers — safe for both student and advisor
app.use(globalAuditLogger);
// ─────────────────────────────────────────────────────────────────────────────
// STUDENT ROUTES
//
// Authentication is handled INSIDE each router using verifyJWT from auth.ts.
// No top-level auth middleware needed here.
// ─────────────────────────────────────────────────────────────────────────────

// Student auth (OTP / phone-based login — public endpoints)
app.use("/api/v1/auth/student", studentAuthRouter);

// Core student routes
app.use("/api/v1", studentProfileRouter);
app.use("/api/v1", studentExtracurricularRouter);
app.use("/api/v1", serviceRouter);
app.use("/api/v1", scholarshipsRouter);
app.use("/api/v1", consentsRouter);
app.use("/api/v1", settingsRouter);
app.use("/api/v1", schoolLinkingRouter);
app.use("/api/v1", analyticsRouter);

// Migrated student feature routes
app.use("/api/v1/students/me/academics", academicsRouter);
app.use("/api/v1/students/me/awards", awardsRouter);
app.use("/api/v1/students/me/essay", essayRouter);
app.use("/api/v1/colleges", collegesRouter);
app.use("/api/v1/students/me/colleges/saved", savedCollegesRouter);
app.use("/api/v1/students/me/account", accountDeletionRouter);
app.use("/api/v1/students/me/college-data-sharing", collegeDataSharingRouter);
app.use("/api/v1/students/me/notifications", notificationsRouter);
app.use("/api/v1/students/me/push-token", pushTokensRouter);
app.use("/api/v1/students/me/readiness", readinessRouter);

// ─────────────────────────────────────────────────────────────────────────────
// ADVISOR ROUTES
//
// The auth endpoint is public (email + password login).
// Every other advisor route is protected by authenticateAdvisor which reads
// the HttpOnly access-token cookie and sets res.locals.advisorId / role / schoolId.
// ─────────────────────────────────────────────────────────────────────────────

// Advisor auth (email + password login — public endpoint)
app.use("/api/v1/auth/advisor", advisorAuthRoutes);

// Protected advisor routes — authenticate applied here at the app level
app.use("/api/v1/advisor/roster",         authenticate, rosterRoutes);
app.use("/api/v1/advisor/students",       authenticate, studentDetailRoutes);
app.use("/api/v1/advisor/readiness",      authenticate, advisorReadinessRoutes);
app.use("/api/v1/advisor/consent",        authenticate, consentRoutes);
app.use("/api/v1/advisor/colleges",       authenticate, advisorCollegesRoutes);
app.use("/api/v1/advisor/scholarships",   authenticate, advisorScholarshipsRoutes);
app.use("/api/v1/advisor/notes",          authenticate, notesRoutes);
app.use("/api/v1/advisor/tasks",          authenticate, tasksRoutes);
app.use("/api/v1/advisor/notifications",  authenticate, advisorNotificationsRoutes);
app.use("/api/v1/advisor/feedback",       authenticate, feedbackRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// ROOT / HEALTH ROUTES
// ─────────────────────────────────────────────────────────────────────────────

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ message: "Welcome to UniLantern" });
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "unilantern-backend",
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL AUDIT LOGGER
// Runs after all route handlers. Logs completed requests for the advisor module.
// (Student routes do per-action audit logging inside auth.ts via auditLogger().)
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// 404 HANDLER
// ─────────────────────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  sendError(res, "NOT_FOUND", "Route not found", 404);
});

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER
//
// Order matters — more specific error classes checked first.
// Uses the student module's structured logger (Winston / Pino) for consistent
// log output across both modules.
// ─────────────────────────────────────────────────────────────────────────────

app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  const ts = new Date().toISOString();
  const reqId = (req as any).id || "unknown";

  // Zod validation errors
  if (error instanceof ZodError) {
    const fields = error.issues.reduce<Record<string, string[]>>((acc, e) => {
      const field = e.path.length > 0 ? e.path.join(".") : "_";
      acc[field] = [...(acc[field] ?? []), e.message];
      return acc;
    }, {});
    logger.error("VALIDATION_ERROR", error, {
      requestId: reqId,
      method: req.method,
      path: req.path,
      statusCode: 422,
    });
    return sendError(res, "VALIDATION_ERROR", "Invalid input", 422, fields);
  }

  // Auth errors (JWT, session, permissions)
  if (error instanceof AuthError) {
    logger.error(`${error.code}`, error, {
      requestId: reqId,
      method: req.method,
      path: req.path,
      statusCode: error.statusCode,
    });
    return sendError(res, error.code, error.message, error.statusCode);
  }

  // Conflict errors (duplicate resource, etc.)
  if (error instanceof ConflictError) {
    logger.error(`${error.code}`, error, {
      requestId: reqId,
      method: req.method,
      path: req.path,
      statusCode: 409,
    });
    return sendError(res, error.code, error.message, 409, error.details);
  }

  // Rate limit errors
  if (error instanceof RateLimitError) {
    logger.warning("RATE_LIMIT_EXCEEDED", {
      requestId: reqId,
      method: req.method,
      path: req.path,
      statusCode: 429,
    });
    return sendError(res, "RATE_LIMIT_EXCEEDED", error.message, 429);
  }

  // Generic AppError subclasses (NotFoundError, BadRequestError, etc.)
  if (error instanceof AppError) {
    logger.error(`${error.code}`, error, {
      requestId: reqId,
      method: req.method,
      path: req.path,
      statusCode: error.statusCode,
    });
    return sendError(res, error.code, error.message, error.statusCode, error.details);
  }

  // Unhandled errors
  logger.error("INTERNAL_SERVER_ERROR", error, {
    requestId: reqId,
    method: req.method,
    path: req.path,
    statusCode: 500,
  });
  sendError(res, "INTERNAL_SERVER_ERROR", "Something went wrong", 500);
});

export default app;