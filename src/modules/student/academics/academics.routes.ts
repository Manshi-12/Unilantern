import { Router } from "express";
import { authenticate, requireStudentRole } from "../../../shared/middleware/authenticate.js";
import { AcademicsRepository } from "./academics.repository.js";
import { AcademicsService } from "./academics.service.js";
import { AcademicsController } from "./academics.controller.js";
import { ScoresRepository } from "./scores.repository.js";

const router = Router();

const controller = new AcademicsController(
  new AcademicsService(new AcademicsRepository(), new ScoresRepository()),
);

// All routes: valid JWT required AND caller must be a student
router.use(authenticate);
router.use(requireStudentRole);

// 3.1 — Get Academic Data
router.get("/", controller.get);

// 3.2 — Update Academic Data (upsert — creates on first call, updates thereafter)
router.put("/", controller.update);

export default router;
