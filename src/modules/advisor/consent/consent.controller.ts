import type {
  Request,
  Response,
  NextFunction,
}
from 'express'

import {
  consentService,
}
from './consent.service.js'

import {
  StudentIdParamSchema,
  ConsentTypeParamSchema,
}
from './consent.schema.js'

export const consentController = {

  // =====================================
  // API 20 — Get All Consents
  // =====================================

  getAllConsents: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

      const parsed =
        StudentIdParamSchema
          .parse(req.params)

      const studentId =
        parseInt(
          parsed.id,
        )

      const result =
        await consentService
          .getAllConsents(
            studentId,
          )

      return res.status(200).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },

  // =====================================
  // API 21 — Get Single Consent
  // =====================================

  getSingleConsent: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

      const parsed =
        ConsentTypeParamSchema
          .parse(req.params)

      const studentId =
        parseInt(
          parsed.id,
        )

      const consentType =
        parsed.type

      const result =
        await consentService
          .getSingleConsent(
            studentId,
            consentType,
          )

      return res.status(200).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },
}