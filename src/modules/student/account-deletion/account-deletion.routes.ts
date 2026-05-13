import { Router } from "express";
import { rateLimiter } from "../../../shared/middleware/rate-limiter.js";
import { authenticate } from "../../../shared/middleware/authenticate.js";
import { AccountDeletionRepository } from "./account-deletion.repository.js";
import { AccountDeletionService } from "./account-deletion.service.js";
import { AccountDeletionController } from "./account-deletion.controller.js";

const router = Router();

const controller = new AccountDeletionController(
  new AccountDeletionService(new AccountDeletionRepository()),
);

// All routes require authentication
router.use(authenticate);

// ── Step 1: Initiate deletion request ────────────────────────────────────────
// DELETE /students/me/account
router.delete(
  "/",
  rateLimiter("deletion_initiate", 3, 86400, { identifier: "ip" }), // 3 per day
  controller.initiateDeletion,
);

// ── Step 2: Confirm deletion with OTP ────────────────────────────────────────
// POST /students/me/account/confirm-deletion
router.post(
  "/confirm-deletion",
  rateLimiter("deletion_confirm", 10, 1800, { identifier: "ip" }), // 10 per 30 min
  controller.confirmDeletion,
);

// ── Step 3: Reactivate during cooldown ───────────────────────────────────────
// POST /students/me/account/reactivate
router.post(
  "/reactivate",
  rateLimiter("deletion_reactivate", 5, 3600, { identifier: "ip" }), // 5 per hour
  controller.reactivateAccount,
);

// ── Deletion status check ────────────────────────────────────────────────────
// GET /students/me/account/deletion-status
router.get(
  "/deletion-status",
  controller.getDeletionStatus,
);

export default router;
