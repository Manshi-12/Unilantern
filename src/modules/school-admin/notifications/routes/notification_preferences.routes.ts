import { Router }                   from 'express';
import { verifyJWT }                from '../../../../middlewares/verifyJWT.middleware';
import { RoleGuard }                from '../../../../middlewares/roleGuard.middleware';
import { validate }                 from '../../../../middlewares/validate.middleware';
import { notificationsRateLimiter } from '../../../../middlewares/rateLimiter.middleware';
import {
  bulkUpdatePreferencesSchema,
  updateSinglePreferenceSchema,
} from '../validators/notifications.validation';
import {
  getPreferences,
  bulkUpdatePreferences,
  updateSinglePreference,
} from '../controllers/notifications.controller';

const router = Router();

const m = [notificationsRateLimiter, verifyJWT, RoleGuard('school_admin')];

// #50 GET /v1/school-admin/notification-preferences
router.get('/',      ...m, getPreferences);

// #51 PUT /v1/school-admin/notification-preferences/bulk
// NOTE: registered BEFORE /:type to avoid route conflict
router.put('/bulk',  ...m, validate(bulkUpdatePreferencesSchema), bulkUpdatePreferences);

// #52 PUT /v1/school-admin/notification-preferences/:type
router.put('/:type', ...m, validate(updateSinglePreferenceSchema), updateSinglePreference);

export default router;




