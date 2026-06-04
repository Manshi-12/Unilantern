import { Router } from 'express';
import { validate }    from '../../../../middlewares/validate.middleware';
import { verifyJWT }   from '../../../../middlewares/verifyJWT.middleware';
import { RoleGuard }   from '../../../../middlewares/roleGuard.middleware';
import { SchoolScope } from '../../../../middlewares/schoolScope.middleware';
import {
  exportRateLimiter,
  exportDownloadRateLimiter,
} from '../../../../middlewares/rateLimiter.middleware';
import { triggerExportSchema, listExportsSchema } from '../validators/export.validations';
import {
  triggerExport,
  listExports,
  downloadExport,
} from '../controllers/export.controller';

const router = Router();

// All export routes require JWT + school_admin role + school-scoped access

// ─── #31 POST /v1/school-admin/exports ────────────────────────────────────────
// Trigger async export job.
// Rate limit: 10 per school per hour (export jobs are heavy — prevent abuse)
router.post(
  '/',
  exportRateLimiter,
  verifyJWT,
  RoleGuard('school_admin'),
  SchoolScope,
  validate(triggerExportSchema),
  triggerExport,
);

// ─── #32 GET /v1/school-admin/exports ─────────────────────────────────────────
// List past export jobs (cursor-based pagination).
// Rate limit: 60 per school per hour
router.get(
  '/',
  exportRateLimiter,
  verifyJWT,
  RoleGuard('school_admin'),
  SchoolScope,
  validate(listExportsSchema, 'query'),
  listExports,
);

// ─── #33 GET /v1/school-admin/exports/:exportId/download ──────────────────────
// Download completed export. Streams CSV (DEV) or returns signed SAS URL (PROD).
// Rate limit: 20 downloads per school per hour
router.get(
  '/:exportId/download',
  exportDownloadRateLimiter,
  verifyJWT,
  RoleGuard('school_admin'),
  SchoolScope,
  downloadExport,
);

export default router;




