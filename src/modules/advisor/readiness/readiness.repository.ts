import {
  getPool,
  sql,
}
from '../../../db/client.js'

import type {

  ReadinessCurrent,

  ReadinessSnapshot,

}
from './readiness.types.js'

export const readinessRepository = {

  // =====================================
  // Student Exists
  // =====================================

  studentExists: async (

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
          SELECT 1

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
  // API 17
  // =====================================

  findCurrentByStudentId: async (

    studentId: number,

  ): Promise<
    ReadinessCurrent | null
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

        .query(`
          SELECT

            student_id,
            readiness_band,
            on_track_status,
            trend_direction,
            primary_limiter,

            academics_band,
            ec_band,
            essay_band,
            awards_band,
            service_band,

            calculated_at

          FROM student_scores

          WHERE student_id =
            @studentId
        `)

    return (
      result.recordset[0]
      || null
    )
  },

  // =====================================
  // API 18
  // =====================================

  findHistoryByStudentId: async (

    studentId: number,

  ): Promise<
    ReadinessSnapshot[]
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

        .query(`
          SELECT

            snapshot_term,
            grade_at_snapshot,
            readiness_band,

            academics_band,
            ec_band,
            essay_band,
            awards_band,
            service_band,

            primary_limiter,
            trend_direction,
            snapshot_at

          FROM student_score_history

          WHERE student_id =
            @studentId

          ORDER BY
            snapshot_at DESC
        `)

    return result.recordset
  },

  // =====================================
  // API 19
  // =====================================

  findDistributionBySchoolId: async (

    schoolId: number,

  ): Promise<
    {
      band: string
      count: number
    }[]
  > => {

    const pool =
      await getPool()

    const result =
      await pool.request()

        .input(
          'schoolId',
          sql.Int,
          schoolId,
        )

        .query(`
          SELECT

            ss.readiness_band
              AS band,

            COUNT(*) AS count

          FROM student_scores ss

          INNER JOIN students s
            ON s.user_id =
              ss.student_id

          WHERE s.school_id =
            @schoolId

          GROUP BY
            ss.readiness_band
        `)

    return result.recordset
  },
}