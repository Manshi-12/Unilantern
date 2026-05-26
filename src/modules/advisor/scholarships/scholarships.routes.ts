import { Router }
  from 'express'

import { advisorScholarshipsController }
  from './scholarships.controller.js'

const router = Router()

// API 34
router.get(
  '/:id/scholarships/flagged',
  advisorScholarshipsController.getFlaggedScholarships,
)

// API 35
router.post(
  '/:id/scholarships/:scholarshipId/flag',
  advisorScholarshipsController.toggleFlag,
)


export default router