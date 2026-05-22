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

router.get(
  "/",
  rateLimiter("college_data_sharing_get", 60, 3600, { identifier: "ip" }),
  controller.getPreference,
);

router.put(
  "/",
  rateLimiter("college_data_sharing_update", 10, 86400, { identifier: "ip" }),
  controller.updatePreference,
);

export default router;
