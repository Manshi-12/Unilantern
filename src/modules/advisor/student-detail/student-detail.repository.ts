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

            s.user_id AS student_id,
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
            ss.trend_direction,

            ISNULL(
              sc.saved_colleges,
              0
            ) AS saved_colleges,

            se.last_active_at

          FROM students s

          LEFT JOIN schools sch
            ON sch.school_id =
              s.school_id

          LEFT JOIN student_scores ss
            ON ss.student_id =
              s.user_id

          LEFT JOIN student_engagement se
            ON se.student_id =
              s.user_id

          LEFT JOIN (

            SELECT

              student_id,

              COUNT(*) AS saved_colleges

            FROM student_saved_colleges

            GROUP BY student_id

          ) sc
            ON sc.student_id =
              s.user_id

          WHERE s.user_id =
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

            academic_id,
            student_id,
            gpa,
            sat_score,
            act_score,
            honors_courses,
            ap_courses,
            created_at

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

            ec_id,
            student_id,
            activity_name,
            role_name,
            organization,
            start_date,
            end_date,
            description,
            created_at

          FROM student_extracurriculars

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
            prompt,
            content,
            created_at

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

            honor_id,
            student_id,
            title,
            issuer,
            awarded_at,
            description,
            created_at

          FROM student_honors

          WHERE student_id =
            @studentId

          ORDER BY
            awarded_at DESC
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
            organization,
            hours_completed,
            start_date,
            end_date,
            description,
            created_at

          FROM student_community_service

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
          SELECT TOP 1

            ec_sharing,
            essay_sharing

          FROM student_consent_settings

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