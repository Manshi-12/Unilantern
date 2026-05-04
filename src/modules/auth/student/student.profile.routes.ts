import { Router } from "express";
import { rateLimiter } from "../../../shared/middleware/rate-limiter.js";
import { RATE_LIMITS } from "../../../config/constants.js";
import { verifyJWT, requireRole, auditLogger, scoreRecalc } from "../../../shared/middleware/auth.js";
import { StudentRepository, OtpRepository } from "./student.repository.js";
import { StudentService } from "./student.service.js";
import { StudentController } from "./student.controller.js";

const router = Router();

const controller = new StudentController(
  new StudentService(new StudentRepository(), new OtpRepository()),
);

router.get(
  "/students/me/profile",
  rateLimiter("profile_get", RATE_LIMITS.PROFILE_VIEW.limit, RATE_LIMITS.PROFILE_VIEW.window),
  verifyJWT,
  requireRole("student"),
  auditLogger("profile_view"),
  controller.getProfile,
);

router.put(
  "/students/me/profile",
  rateLimiter("profile_update", RATE_LIMITS.PROFILE_UPDATE.limit, RATE_LIMITS.PROFILE_UPDATE.window),
  verifyJWT,
  requireRole("student"),
  auditLogger("profile_update"),
  scoreRecalc,
  controller.updateProfile,
);

export default router;
