import {
  Router,
}
from 'express'

import {
  collegesController,
}
from './colleges.controller.js'

const router = Router()

// =====================================
// API 24 — Search Colleges
// =====================================

router.get(
  '/',
  collegesController
    .searchColleges,
)

export default router