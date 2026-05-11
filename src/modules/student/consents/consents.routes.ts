import { Router } from "express";
import { ConsentsController } from "./consents.controller.js";
import { ConsentsService } from "./consents.service.js";
import { ConsentsRepository } from "./consents.repository.js";
import { verifyJWT, requireRole, auditLogger } from "../../../shared/middleware/auth.js";

const router = Router();
const repository = new ConsentsRepository();
const service = new ConsentsService(repository);
const controller = new ConsentsController(service);

// All routes require student role
router.use(verifyJWT);
router.use(requireRole("student"));

/**
 * @route GET /api/v1/students/me/consents
 */
router.get("/students/me/consents", auditLogger("get_all_consents"), controller.getAllConsents);

/**
 * @route POST /api/v1/students/me/consents/:consent_type/grant
 */
router.post("/students/me/consents/:consent_type/grant", auditLogger("grant_consent"), controller.grantConsent);

/**
 * @route POST /api/v1/students/me/consents/:consent_type/revoke
 */
router.post("/students/me/consents/:consent_type/revoke", auditLogger("revoke_consent"), controller.revokeConsent);

/**
 * @route GET /api/v1/students/me/college-data-sharing
 */
router.get("/students/me/college-data-sharing", auditLogger("get_college_sharing"), controller.getCollegeDataSharing);

/**
 * @route PUT /api/v1/students/me/college-data-sharing
 */
router.put("/students/me/college-data-sharing", auditLogger("update_college_sharing"), controller.updateCollegeDataSharing);

export default router;
