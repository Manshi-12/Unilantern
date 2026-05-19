import { Router } from "express";
import { rateLimiter } from "../../../shared/middleware/rate-limiter.js";
import { verifyJWT, requireRole, auditLogger } from "../../../shared/middleware/auth.js";
import { AccountDeletionRepository } from "./account-deletion.repository.js";
import { AccountDeletionService } from "./account-deletion.service.js";
import { AccountDeletionController } from "./account-deletion.controller.js";

const router = Router();

const controller = new AccountDeletionController(
  new AccountDeletionService(new AccountDeletionRepository()),
);

router.delete(
  "/",
  rateLimiter("account_deletion", 3, 86400, { identifier: "user" }),
  verifyJWT,
  requireRole("student"),
  auditLogger("account_deletion"),
  controller.deleteAccount,
);

export default router;
