import { Router } from "express";
import { authenticate, requireStudentRole } from "../../../shared/middleware/authenticate.js";
import { EssayRepository } from "./essay.repository.js";
import { EssayService } from "./essay.service.js";
import { EssayController } from "./essay.controller.js";
import { AcademicsRepository } from "../academics/academics.repository.js";
import { ScoresRepository } from "../academics/scores.repository.js";

const router = Router();

const controller = new EssayController(
  new EssayService(
    new EssayRepository(),
    new AcademicsRepository(),
    new ScoresRepository(),
  ),
);

// All routes: valid JWT required AND caller must be a student
router.use(authenticate);
router.use(requireStudentRole);

// 7.1 — Get essay state and metadata (essay_text NEVER returned)
router.get("/", controller.getState);

// 7.2 — Save essay content (word count, lock, repetition check)
router.put("/content", controller.saveContent);

// 7.3 — Advance essay status (drafted | revised | reviewed)
router.post("/status/advance", controller.advanceStatus);

// 7.4 — Confirm external reviewer
router.post("/reviewer-confirm", controller.confirmReviewer);

// 7.5 — Finalize essay (requires confirmation: true)
router.post("/finalize", controller.finalizeEssay);

export default router;
