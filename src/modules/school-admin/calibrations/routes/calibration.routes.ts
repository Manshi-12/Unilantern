import { Router }          from 'express';
import { verifyJWT }       from '../../../../middlewares/verifyJWT.middleware';
import { RoleGuard }       from '../../../../middlewares/roleGuard.middleware';
import { SchoolScope }     from '../../../../middlewares/schoolScope.middleware';
import { validate }        from '../../../../middlewares/validate.middleware';
import { calibrationRateLimiter } from '../../../../middlewares/rateLimiter.middleware';
import { saveCalibrationSchema }  from '../validtors/calibration.validation';
import {
  getCalibration,
  saveCalibration,
  restoreDefaults,
} from '../controllers/calibration.controller';

const router = Router();

const m = [
  calibrationRateLimiter,
  verifyJWT,
  RoleGuard('school_admin'),
  SchoolScope,
];

// 3.1 — GET  /v1/school-admin/calibration
router.get('/', ...m, getCalibration);

// 3.2 — PUT  /v1/school-admin/calibration
router.put('/', ...m, validate(saveCalibrationSchema), saveCalibration);

// 3.3 — PUT  /v1/school-admin/calibration/restore-defaults
//       spec note: was DELETE — changed to PUT; rows are never deleted
router.put('/restore-defaults', ...m, restoreDefaults);

export default router;




