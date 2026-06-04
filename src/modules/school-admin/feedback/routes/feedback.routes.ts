import { Router }             from 'express';
import { verifyJWT }          from '../../../../middlewares/verifyJWT.middleware';
import { RoleGuard }          from '../../../../middlewares/roleGuard.middleware';
import { validate }           from '../../../../middlewares/validate.middleware';
import { feedbackRateLimiter } from '../../../../middlewares/rateLimiter.middleware';
import { createFeedbackSchema } from '../validations/feedback.validation';
import { submitFeedback }     from '../controller/feedback.controller';

const router = Router();

// #58 — POST /v1/school-admin/feedback
// JWT + RoleGuard | page_name, device_type, app_version auto-captured from headers
router.post(
  '/',
  feedbackRateLimiter,
  verifyJWT,
  RoleGuard('school_admin'),
  validate(createFeedbackSchema),
  submitFeedback,
);

export default router;




