import {
  Router,
}
from 'express'

import {
  consentController,
}
from './consent.controller.js'

const router = Router()

// =====================================
// API 20 — Get All Consents
// =====================================

router.get(
  '/:id',
  consentController
    .getAllConsents,
)

// =====================================
// API 21 — Get Single Consent
// =====================================

router.get(
  '/:id/:type',
  consentController
    .getSingleConsent,
)

export default router