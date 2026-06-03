import { Router } from "express";
import { RATE_LIMITS } from "../../../config/constants.js";
import { verifyJWT, requireRole, auditLogger } from "../../../shared/middleware/auth.js";
import { rateLimiter } from "../../../shared/middleware/rate-limiter.js";
import { ScholarshipsController } from "./scholarships.controller.js";
import { ScholarshipsRepository } from "./scholarships.repository.js";
import { ScholarshipsService } from "./scholarships.service.js";

const router = Router();
const controller = new ScholarshipsController(new ScholarshipsService(new ScholarshipsRepository()));

router.get(
  "/students/me/scholarships",
  rateLimiter("scholarships_list", RATE_LIMITS.SCHOLARSHIPS_LIST.limit, RATE_LIMITS.SCHOLARSHIPS_LIST.window),
  verifyJWT,
  requireRole("student"),
  auditLogger("scholarships_list"),
  controller.listScholarships,
);

router.get(
  "/scholarships/:scholarship_id",
  rateLimiter("scholarships_get", RATE_LIMITS.SCHOLARSHIPS_GET.limit, RATE_LIMITS.SCHOLARSHIPS_GET.window),
  verifyJWT,
  requireRole("student"),
  auditLogger("scholarships_view"),
  controller.getScholarship,
);

router.get(
  "/students/me/scholarships/saved",
  rateLimiter("scholarships_saved_list", RATE_LIMITS.SCHOLARSHIPS_LIST.limit, RATE_LIMITS.SCHOLARSHIPS_LIST.window),
  verifyJWT,
  requireRole("student"),
  auditLogger("scholarships_saved_list"),
  controller.listSavedScholarships,
);

router.get(
  "/students/me/scholarships/flagged",
  rateLimiter("scholarships_flagged_list", RATE_LIMITS.SCHOLARSHIPS_LIST.limit, RATE_LIMITS.SCHOLARSHIPS_LIST.window),
  verifyJWT,
  requireRole("student"),
  auditLogger("scholarships_flagged_list"),
  controller.listFlaggedScholarships,
);

router.post(
  "/students/me/scholarships/saved",
  rateLimiter("scholarships_save", RATE_LIMITS.SCHOLARSHIPS_WRITE.limit, RATE_LIMITS.SCHOLARSHIPS_WRITE.window),
  verifyJWT,
  requireRole("student"),
  auditLogger("scholarships_save"),
  controller.saveScholarship,
);

router.delete(
  "/students/me/scholarships/saved/:saved_id",
  rateLimiter("scholarships_unsave", RATE_LIMITS.SCHOLARSHIPS_WRITE.limit, RATE_LIMITS.SCHOLARSHIPS_WRITE.window),
  verifyJWT,
  requireRole("student"),
  auditLogger("scholarships_unsave"),
  controller.unsaveScholarship,
);

export default router;
