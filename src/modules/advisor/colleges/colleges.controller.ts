import type {
  Request,
  Response,
  NextFunction,
}
from 'express'

import {
  collegesService,
}
from './colleges.service.js'

import {
  CollegeSearchSchema,
}
from './colleges.schema.js'

export const collegesController = {

  // =====================================
  // API 24 — Search Colleges
  // =====================================

  searchColleges: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

      const parsed =
        CollegeSearchSchema
          .parse(req.query)

      const result =
        await collegesService
          .searchColleges(parsed)

      return res.status(200).json({
        data:
          result.colleges,

        meta:
          result.meta,
      })

    } catch (err) {

      next(err)
    }
  },
}