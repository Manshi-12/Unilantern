import { Router } from "express";
import { rateLimiter } from "../../../shared/middleware/rate-limiter.js";
import { authenticate } from "../../../shared/middleware/authenticate.js";
import { PushTokensRepository } from "./push-tokens.repository.js";
import { PushTokensService } from "./push-tokens.service.js";
import { PushTokensController } from "./push-tokens.controller.js";

const router = Router();

const controller = new PushTokensController(
  new PushTokensService(new PushTokensRepository()),
);

// All routes require authentication
router.use(authenticate);

// ── POST /students/me/push-token — Register a device push token ──────────────
router.post(
  "/",
  rateLimiter("push_token_register", 20, 3600, { identifier: "ip" }), // 20 per hour
  controller.registerToken,
);

// ── DELETE /students/me/push-token — Deregister a device push token ──────────
router.delete(
  "/",
  rateLimiter("push_token_deregister", 20, 3600, { identifier: "ip" }), // 20 per hour
  controller.deregisterToken,
);

export default router;
