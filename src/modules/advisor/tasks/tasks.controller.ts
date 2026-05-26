import type {
  Request,
  Response,
  NextFunction,
}
from 'express'

import {

  StudentIdParamSchema,

  TaskIdParamSchema,

  CreateTaskSchema,

  UpdateTaskSchema,

}
from './tasks.schema.js'

import {
  tasksService,
}
from './tasks.service.js'

export const tasksController = {

  // =====================================
  // API 42 — Get All Tasks
  // =====================================

  getAllTasks: async (

    req: Request,

    res: Response,

    next: NextFunction,

  ) => {

    try {

      const advisorId =
      res.locals.advisorId

      const result =
        await tasksService
          .getAllTasks(
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
  // API 43 — Get Student Tasks
  // =====================================

  getStudentTasks: async (

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
        await tasksService
          .getStudentTasks(

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
  // API 44 — Create Task
  // =====================================

  createTask: async (

    req: Request,

    res: Response,

    next: NextFunction,

  ) => {

    try {

      const body =
        CreateTaskSchema
          .parse(req.body)

      const advisorId =
      res.locals.advisorId

      const result =
        await tasksService
          .createTask(
            advisorId,
            body,
          )

      return res.status(201).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },

  // =====================================
  // API 45 — Update Task
  // =====================================

  updateTask: async (

    req: Request,

    res: Response,

    next: NextFunction,

  ) => {

    try {

      const parsed =
        TaskIdParamSchema
          .parse(req.params)

      const body =
        UpdateTaskSchema
          .parse(req.body)

      const taskId =
        Number(parsed.taskId)

      const advisorId =
      res.locals.advisorId

      const result =
        await tasksService
          .updateTask(

            taskId,

            advisorId,

            body,
          )

      return res.status(200).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },

  // =====================================
  // API 46 — Delete Task
  // =====================================

  deleteTask: async (

    req: Request,

    res: Response,

    next: NextFunction,

  ) => {

    try {

      const parsed =
        TaskIdParamSchema
          .parse(req.params)

      const taskId =
        Number(parsed.taskId)

      const advisorId =
      res.locals.advisorId

      const result =
        await tasksService
          .deleteTask(

            taskId,

            advisorId,
          )

      return res.status(200).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },
}