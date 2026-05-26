import { Router }
  from 'express'

import { readinessController }
  from './readiness.controller.js'

const router = Router()

router.get(
  '/school/:schoolId',
  readinessController.getSchoolDistribution,
)

router.get(
  '/:studentId/current',
  readinessController.getCurrentReadiness,
)

router.get(
  '/:studentId/history',
  readinessController.getReadinessHistory,
)

export default router