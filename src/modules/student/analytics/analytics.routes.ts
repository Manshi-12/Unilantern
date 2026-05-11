import { Router } from "express";
import { rateLimiter } from "../../../shared/middleware/rate-limiter.js";
import { requireRole, verifyJWT } from "../../../shared/middleware/auth.js";
import { AnalyticsController } from "./analytics.controller.js";
import { AnalyticsRepository } from "./analytics.repository.js";
import { AnalyticsService } from "./analytics.service.js";

const router = Router();
const controller = new AnalyticsController(
  new AnalyticsService(new AnalyticsRepository()),
);

router.post(
  "/analytics/events",
  rateLimiter("analytics_events", 300, 60),
  verifyJWT,
  requireRole("student"),
  controller.trackEvents,
);

export default router;
