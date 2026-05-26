import {
  getPool,
  sql,
}
from '../../../db/client.js'

import type {

  FlaggedScholarship,

  Scholarship,

}
from './scholarships.types.js'

export const advisorScholarshipsRepository = {

  findScholarshipById: async (

    scholarshipId: number,

  ): Promise<
    Scholarship | null
  > => {

    const pool =
      await getPool()

    const result =
      await pool.request()

        .input(
          'scholarshipId',
          sql.Int,
          scholarshipId,
        )

        .query(`
          SELECT
            scholarship_id,
            scholarship_name,
            provider,
            college_id,
            eligibility_summary,
            deadline,
            award_amount,
            application_link,
            scholarship_type,
            applicable_grad_years

          FROM scholarships

          WHERE scholarship_id =
            @scholarshipId
        `)

    return (
      result.recordset[0]
      || null
    )
  },

  findExistingFlag: async (

    studentId: number,

    advisorId: number,

    scholarshipId: number,

  ): Promise<
    FlaggedScholarship | null
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

        .input(
          'scholarshipId',
          sql.Int,
          scholarshipId,
        )

        .query(`
          SELECT TOP 1

            afs.flag_id,
            afs.advisor_id,
            afs.student_id,
            afs.scholarship_id,
            afs.note,
            afs.flagged_at,

            s.scholarship_name,
            s.provider,
            s.college_id,
            s.eligibility_summary,
            s.deadline,
            s.award_amount,
            s.application_link,
            s.scholarship_type,
            s.applicable_grad_years

          FROM advisor_flagged_scholarships afs

          INNER JOIN scholarships s
            ON s.scholarship_id =
              afs.scholarship_id

          WHERE afs.student_id =
            @studentId

            AND afs.advisor_id =
              @advisorId

            AND afs.scholarship_id =
              @scholarshipId
        `)

    const row =
      result.recordset[0]

    if (!row) {

      return null
    }

    return {

      flag_id:
        row.flag_id,

      advisor_id:
        row.advisor_id,

      student_id:
        row.student_id,

      scholarship_id:
        row.scholarship_id,

      note:
        row.note,

      flagged_at:
        row.flagged_at,

      scholarship: {

        scholarship_id:
          row.scholarship_id,

        scholarship_name:
          row.scholarship_name,

        provider:
          row.provider,

        college_id:
          row.college_id,

        eligibility_summary:
          row.eligibility_summary,

        deadline:
          row.deadline,

        award_amount:
          row.award_amount,

        application_link:
          row.application_link,

        scholarship_type:
          row.scholarship_type,

        applicable_grad_years:
          row.applicable_grad_years,
      },
    }
  },

  createFlag: async (

    data: {

      advisor_id: number

      student_id: number

      scholarship_id: number

      note:
        string | null
    },

  ): Promise<number> => {

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
          'scholarshipId',
          sql.Int,
          data.scholarship_id,
        )

        .input(
          'note',
          sql.NVarChar,
          data.note,
        )

        .query(`
          INSERT INTO advisor_flagged_scholarships (

            advisor_id,
            student_id,
            scholarship_id,
            note,
            flagged_at
          )

          OUTPUT INSERTED.flag_id

          VALUES (

            @advisorId,
            @studentId,
            @scholarshipId,
            @note,
            GETUTCDATE()
          )
        `)

    return result.recordset[0]
      .flag_id
  },

  findFlaggedByStudentAndAdvisor: async (

    studentId: number,

    advisorId: number,

  ): Promise<
    FlaggedScholarship[]
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

            afs.flag_id,
            afs.advisor_id,
            afs.student_id,
            afs.scholarship_id,
            afs.note,
            afs.flagged_at,

            s.scholarship_name,
            s.provider,
            s.college_id,
            s.eligibility_summary,
            s.deadline,
            s.award_amount,
            s.application_link,
            s.scholarship_type,
            s.applicable_grad_years

          FROM advisor_flagged_scholarships afs

          INNER JOIN scholarships s
            ON s.scholarship_id =
              afs.scholarship_id

          WHERE afs.student_id =
            @studentId

            AND afs.advisor_id =
              @advisorId

          ORDER BY
            afs.flagged_at DESC
        `)

    return result.recordset.map(
      (row) => ({

        flag_id:
          row.flag_id,

        advisor_id:
          row.advisor_id,

        student_id:
          row.student_id,

        scholarship_id:
          row.scholarship_id,

        note:
          row.note,

        flagged_at:
          row.flagged_at,

        scholarship: {

          scholarship_id:
            row.scholarship_id,

          scholarship_name:
            row.scholarship_name,

          provider:
            row.provider,

          college_id:
            row.college_id,

          eligibility_summary:
            row.eligibility_summary,

          deadline:
            row.deadline,

          award_amount:
            row.award_amount,

          application_link:
            row.application_link,

          scholarship_type:
            row.scholarship_type,

          applicable_grad_years:
            row.applicable_grad_years,
        },
      }),
    )
  },

  deleteFlag: async (

    studentId: number,

    advisorId: number,

    scholarshipId: number,

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

        .input(
          'advisorId',
          sql.Int,
          advisorId,
        )

        .input(
          'scholarshipId',
          sql.Int,
          scholarshipId,
        )

        .query(`
          DELETE FROM
            advisor_flagged_scholarships

          WHERE student_id =
            @studentId

            AND advisor_id =
              @advisorId

            AND scholarship_id =
              @scholarshipId
        `)

    return (
      result.rowsAffected[0] > 0
    )
  },
}