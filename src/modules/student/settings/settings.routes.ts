import { Router } from "express";
import { SettingsController } from "./settings.controller.js";
import { SettingsService } from "./settings.service.js";
import { SettingsRepository } from "./settings.repository.js";
import { verifyJWT, requireRole, auditLogger } from "../../../shared/middleware/auth.js";

const router = Router();
const repository = new SettingsRepository();
const service = new SettingsService(repository);
const controller = new SettingsController(service);

// Publicly reachable but still requires JWT for student context
router.use(verifyJWT);
router.use(requireRole("student"));

/**
 * @route POST /api/v1/feedback
 */
router.post("/feedback", auditLogger("submit_feedback"), controller.submitFeedback);

/**
 * @route DELETE /api/v1/students/me/account
 */
router.delete("/students/me/account", auditLogger("delete_account"), controller.deleteAccount);

export default router;
