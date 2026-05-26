import type {
    Request,
    Response,
    NextFunction,
  }
  from 'express'

  import {
    getPool,
    sql,
  }
  from '../../db/client.js'

  const getActionType = (
    req: Request,
  ): string => {

    const method =
      req.method

    const path =
      req.originalUrl

    // Auth
    if (path.includes('/login')) {
      return 'ADVISOR_LOGIN'
    }

    if (path.includes('/logout')) {
      return 'ADVISOR_LOGOUT'
    }

    // Notes
    if (
      method === 'POST' &&
      path.includes('/notes')
    ) {
      return 'CREATE_NOTE'
    }

    if (
      method === 'PUT' &&
      path.includes('/notes')
    ) {
      return 'UPDATE_NOTE'
    }

    if (
      method === 'DELETE' &&
      path.includes('/notes')
    ) {
      return 'DELETE_NOTE'
    }

    // Tasks
    if (
      method === 'POST' &&
      path.includes('/tasks')
    ) {
      return 'CREATE_TASK'
    }

    if (
      method === 'PUT' &&
      path.includes('/tasks')
    ) {
      return 'UPDATE_TASK'
    }

    if (
      method === 'DELETE' &&
      path.includes('/tasks')
    ) {
      return 'DELETE_TASK'
    }

    // Scholarships
    if (
      path.includes('/scholarships')
    ) {
      return 'SCHOLARSHIP_ACCESS'
    }

    // Student Access
    if (
      method === 'GET' &&
      path.includes('/students/')
    ) {
      return 'VIEW_STUDENT'
    }

    return 'GENERAL_ACCESS'
  }

  const getTargetResource = (
    req: Request,
  ): string => {

    const params =
      req.params

    if (params.taskId) {
      return `task/${params.taskId}`
    }

    if (params.noteId) {
      return `note/${params.noteId}`
    }

    if (params.id) {
      return `student/${params.id}`
    }

    return req.originalUrl
  }

  export const auditLogger = (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    res.on(
      'finish',
      async () => {


        try {

          // log only successful requests
          if (
            res.statusCode < 200 ||
            res.statusCode >= 300
          ) {
            return
          }

          const advisorId =
          res.locals.advisorId


          const role =
            res.locals.role

          const schoolId =
            res.locals.schoolId

          // skip public routes
          if (!advisorId) {
            return
          }

          const actionType =
            getActionType(req)

          const targetResource =
            getTargetResource(req)

          const metadata =
            JSON.stringify({
              method: req.method,
              path: req.originalUrl,
              status_code:
                res.statusCode,
              school_id:
                schoolId,
              ip: req.ip,
            })

          const pool =
            await getPool()

          await pool
            .request()
            .input(
              'advisorId',
              sql.Int,
              advisorId,
            )
            .input(
              'actorRole',
              sql.VarChar(30),
              role,
            )
            .input(
              'actionType',
              sql.VarChar(100),
              actionType,
            )
            .input(
              'targetResource',
              sql.VarChar(255),
              targetResource,
            )
            .input(
              'metadata',
              sql.NVarChar(sql.MAX),
              metadata,
            )
            .query(`
              INSERT INTO advisor_audit_logs (
                advisor_id,
                actor_role,
                action_type,
                target_resource,
                metadata
              )

              VALUES (
                @advisorId,
                @actorRole,
                @actionType,
                @targetResource,
                @metadata
              )
            `)

        } catch (err) {

          // never crash app
          console.error(
            '[AUDIT_LOG_ERROR]',
            err,
          )
        }
      },
    )

    next()
  }