import { Router } from "express";
import { rateLimiter } from "../../../shared/middleware/rate-limiter.js";
import { auditLogger, requireRole, verifyJWT } from "../../../shared/middleware/auth.js";
import { SchoolLinkingController } from "./school-linking.controller.js";
import { SchoolLinkingRepository } from "./school-linking.repository.js";
import { SchoolLinkingService } from "./school-linking.service.js";

const router = Router();
const controller = new SchoolLinkingController(
  new SchoolLinkingService(new SchoolLinkingRepository()),
);

router.get(
  "/schools/search",
  rateLimiter("school_search", 30, 60),
  verifyJWT,
  requireRole("student"),
  auditLogger("school_search"),
  controller.searchSchools,
);

router.post(
  "/students/me/school/link",
  rateLimiter("school_link", 5, 60 * 60),
  verifyJWT,
  requireRole("student"),
  auditLogger("account_link"),
  controller.linkSchool,
);

router.post(
  "/students/me/school/merge-confirm",
  rateLimiter("school_merge_confirm", 5, 60 * 60),
  verifyJWT,
  requireRole("student"),
  auditLogger("account_merge"),
  controller.confirmMerge,
);

router.get(
  "/students/me/school",
  rateLimiter("linked_school_get", 60, 60),
  verifyJWT,
  requireRole("student"),
  auditLogger("linked_school_view"),
  controller.getLinkedSchool,
);

export default router;
