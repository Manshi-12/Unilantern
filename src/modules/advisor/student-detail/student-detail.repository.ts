import {
  getPool,
  sql,
}
from '../../../db/client.js'

import type {

  StudentSummary,

  StudentAcademics,

  StudentExtracurricular,

  StudentEssay,

  StudentHonor,

  StudentService,

}
from './student-detail.types.js'

export const studentDetailRepository = {

  // =====================================
  // API 10 — Student Summary
  // =====================================

  findStudentById: async (

    studentId: number,

    schoolId: number,

  ): Promise<
    StudentSummary | null
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
          'schoolId',
          sql.Int,
          schoolId,
        )

        .query(`
          SELECT

            s.student_id AS student_id,
            s.full_name,

            sch.school_name,

            ss.readiness_band,
            ss.on_track_status,

            ss.academics_band,
            ss.ec_band,
            ss.essay_band,
            ss.awards_band,
            ss.service_band,

            ss.primary_limiter,

            CASE
              WHEN sh.trend_direction = 'improving'
                THEN 'improving'

              WHEN sh.trend_direction = 'declining'
                THEN 'declining'

              ELSE 'stable'
            END AS trend,

            ISNULL(
              sc.saved_colleges,
              0
            ) AS saved_colleges,

            s.last_login_at AS last_login_at

          FROM students s

          LEFT JOIN schools sch
            ON sch.school_id =
              s.school_id

          LEFT JOIN student_scores ss
            ON ss.student_id =
              s.student_id

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
              s.student_id
           AND sh.rn = 1

          LEFT JOIN (

            SELECT

              student_id,

              COUNT(*) AS saved_colleges

            FROM student_saved_colleges

            GROUP BY student_id

          ) sc
            ON sc.student_id =
              s.student_id

          WHERE s.student_id =
            @studentId

            AND s.school_id =
              @schoolId
        `)

    return (
      result.recordset[0]
      || null
    )
  },

  // =====================================
  // API 11 — Academics
  // =====================================

  findAcademics: async (

    studentId: number,

  ): Promise<
    StudentAcademics[]
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

  academics_id,
  student_id,
  unweighted_gpa,
  course_rigor,
  test_status,
  sat_score,
  act_score,
  created_at,
  updated_at

          FROM student_academics

          WHERE student_id =
            @studentId

          ORDER BY
            created_at DESC
        `)

    return result.recordset
  },

  // =====================================
  // API 12 — Extracurriculars
  // =====================================

  findExtracurriculars: async (

    studentId: number,

  ): Promise<
    StudentExtracurricular[]
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

  activity_id,
  student_id,
  activity_name,
  activity_type,
  years_involved,
  involvement_level,
  activity_description,
  impact_text,
  impact_level,
  hours_per_week,
  experience_duration_weeks,
  created_at,
  updated_at

FROM extracurricular_activities

WHERE student_id =
  @studentId

ORDER BY
  created_at DESC
        `)

    return result.recordset
  },

  // =====================================
  // API 13 — Essay
  // =====================================

  findEssay: async (

    studentId: number,

  ): Promise<
    StudentEssay | null
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
          SELECT TOP 1

  essay_id,
  student_id,
  essay_prompt,
  essay_text,
  word_count,
  essay_status,
  reviewed_at,
  finalized_at,
  created_at,
  updated_at

FROM student_essays

WHERE student_id =
  @studentId

ORDER BY
  created_at DESC
        `)

    return (
      result.recordset[0]
      || null
    )
  },

  // =====================================
  // API 14 — Honors
  // =====================================

  findHonors: async (

    studentId: number,

  ): Promise<
    StudentHonor[]
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

  award_id,
  student_id,
  award_name,
  award_level,
  frequency,
  annual_since_grade,
  display_order,
  created_at,
  updated_at

FROM honors_awards

WHERE student_id =
  @studentId

ORDER BY
  created_at DESC
        `)

    return result.recordset
  },

  // =====================================
  // API 15 — Community Service
  // =====================================

  findServices: async (

    studentId: number,

  ): Promise<
    StudentService[]
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

  service_id,
  student_id,
  total_hours_range,
  action_type,
  is_leadership,
  duration_months,
  display_order,
  description,
  created_at,
  updated_at

FROM community_service_entries

WHERE student_id =
  @studentId

ORDER BY
  created_at DESC
        `)

    return result.recordset
  },

  // =====================================
  // Consent Status
  // =====================================

  getConsentStatus: async (

    studentId: number,

  ): Promise<{

    ec_sharing: boolean

    essay_sharing: boolean

  }> => {

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

  MAX(
    CASE
      WHEN consent_type = 'ec_sharing'
       AND status = 'granted'
      THEN 1
      ELSE 0
    END
  ) AS ec_sharing,

  MAX(
    CASE
      WHEN consent_type = 'essay_sharing'
       AND status = 'granted'
      THEN 1
      ELSE 0
    END
  ) AS essay_sharing

FROM student_consents

WHERE student_id =
  @studentId
        `)

    if (
      result.recordset.length === 0
    ) {

      return {

        ec_sharing: false,

        essay_sharing: false,
      }
    }

    return {

      ec_sharing:
        result.recordset[0]
          .ec_sharing,

      essay_sharing:
        result.recordset[0]
          .essay_sharing,
    }
  },
}