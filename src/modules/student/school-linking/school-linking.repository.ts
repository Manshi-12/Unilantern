import { sql, getPool } from "../../../db/client.js";
import { SCHOOLS_TABLE } from "../../../db/schema/schools.js";
import { STUDENTS_TABLE } from "../../../db/schema/students.js";
import { STUDENT_PROFILES_TABLE } from "../../../db/schema/student-profiles.js";
import type { SchoolRecord, StudentLinkRecord } from "./school-linking.types.js";

export class SchoolLinkingRepository {
  async searchSchools(q: string, state: string | undefined, limit: number): Promise<SchoolRecord[]> {
    const pool = await getPool();
    const request = pool.request()
      .input("q", sql.VarChar(302), `%${q}%`)
      .input("limit", sql.Int, limit);

    let stateFilter = "";
    if (state) {
      request.input("state", sql.VarChar(100), state);
      stateFilter = "AND state = @state";
    }

    const result = await request.query<SchoolRecord>(`
      SELECT TOP (@limit)
        school_id, school_name, state, school_type, email_domain,
        school_status, dashboard_enabled, is_active
      FROM ${SCHOOLS_TABLE}
      WHERE is_active = 1
        AND school_name LIKE @q
        ${stateFilter}
      ORDER BY
        CASE WHEN school_name LIKE REPLACE(@q, '%', '') + '%' THEN 0 ELSE 1 END,
        school_name ASC;
    `);

    return result.recordset;
  }

  async findSchoolById(schoolId: number): Promise<SchoolRecord | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input("school_id", sql.Int, schoolId)
      .query<SchoolRecord>(`
        SELECT TOP 1
          school_id, school_name, state, school_type, email_domain,
          school_status, dashboard_enabled, is_active
        FROM ${SCHOOLS_TABLE}
        WHERE school_id = @school_id;
      `);

    return result.recordset[0] ?? null;
  }

  async findStudentForLinking(studentId: number): Promise<StudentLinkRecord | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input("student_id", sql.Int, studentId)
      .query<StudentLinkRecord>(`
        SELECT TOP 1
          s.student_id,
          s.full_name,
          s.phone_number,
          s.email,
          s.school_id,
          s.account_status,
          sp.graduation_year,
          sp.high_school_name
        FROM ${STUDENTS_TABLE} s
        LEFT JOIN ${STUDENT_PROFILES_TABLE} sp ON sp.student_id = s.student_id
        WHERE s.student_id = @student_id
          AND s.is_active = 1;
      `);

    return result.recordset[0] ?? null;
  }

  async findMergeCandidates(data: {
    studentId: number;
    schoolId: number;
    schoolEmail?: string;
    fullName: string;
    graduationYear: number | null;
  }): Promise<StudentLinkRecord[]> {
    const pool = await getPool();
    const request = pool.request()
      .input("student_id", sql.Int, data.studentId)
      .input("school_id", sql.Int, data.schoolId)
      .input("full_name", sql.VarChar(200), data.fullName)
      .input("graduation_year", sql.SmallInt, data.graduationYear)
      .input("school_email", sql.VarChar(320), data.schoolEmail ?? null);

    const result = await request.query<StudentLinkRecord>(`
      SELECT TOP 5
        s.student_id,
        s.full_name,
        s.phone_number,
        s.email,
        s.school_id,
        s.account_status,
        sp.graduation_year,
        sp.high_school_name
      FROM ${STUDENTS_TABLE} s
      LEFT JOIN ${STUDENT_PROFILES_TABLE} sp ON sp.student_id = s.student_id
      WHERE s.student_id <> @student_id
        AND s.is_active = 1
        AND (
          (s.school_id = @school_id AND s.full_name = @full_name AND sp.graduation_year = @graduation_year)
          OR (@school_email IS NOT NULL AND s.email = @school_email)
        )
      ORDER BY s.updated_at DESC;
    `);

    return result.recordset;
  }

  async linkStudentToSchool(studentId: number, schoolId: number, schoolEmail?: string): Promise<void> {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const studentRequest = new sql.Request(transaction)
        .input("student_id", sql.Int, studentId)
        .input("school_id", sql.Int, schoolId)
        .input("email", sql.VarChar(320), schoolEmail ?? null);

      await studentRequest.query(`
        UPDATE ${STUDENTS_TABLE}
        SET school_id = @school_id,
            account_status = 'school_linked',
            email = COALESCE(@email, email),
            updated_at = SYSDATETIMEOFFSET()
        WHERE student_id = @student_id;
      `);

      await new sql.Request(transaction)
        .input("student_id", sql.Int, studentId)
        .input("school_id", sql.Int, schoolId)
        .query(`
          UPDATE ${STUDENT_PROFILES_TABLE}
          SET school_id = @school_id,
              updated_at = SYSDATETIMEOFFSET()
          WHERE student_id = @student_id;
        `);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
