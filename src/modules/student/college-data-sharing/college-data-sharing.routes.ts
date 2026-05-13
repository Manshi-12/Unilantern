import { Router } from "express";
import { rateLimiter } from "../../../shared/middleware/rate-limiter.js";
import { authenticate, requireStudentRole } from "../../../shared/middleware/authenticate.js";
import { CollegeDataSharingRepository } from "./college-data-sharing.repository.js";
import { CollegeDataSharingService } from "./college-data-sharing.service.js";
import { CollegeDataSharingController } from "./college-data-sharing.controller.js";

const router = Router();

const controller = new CollegeDataSharingController(
  new CollegeDataSharingService(new CollegeDataSharingRepository()),
);

router.use(authenticate);
router.use(requireStudentRole);

// ── PUT /students/me/college-data-sharing — Update opt-out preference ───────
// Rate limit: 10 per user per day
router.put(
  "/",
  rateLimiter("college_data_sharing_update", 10, 86400, { identifier: "ip" }),
  controller.updatePreference,
);

export default router;
