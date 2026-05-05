import { Router } from "express";
import { RATE_LIMITS } from "../../config/constants.js";
import { verifyJWT, requireRole, auditLogger, scoreRecalc } from "../../shared/middleware/auth.js";
import { rateLimiter } from "../../shared/middleware/rate-limiter.js";
import { ServiceController } from "./service.controller.js";
import { ServiceRepository } from "./service.repository.js";
import { ServiceService } from "./service.service.js";

const router = Router();
const controller = new ServiceController(new ServiceService(new ServiceRepository()));

router.get(
  "/students/me/service",
  rateLimiter("service_list", RATE_LIMITS.SERVICE_LIST.limit, RATE_LIMITS.SERVICE_LIST.window),
  verifyJWT,
  requireRole("student"),
  auditLogger("service_list"),
  controller.listService,
);

router.post(
  "/students/me/service",
  rateLimiter("service_create", RATE_LIMITS.SERVICE_WRITE.limit, RATE_LIMITS.SERVICE_WRITE.window),
  verifyJWT,
  requireRole("student"),
  auditLogger("profile_update"),
  scoreRecalc,
  controller.createService,
);

router.put(
  "/students/me/service/:service_id",
  rateLimiter("service_update", RATE_LIMITS.SERVICE_WRITE.limit, RATE_LIMITS.SERVICE_WRITE.window),
  verifyJWT,
  requireRole("student"),
  auditLogger("profile_update"),
  scoreRecalc,
  controller.updateService,
);

router.delete(
  "/students/me/service/:service_id",
  rateLimiter("service_delete", RATE_LIMITS.SERVICE_WRITE.limit, RATE_LIMITS.SERVICE_WRITE.window),
  verifyJWT,
  requireRole("student"),
  auditLogger("profile_update"),
  scoreRecalc,
  controller.deleteService,
);

export default router;
