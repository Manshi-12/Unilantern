import { Router }
  from 'express'

import { studentDetailController }
  from './student-detail.controller.js'

const router = Router()

router.get('/:id',
  studentDetailController.getStudentSummary)

router.get('/:id/academics',
  studentDetailController.getAcademics)

router.get('/:id/extracurriculars',
  studentDetailController.getExtracurriculars)

router.get('/:id/essay',
  studentDetailController.getEssay)

router.get('/:id/honors',
  studentDetailController.getHonors)

router.get('/:id/community-service',
  studentDetailController.getCommunityService)

router.get('/:id/missed-opportunities',
  studentDetailController.getMissedOpportunities)

export default router