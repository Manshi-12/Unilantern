import { Router } from "express";
import { authenticate, requireStudentRole } from "../../../shared/middleware/authenticate.js";
import { AwardsRepository } from "./awards.repository.js";
import { AwardsService } from "./awards.service.js";
import { AwardsController } from "./awards.controller.js";
import { ScoresRepository } from "../academics/scores.repository.js";

const router = Router();

const controller = new AwardsController(
  new AwardsService(new AwardsRepository(), new ScoresRepository()),
);

// All routes: valid JWT required AND caller must be a student
router.use(authenticate);
router.use(requireStudentRole);

// 5.1 — List Honors and Awards
router.get("/", controller.list);

// 5.2 — Add Honor or Award
router.post("/", controller.create);

// 5.3 — Update Honor or Award
router.put("/:award_id", controller.update);

// 5.4 — Delete Honor or Award
router.delete("/:award_id", controller.remove);

export default router;
