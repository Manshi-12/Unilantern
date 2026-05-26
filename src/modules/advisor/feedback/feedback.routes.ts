import {
  Router,
}
from 'express'

import {
  feedbackController,
}
from './feedback.controller.js'

const router = Router()

// =====================================
// API 62 — Submit Feedback
// =====================================

router.post(
  '/',
  feedbackController
    .submitFeedback,
)

export default router