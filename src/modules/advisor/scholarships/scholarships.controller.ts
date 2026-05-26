import type {
  Request,
  Response,
  NextFunction,
}
from 'express'

import {

  FlagBodySchema,

  FlagParamSchema,

  StudentIdParamSchema,

}
from './scholarships.schema.js'

import {
  advisorScholarshipsService,
}
from './scholarships.service.js'

export const advisorScholarshipsController = {

  // =====================================
  // API 34 — Get Flagged Scholarships
  // =====================================

  getFlaggedScholarships: async (

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

      const advisorId =
      res.locals.advisorId

      const result =
        await advisorScholarshipsService
          .getFlaggedScholarships(

            studentId,

            advisorId,
          )

      return res.status(200).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },

  // =====================================
  // API 35 — Flag / Unflag Scholarship
  // =====================================

  toggleFlag: async (

    req: Request,

    res: Response,

    next: NextFunction,

  ) => {

    try {

      const params =
        FlagParamSchema
          .parse(req.params)

      const body =
        FlagBodySchema
          .parse(req.body)

      const studentId =
        Number(params.id)

      const scholarshipId =
        Number(
          params.scholarshipId,
        )

      const advisorId =
      res.locals.advisorId

      const result =
        await advisorScholarshipsService
          .toggleFlag(

            studentId,

            advisorId,

            scholarshipId,

            body.action,

            body.note,
          )

      return res.status(200).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },
}