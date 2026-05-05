import { Router } from "express";
import { rateLimiter } from "../../shared/middleware/rate-limiter.js";
import { RATE_LIMITS } from "../../config/constants.js";
import { verifyJWT, requireRole, auditLogger, scoreRecalc } from "../../shared/middleware/auth.js";
import { ExtracurricularsRepository } from "./extracurriculars.repository.js";
import { ExtracurricularsService } from "./extracurriculars.service.js";
import { ExtracurricularsController } from "./extracurriculars.controller.js";

const router = Router();

const controller = new ExtracurricularsController(
  new ExtracurricularsService(new ExtracurricularsRepository()),
);

// List extracurricular activities
router.get(
  "/students/me/extracurriculars",
  rateLimiter("extracurricular_list", RATE_LIMITS.EC_LIST.limit, RATE_LIMITS.EC_LIST.window),
  verifyJWT,
  requireRole("student"),
  auditLogger("extracurricular_list"),
  controller.listExtracurriculars,
);

// Create extracurricular activity
router.post(
  "/students/me/extracurriculars",
  rateLimiter("extracurricular_create", RATE_LIMITS.EC_CREATE.limit, RATE_LIMITS.EC_CREATE.window),
  verifyJWT,
  requireRole("student"),
  auditLogger("extracurricular_create"),
  scoreRecalc,
  controller.createExtracurricular,
);

// Get specific extracurricular activity
router.get(
  "/students/me/extracurriculars/:activity_id",
  rateLimiter("extracurricular_get", RATE_LIMITS.EC_GET.limit, RATE_LIMITS.EC_GET.window),
  verifyJWT,
  requireRole("student"),
  auditLogger("extracurricular_view"),
  controller.getExtracurricular,
);

// Update extracurricular activity
router.put(
  "/students/me/extracurriculars/:activity_id",
  rateLimiter("extracurricular_update", RATE_LIMITS.EC_UPDATE.limit, RATE_LIMITS.EC_UPDATE.window),
  verifyJWT,
  requireRole("student"),
  auditLogger("extracurricular_update"),
  scoreRecalc,
  controller.updateExtracurricular,
);

// Delete extracurricular activity
router.delete(
  "/students/me/extracurriculars/:activity_id",
  rateLimiter("extracurricular_delete", RATE_LIMITS.EC_DELETE.limit, RATE_LIMITS.EC_DELETE.window),
  verifyJWT,
  requireRole("student"),
  auditLogger("extracurricular_delete"),
  scoreRecalc,
  controller.deleteExtracurricular,
);

// Reorder extracurricular activities
router.post(
  "/students/me/extracurriculars/reorder",
  rateLimiter("extracurricular_reorder", RATE_LIMITS.EC_REORDER.limit, RATE_LIMITS.EC_REORDER.window),
  verifyJWT,
  requireRole("student"),
  auditLogger("extracurricular_reorder"),
  scoreRecalc,
  controller.reorderExtracurriculars,
);

export default router;
