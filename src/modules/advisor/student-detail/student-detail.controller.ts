import type {
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
}
from './student-detail.schema.js'

import {
  studentDetailService,
}
from './student-detail.service.js'

export const studentDetailController = {

  // =====================================
  // API 10 — Student Summary
  // =====================================

  getStudentSummary: async (

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
        Number(parsed.data.id)

      const schoolId =
        res.locals.schoolId

      const result =
        await studentDetailService
          .getStudentSummary(

            studentId,

            schoolId,
          )

      return res.status(200).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },

  // =====================================
  // API 11 — Academics
  // =====================================

  getAcademics: async (

    req: Request,

    res: Response,

    next: NextFunction,

  ) => {

    try {

      const parsed =
        StudentIdParamSchema
          .parse(req.params)

      const studentId =
        Number(parsed.id)

      const result =
        await studentDetailService
          .getAcademics(
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
  // API 12 — Extracurriculars
  // =====================================

  getExtracurriculars: async (

    req: Request,

    res: Response,

    next: NextFunction,

  ) => {

    try {

      const parsed =
        StudentIdParamSchema
          .parse(req.params)

      const studentId =
        Number(parsed.id)

      const result =
        await studentDetailService
          .getExtracurriculars(
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
  // API 13 — Essay
  // =====================================

  getEssay: async (

    req: Request,

    res: Response,

    next: NextFunction,

  ) => {

    try {

      const parsed =
        StudentIdParamSchema
          .parse(req.params)

      const studentId =
        Number(parsed.id)

      const result =
        await studentDetailService
          .getEssay(
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
  // API 14 — Honors
  // =====================================

  getHonors: async (

    req: Request,

    res: Response,

    next: NextFunction,

  ) => {

    try {

      const parsed =
        StudentIdParamSchema
          .parse(req.params)

      const studentId =
        Number(parsed.id)

      const result =
        await studentDetailService
          .getHonors(
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
  // API 15 — Community Service
  // =====================================

  getCommunityService: async (

    req: Request,

    res: Response,

    next: NextFunction,

  ) => {

    try {

      const parsed =
        StudentIdParamSchema
          .parse(req.params)

      const studentId =
        Number(parsed.id)

      const result =
        await studentDetailService
          .getCommunityService(
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
  // API 16 — Missed Opportunities
  // =====================================

  getMissedOpportunities: async (

    req: Request,

    res: Response,

    next: NextFunction,

  ) => {

    try {

      const parsed =
        StudentIdParamSchema
          .parse(req.params)

      const studentId =
        Number(parsed.id)

      const schoolId =
        res.locals.schoolId

      const result =
        await studentDetailService
          .getMissedOpportunities(

            studentId,

            schoolId,
          )

      return res.status(200).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },
}