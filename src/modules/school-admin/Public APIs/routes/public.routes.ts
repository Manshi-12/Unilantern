import { Router } from 'express';
import { validate }     from '../../../../middlewares/validate.middleware';
import { getCollegesSchema } from '../validators/public.validations';
import {
  getSchool,
  getReadinessDistribution,
  getColleges,
  getCollege,
} from '../controllers/public.controller';

const router = Router();

// ─── Schools (Public) ─────────────────────────────────────────────────────────

// 59 — GET /v1/schools/:schoolId
// Auth: None — public | Returns: school_name, state, email_domain only
router.get(
  '/schools/:schoolId',
  getSchool,
);

// ─── Readiness (Public) ───────────────────────────────────────────────────────

// 60 — GET /v1/readiness/school/:schoolId/distribution
// Auth: None — public | Returns: aggregate band distribution only
// Note: verify with team if this should truly remain public (§60 flag in API ref)
router.get(
  '/readiness/school/:schoolId/distribution',
  getReadinessDistribution,
);

// ─── Colleges (Public) ────────────────────────────────────────────────────────

// 61 — GET /v1/colleges
// Auth: None — public | Query: ?search=harvard&page=1&limit=20
router.get(
  '/colleges',
  validate(getCollegesSchema, 'query'),
  getColleges,
);

// 62 — GET /v1/colleges/:collegeId
// Auth: None — public
router.get(
  '/colleges/:collegeId',
  getCollege,
);

export default router;




