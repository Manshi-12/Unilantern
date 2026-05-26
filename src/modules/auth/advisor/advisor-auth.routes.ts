import { Router } from 'express'

import { advisorAuthController } from './advisor-auth.controller.js'

import { authenticate } from '../../../shared/middleware/authenticate.js'

const router = Router()

// API 1 — Validate invite token (public)
router.get(
  '/invite/validate/:token',
  advisorAuthController.validateInviteToken
)

// API 2 — Register advisor (public)
router.post(
  '/register',
  advisorAuthController.registerAdvisor
)

// API 3 — Login advisor (public)
router.post(
  '/login',
  advisorAuthController.loginAdvisor
)

// API 4 — Logout advisor (protected)
router.post(
  '/logout',
  authenticate,
  advisorAuthController.logoutAdvisor
)

router.post(
    '/refresh',
    advisorAuthController.refreshToken
  )
  
  router.post(
    '/change-password',
    authenticate,
    advisorAuthController.changePassword
  )

export default router