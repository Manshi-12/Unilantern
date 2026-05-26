import {
  getPool,
  sql,
}
from '../../../db/client.js'

import type {
  ConsentRecord,
  ConsentType,
}
from './consent.types.js'

export const consentRepository = {

  findAllByStudentId: async (
    studentId: number,
  ): Promise<ConsentRecord[]> => {

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
          SELECT *
          FROM student_consents
          WHERE student_id = @studentId
        `)

    return result.recordset
  },

  findByStudentAndType: async (
    studentId: number,
    consentType: ConsentType,
  ): Promise<
    ConsentRecord | null
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
          'consentType',
          sql.VarChar,
          consentType,
        )

        .query(`
          SELECT TOP 1 *
          FROM student_consents

          WHERE student_id =
            @studentId

          AND consent_type =
            @consentType
        `)

    return (
      result.recordset[0]
      || null
    )
  },
}