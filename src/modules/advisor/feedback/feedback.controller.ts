import type {
  Request,
  Response,
  NextFunction,
}
from 'express'

import {
  feedbackService,
}
from './feedback.service.js'

import {
  SubmitFeedbackSchema,
}
from './feedback.schema.js'

export const feedbackController = {

  // =====================================
  // API 62 — Submit Feedback
  // =====================================

  submitFeedback: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

      const body =
        SubmitFeedbackSchema
          .parse(req.body)

      const advisorId =
      res.locals.advisorId

      const schoolId =
        res.locals.schoolId

      const advisorRole =
        res.locals.role

      const appVersion =
        (
          req.headers[
            'x-app-version'
          ] as string
        ) || null

      const deviceType =
        (
          req.headers[
            'x-device-type'
          ] as string
        ) || null

      const result =
        await feedbackService
          .submitFeedback(

            advisorId,

            schoolId,

            advisorRole,

            body,

            appVersion,

            deviceType,
          )

      return res.status(201).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },
}