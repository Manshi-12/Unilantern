import { getPool, sql } from '../../../db/client.js'

import type {
  RosterFilters,
  RosterStudent,
} from './roster.types.js'

export const rosterRepository = {

  getStudents: async (
    schoolId: number,
    filters: RosterFilters,
  ): Promise<{
    students: RosterStudent[]
    total: number
  }> => {

    const pool = await getPool()

    const conditions: string[] = [
      's.school_id = @schoolId',
    ]

    if (filters.readiness_band) {
      conditions.push(
        'ss.readiness_band = @readinessBand'
      )
    }

    if (filters.needs_intervention) {
      conditions.push(`
        (
          ss.readiness_band IN (
            'foundational',
            'developing'
          )
          OR sh.trend_direction = 'declining'
        )
      `)
    }

    if (filters.saved_selective) {
      conditions.push(`
        ISNULL(sc.saved_colleges, 0) >= 3
      `)
    }

    if (filters.low_engagement) {
      conditions.push(`
        (
          s.last_login_at IS NULL
          OR s.last_login_at < DATEADD(DAY, -14, GETDATE())
        )
      `)
    }

    const whereClause = conditions.join(' AND ')

    const countResult = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input(
        'readinessBand',
        sql.VarChar,
        filters.readiness_band ?? null,
      )
      .query(`
        SELECT COUNT(*) AS total
        FROM students s

        LEFT JOIN student_scores ss
          ON ss.student_id = s.student_id

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
          ON sh.student_id = s.student_id
         AND sh.rn = 1

        LEFT JOIN (
          SELECT
            student_id,
            COUNT(*) AS saved_colleges
          FROM student_saved_colleges
          GROUP BY student_id
        ) sc
          ON sc.student_id = s.student_id

        WHERE ${whereClause}
      `)

    const total =
      countResult.recordset[0]?.total ?? 0

    const offset =
      (filters.page - 1) * filters.limit

    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input(
        'readinessBand',
        sql.VarChar,
        filters.readiness_band ?? null,
      )
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, filters.limit)

      .query(`
        SELECT
          s.student_id AS student_id,
          s.full_name,

          ss.readiness_band,
          ss.primary_limiter AS primary_gap,

          CASE
            WHEN sh.trend_direction = 'improving'
              THEN 'improving'

            WHEN sh.trend_direction = 'declining'
              THEN 'declining'

            ELSE 'stable'
          END AS trend,

          ISNULL(sc.saved_colleges, 0)
            AS saved_colleges,

          s.last_login_at AS last_active,

          CASE
            WHEN s.last_login_at IS NULL
              OR s.last_login_at < DATEADD(DAY, -14, GETDATE())
            THEN CAST(1 AS BIT)

            ELSE CAST(0 AS BIT)
          END AS low_engagement

        FROM students s

        LEFT JOIN student_scores ss
          ON ss.student_id = s.student_id

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
          ON sh.student_id = s.student_id
         AND sh.rn = 1

        LEFT JOIN (
          SELECT
            student_id,
            COUNT(*) AS saved_colleges
          FROM student_saved_colleges
          GROUP BY student_id
        ) sc
          ON sc.student_id = s.student_id

        WHERE ${whereClause}

        ORDER BY s.full_name ASC

        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `)

    return {
      students: result.recordset,
      total,
    }
  },

  getAllStudents: async (
    schoolId: number,
  ): Promise<RosterStudent[]> => {

    const pool = await getPool()

    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)

      .query(`
        SELECT
          s.student_id AS student_id,
          s.full_name,

          ss.readiness_band,
          ss.primary_limiter AS primary_gap,

          CASE
            WHEN sh.trend_direction = 'improving'
              THEN '↑'

            WHEN sh.trend_direction = 'declining'
              THEN '↓'

            ELSE '→'
          END AS trend,

          ISNULL(sc.saved_colleges, 0)
            AS saved_colleges,

          s.last_login_at AS last_active,

          CASE
            WHEN s.last_login_at IS NULL
              OR s.last_login_at < DATEADD(DAY, -14, GETDATE())
            THEN CAST(1 AS BIT)

            ELSE CAST(0 AS BIT)
          END AS low_engagement

        FROM students s

        LEFT JOIN student_scores ss
          ON ss.student_id = s.student_id

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
          ON sh.student_id = s.student_id
         AND sh.rn = 1

        LEFT JOIN (
          SELECT
            student_id,
            COUNT(*) AS saved_colleges
          FROM student_saved_colleges
          GROUP BY student_id
        ) sc
          ON sc.student_id = s.student_id

        WHERE s.school_id = @schoolId

        ORDER BY s.full_name ASC
      `)

    return result.recordset
  },
}