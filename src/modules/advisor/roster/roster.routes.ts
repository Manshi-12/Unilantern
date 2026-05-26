import { Router }
  from 'express'

import { rosterController }
  from './roster.controller.js'

const router = Router()

router.get(
  '/',
  rosterController.getRoster,
)

router.get(
  '/priority-queue',
  rosterController.getPriorityQueue,
)

router.get(
  '/filters',
  rosterController.getFilters,
)

export default router