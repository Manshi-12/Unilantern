import {
  getPool,
  sql,
}
from '../../../db/client.js'

import type {

  AdvisorTask,

  TaskWithStudent,

}
from './tasks.types.js'

export const tasksRepository = {

  // =====================================
  // API 42 — Get All Tasks
  // =====================================

  findAllByAdvisor: async (

    advisorId: number,

  ): Promise<
    TaskWithStudent[]
  > => {

    const pool =
      await getPool()

    const result =
      await pool

        .request()

        .input(
          'advisorId',
          sql.Int,
          advisorId,
        )

        .query(`
          SELECT

            at.task_id,
            at.advisor_id,
            at.student_id,
            at.title,
            at.due_date,
            at.created_at,
            at.updated_at,
            at.deleted_at,

            s.full_name AS student_name

          FROM advisor_tasks at

          LEFT JOIN students s
            ON s.user_id =
              at.student_id

          WHERE at.advisor_id =
            @advisorId

            AND at.deleted_at
              IS NULL

          ORDER BY

            CASE
              WHEN at.due_date
                IS NULL
              THEN 1
              ELSE 0
            END,

            at.due_date ASC
        `)

    return result.recordset
  },

  // =====================================
  // API 43 — Get Student Tasks
  // =====================================

  findByStudentAndAdvisor: async (

    studentId: number,

    advisorId: number,

  ): Promise<
    AdvisorTask[]
  > => {

    const pool =
      await getPool()

    const result =
      await pool

        .request()

        .input(
          'studentId',
          sql.Int,
          studentId,
        )

        .input(
          'advisorId',
          sql.Int,
          advisorId,
        )

        .query(`
          SELECT

            task_id,
            advisor_id,
            student_id,
            title,
            due_date,
            created_at,
            updated_at,
            deleted_at

          FROM advisor_tasks

          WHERE student_id =
            @studentId

            AND advisor_id =
              @advisorId

            AND deleted_at
              IS NULL

          ORDER BY

            CASE
              WHEN due_date
                IS NULL
              THEN 1
              ELSE 0
            END,

            due_date ASC
        `)

    return result.recordset
  },

  // =====================================
  // Student Exists Check
  // =====================================

  checkStudentExists: async (

    studentId: number,

  ): Promise<boolean> => {

    const pool =
      await getPool()

    const result =
      await pool

        .request()

        .input(
          'studentId',
          sql.Int,
          studentId,
        )

        .query(`
          SELECT user_id

          FROM students

          WHERE user_id =
            @studentId
        `)

    return (
      result.recordset
        .length > 0
    )
  },

  // =====================================
  // API 44 — Create Task
  // =====================================

  createTask: async (

    data: {

      advisor_id: number

      student_id: number

      title: string

      due_date: Date
    },

  ): Promise<
    AdvisorTask
  > => {

    const pool =
      await getPool()

    const result =
      await pool

        .request()

        .input(
          'advisorId',
          sql.Int,
          data.advisor_id,
        )

        .input(
          'studentId',
          sql.Int,
          data.student_id,
        )

        .input(
          'title',
          sql.NVarChar(255),
          data.title,
        )

        .input(
          'dueDate',
          sql.Date,
          data.due_date,
        )

        .query(`
          INSERT INTO advisor_tasks (

            advisor_id,
            student_id,
            title,
            due_date,
            created_at,
            updated_at
          )

          OUTPUT INSERTED.*

          VALUES (

            @advisorId,
            @studentId,
            @title,
            @dueDate,
            GETDATE(),
            GETDATE()
          )
        `)

    return result.recordset[0]
  },

  // =====================================
  // Find Task By ID
  // =====================================

  findTaskById: async (

    taskId: number,

    advisorId: number,

  ): Promise<
    AdvisorTask | null
  > => {

    const pool =
      await getPool()

    const result =
      await pool

        .request()

        .input(
          'taskId',
          sql.Int,
          taskId,
        )

        .input(
          'advisorId',
          sql.Int,
          advisorId,
        )

        .query(`
          SELECT

            task_id,
            advisor_id,
            student_id,
            title,
            due_date,
            created_at,
            updated_at,
            deleted_at

          FROM advisor_tasks

          WHERE task_id =
            @taskId

            AND advisor_id =
              @advisorId

            AND deleted_at
              IS NULL
        `)

    return (
      result.recordset[0]
      || null
    )
  },

  // =====================================
  // API 45 — Update Task
  // =====================================

  updateTask: async (

    taskId: number,

    updates: {

      title?: string

      due_date?:
        Date | null
    },

  ): Promise<
    AdvisorTask
  > => {

    const pool =
      await getPool()

    const existingResult =
      await pool

        .request()

        .input(
          'taskId',
          sql.Int,
          taskId,
        )

        .query(`
          SELECT *

          FROM advisor_tasks

          WHERE task_id =
            @taskId
        `)

    const existing =
      existingResult
        .recordset[0]

    const updatedTitle =
      updates.title !== undefined
        ? updates.title
        : existing.title

    const updatedDueDate =
      updates.due_date !== undefined
        ? updates.due_date
        : existing.due_date

    const result =
      await pool

        .request()

        .input(
          'taskId',
          sql.Int,
          taskId,
        )

        .input(
          'title',
          sql.NVarChar(255),
          updatedTitle,
        )

        .input(
          'dueDate',
          sql.Date,
          updatedDueDate,
        )

        .query(`
          UPDATE advisor_tasks

          SET

            title =
              @title,

            due_date =
              @dueDate,

            updated_at =
              GETDATE()

          OUTPUT INSERTED.*

          WHERE task_id =
            @taskId
        `)

    return result.recordset[0]
  },

  // =====================================
  // API 46 — Delete Task
  // =====================================

  softDeleteTask: async (

    taskId: number,

    advisorId: number,

  ): Promise<void> => {

    const pool =
      await getPool()

    await pool

      .request()

      .input(
        'taskId',
        sql.Int,
        taskId,
      )

      .input(
        'advisorId',
        sql.Int,
        advisorId,
      )

      .query(`
        UPDATE advisor_tasks

        SET

          deleted_at =
            GETDATE(),

          updated_at =
            GETDATE()

        WHERE task_id =
          @taskId

          AND advisor_id =
            @advisorId

          AND deleted_at
            IS NULL
      `)
  },
}