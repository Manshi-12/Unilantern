import { Router } from "express";
import { authenticate, requireStudentRole } from "../../../shared/middleware/authenticate.js";
import { auditLogger } from "../../../shared/middleware/auth.js";
import { ReadinessRepository } from "./readiness.repository.js";
import { ReadinessService } from "./readiness.service.js";
import { ReadinessController } from "./readiness.controller.js";

const router = Router();
const controller = new ReadinessController(
  new ReadinessService(new ReadinessRepository())
);

// Require token validation and student role for all endpoints in this router
router.use(authenticate);
router.use(requireStudentRole);

// 8.1 — Get Current Readiness Output
router.get("/", auditLogger("readiness_view"), controller.get);

// 8.2 — Get Readiness Band History
router.get("/history", auditLogger("readiness_history_view"), controller.getHistory);

// 8.3 — Get Improvement Recommendations
router.get("/improvement", auditLogger("readiness_improvement_view"), controller.getImprovement);

// 8.4 — Trigger Readiness Recalculation
router.post("/recalculate", auditLogger("readiness_recalculate"), controller.recalculate);

export default router;
