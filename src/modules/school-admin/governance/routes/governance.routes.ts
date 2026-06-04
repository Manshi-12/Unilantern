import { Router }               from 'express';
import { verifyJWT }            from '../../../../middlewares/verifyJWT.middleware';
import { RoleGuard }            from '../../../../middlewares/roleGuard.middleware';
import { SchoolScope }          from '../../../../middlewares/schoolScope.middleware';
import { validate }             from '../../../../middlewares/validate.middleware';
import { governanceRateLimiter } from '../../../../middlewares/rateLimiter.middleware';
import {
  inviteAdvisorSchema,
  toggleExportPermissionSchema,
} from '../validators/governance.validation';
import {
  listAdvisors,
  inviteAdvisor,
  resendInvite,
  revokeAccess,
  toggleExportPermission,
  getConsentCoverage,
  getAuditLog,
  getExportPermissions,
} from '../controllers/governance.controller';
import { advisorInviteRateLimiter } from '../../../../middlewares/rateLimiter.middleware';


const router = Router();

const m = [
  governanceRateLimiter,
  verifyJWT,
  RoleGuard('school_admin'),
  SchoolScope,
];

// #23 GET    /v1/school-admin/governance/advisors
router.get('/advisors',                                    ...m, listAdvisors);

// #24 POST   /v1/school-admin/governance/advisors/invite
router.post('/advisors/invite',                            ...m, validate(inviteAdvisorSchema), inviteAdvisor);

// #25 POST   /v1/school-admin/governance/advisors/:advisorId/resend-invite
router.post('/advisors/:advisorId/resend-invite',          ...m, resendInvite);

// #26 DELETE /v1/school-admin/governance/advisors/:advisorId/access
router.delete('/advisors/:advisorId/access',               ...m, revokeAccess);

// #27 PUT    /v1/school-admin/governance/advisors/:advisorId/export-permission
router.put('/advisors/:advisorId/export-permission',       ...m, validate(toggleExportPermissionSchema), toggleExportPermission);

// #28 GET    /v1/school-admin/governance/consent-coverage
router.get('/consent-coverage',                            ...m, getConsentCoverage);

// #29 GET    /v1/school-admin/governance/audit-log
router.get('/audit-log',                                   ...m, getAuditLog);

// #30 GET    /v1/school-admin/governance/export-permissions
router.get('/export-permissions',                          ...m, getExportPermissions);
router.post('/advisors/invite',                       advisorInviteRateLimiter, ...m, validate(inviteAdvisorSchema), inviteAdvisor);
router.post('/advisors/:advisorId/resend-invite',     advisorInviteRateLimiter, ...m, resendInvite);
export default router;




