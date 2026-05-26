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
  rosterService,
}
from './roster.service.js'

import {
  RosterQuerySchema,
}
from './roster.schema.js'

export const rosterController = {

  // =====================================
  // API 7 — Get Roster
  // =====================================

  getRoster: async (

    req: Request,

    res: Response,

    next: NextFunction,

  ) => {

    try {

      const parsed =
        RosterQuerySchema.safeParse(
          req.query,
        )

      if (!parsed.success) {

        const firstError =
          parsed.error.issues[0]

        throw new BadRequestError(
          firstError.message,
        )
      }

      const schoolId =
        res.locals.schoolId

      const result =
        await rosterService.getRoster(

          schoolId,

          parsed.data,
        )

      return res.status(200).json({

        data:
          result.students,

        meta:
          result.meta,
      })

    } catch (err) {

      next(err)
    }
  },

  // =====================================
  // API 8 — Priority Queue
  // =====================================

  getPriorityQueue: async (

    req: Request,

    res: Response,

    next: NextFunction,

  ) => {

    try {

      const schoolId =
        res.locals.schoolId

      const result =
        await rosterService
          .getPriorityQueue(
            schoolId,
          )

      return res.status(200).json({

        data:
          result.students,
      })

    } catch (err) {

      next(err)
    }
  },

  // =====================================
  // API 9 — Filters
  // =====================================

  getFilters: async (

    req: Request,

    res: Response,

    next: NextFunction,

  ) => {

    try {

      const result =
        await rosterService
          .getFilters()

      return res.status(200).json({

        data:
          result,
      })

    } catch (err) {

      next(err)
    }
  },
}