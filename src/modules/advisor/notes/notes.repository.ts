import {
  getPool,
  sql,
}
from '../../../db/client.js'

import type {
  AdvisorNote,
  NoteWithStudent,
}
from './notes.types.js'

export const notesRepository = {

  // =====================================
  // API 37
  // =====================================

  findAllByAdvisor: async (
    advisorId: number,
  ): Promise<
    NoteWithStudent[]
  > => {

    const pool =
      await getPool()

    const result =
      await pool.request()

        .input(
          'advisorId',
          sql.Int,
          advisorId,
        )

        .query(`
          SELECT
            an.note_id,
            an.advisor_id,
            an.student_id,
            an.content,
            an.tags,
            an.created_at,
            an.updated_at,
            an.deleted_at,
            s.full_name AS student_name

          FROM advisor_notes an

          INNER JOIN students s
            ON s.user_id =
              an.student_id

          WHERE
            an.advisor_id =
              @advisorId

            AND an.deleted_at
              IS NULL

          ORDER BY
            an.created_at DESC
        `)

    return result.recordset
  },

  // =====================================
  // API 38
  // =====================================

  findByStudentAndAdvisor: async (

    studentId: number,

    advisorId: number,

  ): Promise<
    AdvisorNote[]
  > => {

    const pool =
      await getPool()

    const result =
      await pool.request()

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
            note_id,
            advisor_id,
            student_id,
            content,
            tags,
            created_at,
            updated_at,
            deleted_at

          FROM advisor_notes

          WHERE
            student_id =
              @studentId

            AND advisor_id =
              @advisorId

            AND deleted_at
              IS NULL

          ORDER BY
            created_at DESC
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
      await pool.request()

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
  // API 39
  // =====================================

  createNote: async (
    data: {

      advisor_id: number

      student_id: number

      content: string

      tags:
        string | null
    },

  ): Promise<
    AdvisorNote
  > => {

    const pool =
      await getPool()

    const result =
      await pool.request()

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
          'content',
          sql.NVarChar(sql.MAX),
          data.content,
        )

        .input(
          'tags',
          sql.NVarChar(500),
          data.tags,
        )

        .query(`
          INSERT INTO advisor_notes (

            advisor_id,
            student_id,
            content,
            tags,
            created_at,
            updated_at
          )

          OUTPUT INSERTED.*

          VALUES (

            @advisorId,
            @studentId,
            @content,
            @tags,
            GETDATE(),
            GETDATE()
          )
        `)

    return result.recordset[0]
  },

  // =====================================
  // API 40
  // =====================================

  findNoteById: async (

    noteId: number,

    advisorId: number,

  ): Promise<
    AdvisorNote | null
  > => {

    const pool =
      await getPool()

    const result =
      await pool.request()

        .input(
          'noteId',
          sql.Int,
          noteId,
        )

        .input(
          'advisorId',
          sql.Int,
          advisorId,
        )

        .query(`
          SELECT
            note_id,
            advisor_id,
            student_id,
            content,
            tags,
            created_at,
            updated_at,
            deleted_at

          FROM advisor_notes

          WHERE
            note_id =
              @noteId

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
  // API 40
  // =====================================

  updateNote: async (

    noteId: number,

    updates: {
      content?: string
      tags?: string
    },

  ): Promise<
    AdvisorNote
  > => {

    const pool =
      await getPool()

    const existingResult =
      await pool.request()

        .input(
          'noteId',
          sql.Int,
          noteId,
        )

        .query(`
          SELECT *
          FROM advisor_notes
          WHERE note_id =
            @noteId
        `)

    const existing =
      existingResult
        .recordset[0]

    const updatedContent =
      updates.content !== undefined
        ? updates.content
        : existing.content

    const updatedTags =
      updates.tags !== undefined
        ? updates.tags
        : existing.tags

    const result =
      await pool.request()

        .input(
          'noteId',
          sql.Int,
          noteId,
        )

        .input(
          'content',
          sql.NVarChar(sql.MAX),
          updatedContent,
        )

        .input(
          'tags',
          sql.NVarChar(500),
          updatedTags,
        )

        .query(`
          UPDATE advisor_notes

          SET
            content =
              @content,

            tags =
              @tags,

            updated_at =
              GETDATE()

          OUTPUT INSERTED.*

          WHERE note_id =
            @noteId
        `)

    return result.recordset[0]
  },

  // =====================================
  // API 41
  // =====================================

  softDeleteNote: async (

    noteId: number,

    advisorId: number,

  ): Promise<void> => {

    const pool =
      await getPool()

    await pool.request()

      .input(
        'noteId',
        sql.Int,
        noteId,
      )

      .input(
        'advisorId',
        sql.Int,
        advisorId,
      )

      .query(`
        UPDATE advisor_notes

        SET
          deleted_at =
            GETDATE(),

          updated_at =
            GETDATE()

        WHERE
          note_id =
            @noteId

          AND advisor_id =
            @advisorId

          AND deleted_at
            IS NULL
      `)
  },
}