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

          WHERE student_id =
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

          ss.student_id,
          ss.readiness_band,
          ss.on_track_status,

          sh.trend_direction,

          ss.primary_limiter,

          ss.academics_band,
          ss.ec_band,
          ss.essay_band,
          ss.awards_band,
          ss.service_band,

          ss.updated_at AS calculated_at

        FROM student_scores ss

        LEFT JOIN (

          SELECT
            student_id,
            trend_direction,

            ROW_NUMBER() OVER (
              PARTITION BY student_id
              ORDER BY snapshot_at DESC
            ) AS rn

          FROM student_score_history

        ) sh
          ON sh.student_id =
            ss.student_id

         AND sh.rn = 1

        WHERE ss.student_id =
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
            ON s.student_id =
              ss.student_id

          WHERE s.school_id =
            @schoolId

          GROUP BY
            ss.readiness_band
        `)

    return result.recordset
  },
  
  checkSchoolExists: async (

  schoolId: number,

): Promise<boolean> => {

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
        SELECT school_id

        FROM schools

        WHERE school_id =
          @schoolId
      `)

  return (
    result.recordset.length > 0
  )
},
}