// ── College Module Routes ────────────────────────────────────────────────────
// All routes require valid JWT + student role.

import { Router } from "express";
import { authenticate, requireStudentRole } from "../../../shared/middleware/authenticate.js";
import { rateLimiter } from "../../../shared/middleware/rate-limiter.js";
import { CollegesRepository } from "./colleges.repository.js";
import { SavedCollegesRepository } from "./saved-colleges.repository.js";
import { CollegesService } from "./colleges.service.js";
import { CollegesController } from "./colleges.controller.js";

const router = Router();

const controller = new CollegesController(
  new CollegesService(
    new CollegesRepository(),
    new SavedCollegesRepository(),
  ),
);

// All routes: valid JWT required AND caller must be a student
router.use(authenticate);
router.use(requireStudentRole);

// 9.1 — Search colleges with filters
router.get("/search", controller.search);

// 9.2 — Get college detail by ID
router.get("/:college_id", controller.getById);

// ── External API fetch (rate-limited) ─────────────────────────────────────────
// Fetches 5 colleges from College Scorecard API and stores in DB
router.get(
  "/external/fetch",
  rateLimiter("scorecard_fetch", 10, 60),
  controller.fetchFromScorecard,
);

export default router;
