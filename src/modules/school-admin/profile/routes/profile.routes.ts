import { Router }          from 'express';
import { verifyJWT }       from '../../../../middlewares/verifyJWT.middleware';
import { RoleGuard }       from '../../../../middlewares/roleGuard.middleware';
import { validate }        from '../../../../middlewares/validate.middleware';
import { profileRateLimiter } from '../../../../middlewares/rateLimiter.middleware';
import { updateProfileSchema } from '../validators/profile.validation';
import {
  getProfile,
  updateProfile,
  listSessions,
  revokeSession,
  revokeAllSessions,
} from '../controller/profile.controller';

const router = Router();

const m = [profileRateLimiter, verifyJWT, RoleGuard('school_admin')];

// #53 GET    /v1/school-admin/profile
router.get('/profile',              ...m, getProfile);

// #54 PUT    /v1/school-admin/profile
router.put('/profile',              ...m, validate(updateProfileSchema), updateProfile);

// #55 GET    /v1/school-admin/sessions
// NOTE: registered BEFORE /sessions/:sessionId to avoid conflict
router.get('/sessions',             ...m, listSessions);

// #57 DELETE /v1/school-admin/sessions — revoke all except current
// NOTE: registered BEFORE /sessions/:sessionId to avoid conflict
router.delete('/sessions',          ...m, revokeAllSessions);

// #56 DELETE /v1/school-admin/sessions/:sessionId
router.delete('/sessions/:sessionId', ...m, revokeSession);

export default router;




