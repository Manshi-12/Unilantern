import {
  Request,
  Response,
  NextFunction,
}
from 'express'

import {
  BadRequestError,
}
from '../../../shared/errors/app-error.js'

import {
  StudentIdParamSchema,
  SchoolIdParamSchema,
}
from './readiness.schema.js'

import {
  readinessService,
}
from './readiness.service.js'

export const readinessController = {

  // =====================================
  // API 17 — Current Readiness
  // =====================================

  getCurrentReadiness: async (

    req: Request,

    res: Response,

    next: NextFunction,

  ) => {

    try {

      const parsed =
        StudentIdParamSchema
          .safeParse(req.params)

      if (!parsed.success) {

        throw new BadRequestError(
          parsed.error.issues[0]
            .message,
        )
      }

      const studentId =
        parseInt(
          parsed.data.studentId,
        )

      const result =
        await readinessService
          .getCurrentReadiness(
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
  // API 18 — Readiness History
  // =====================================

  getReadinessHistory: async (

    req: Request,

    res: Response,

    next: NextFunction,

  ) => {

    try {

      const parsed =
        StudentIdParamSchema
          .safeParse(req.params)

      if (!parsed.success) {

        throw new BadRequestError(
          parsed.error.issues[0]
            .message,
        )
      }

      const studentId =
        parseInt(
          parsed.data.studentId,
        )

      const result =
        await readinessService
          .getReadinessHistory(
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
  // API 19 — School Distribution
  // =====================================

  getSchoolDistribution: async (

    req: Request,

    res: Response,

    next: NextFunction,

  ) => {

    try {

      const parsed =
        SchoolIdParamSchema
          .safeParse(req.params)

      if (!parsed.success) {

        throw new BadRequestError(
          parsed.error.issues[0]
            .message,
        )
      }

      const schoolId =
        parseInt(
          parsed.data.schoolId,
        )

      const advisorSchoolId =
        res.locals.schoolId

      const result =
        await readinessService
          .getSchoolDistribution(

            schoolId,

            advisorSchoolId,
          )

      return res.status(200).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },
}