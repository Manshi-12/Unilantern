import { Router }
  from 'express'

import { advisorScholarshipsController }
  from './scholarships.controller.js'

const router = Router()

// API 34
router.get(
  '/student/:id/flagged',
  advisorScholarshipsController.getFlaggedScholarships,
)

// API 35
router.post(
  '/student/:id/:scholarshipId/flag',
  advisorScholarshipsController.toggleFlag,
)


export default router