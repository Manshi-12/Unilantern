// ── Student Saved Colleges Routes ────────────────────────────────────────────
// All routes require valid JWT + student role.

import { Router } from "express";
import { authenticate, requireStudentRole } from "../../../shared/middleware/authenticate.js";
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

// 9.3 — List saved colleges
router.get("/", controller.listSaved);

// 9.4 — Save a college (fit computed at save time)
router.post("/", controller.saveCollege);

// 9.5 — Update saved college (status, major, etc.)
router.patch("/:saved_id", controller.updateSaved);

// 9.6 — Unsave a college
router.delete("/:saved_id", controller.unsaveCollege);

export default router;
