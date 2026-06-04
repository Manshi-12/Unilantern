import { Router } from 'express';
import { verifyJWT }                   from '../../../../middlewares/verifyJWT.middleware';
import { RoleGuard }                   from '../../../../middlewares/roleGuard.middleware';
import { SchoolScope }                 from '../../../../middlewares/schoolScope.middleware';
import { AggregateOnly }               from '../../../../middlewares/Aggregateonly.middleware';
import { dashboardSectionRateLimiter } from '../../../../middlewares/rateLimiter.middleware';
import {
  getOverview, getCollegeIntent, getGapAnalysis,
  getEquityAccess, getTrajectory, getEngagement,
  getSeniorRisk, getCounselingCapacity, getReadinessDrivers,
} from '../controllers/dashboard_controller';

const router = Router();

const m = [
  dashboardSectionRateLimiter,
  verifyJWT,
  RoleGuard('school_admin'),
  SchoolScope,
  AggregateOnly,
];

router.get('/overview',            ...m, getOverview);           // 2.1 A
router.get('/college-intent',      ...m, getCollegeIntent);      // 2.2 B
router.get('/gap-analysis',        ...m, getGapAnalysis);        // 2.3 C
router.get('/equity-access',       ...m, getEquityAccess);       // 2.4 D
router.get('/trajectory',          ...m, getTrajectory);         // 2.5 F
router.get('/engagement',          ...m, getEngagement);         // 2.6 G
router.get('/senior-risk',         ...m, getSeniorRisk);         // 2.7 H
router.get('/counseling-capacity', ...m, getCounselingCapacity); // 2.8 I
router.get('/readiness-drivers',   ...m, getReadinessDrivers);   // 2.9 J

export default router;




