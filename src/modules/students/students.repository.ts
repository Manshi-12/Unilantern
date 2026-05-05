import { sql, getPool } from "../../db/client.js";
import { STUDENTS_TABLE } from "../../db/schema/students.js";
import { STUDENT_PROFILES_TABLE } from "../../db/schema/student-profiles.js";
import type {
  StudentProfileRecord,
  UpdateStudentProfileData,
} from "./students.types.js";

type RawStudentRow = {
  student_id: number;
  school_id: number | null;
  role: "student";
  account_status: "independent" | "school_linked";
  is_active: boolean;
  phone_number: string;
  phone_verified: boolean;
  email: string | null;
  full_name: string;
  invite_token_used: string | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function mapStudent(row: RawStudentRow): RawStudentRow {
  return { ...row };
}

export class StudentsRepository {
  async findById(studentId: number): Promise<RawStudentRow | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<RawStudentRow>(
        `SELECT TOP 1 * FROM ${STUDENTS_TABLE} WHERE student_id = @student_id`,
      );
    const row = result.recordset[0];
    return row ? mapStudent(row) : null;
  }

  async getStudentProfileByStudentId(studentId: number): Promise<StudentProfileRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<RawStudentRow & {
        grade: number | null;
        graduation_year: number;
        high_school_name: string | null;
        state_of_residence: string | null;
        profile_complete: boolean;
        created_at: Date;
        updated_at: Date;
      }>(
        `SELECT TOP 1
            s.student_id,
            s.full_name,
            s.account_status,
            s.school_id,
            sp.grade,
            sp.graduation_year,
            sp.high_school_name,
            sp.state_of_residence,
            sp.profile_complete,
            sp.created_at,
            sp.updated_at
          FROM ${STUDENTS_TABLE} s
          INNER JOIN ${STUDENT_PROFILES_TABLE} sp
            ON s.student_id = sp.student_id
          WHERE s.student_id = @student_id`,
      );
    const row = result.recordset[0];
    return row
      ? {
          student_id: row.student_id,
          full_name: row.full_name,
          account_status: row.account_status,
          school_id: row.school_id,
          grade: row.grade,
          graduation_year: row.graduation_year,
          high_school_name: row.high_school_name,
          state_of_residence: row.state_of_residence,
          profile_complete: row.profile_complete,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }
      : null;
  }

  async updateStudentFullName(studentId: number, fullName: string): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .input("full_name", sql.VarChar(200), fullName)
      .query(
        `UPDATE ${STUDENTS_TABLE}
            SET full_name = @full_name,
                updated_at = SYSDATETIMEOFFSET()
          WHERE student_id = @student_id;`,
      );

    await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query(
        `UPDATE ${STUDENT_PROFILES_TABLE}
            SET updated_at = SYSDATETIMEOFFSET()
          WHERE student_id = @student_id;`,
      );
  }

  async updateStudentProfile(studentId: number, data: UpdateStudentProfileData): Promise<void> {
    const pool = await getPool();
    const setClauses: string[] = [];
    const request = pool.request().input("student_id", sql.Int, studentId);

    if (data.grade !== undefined) {
      request.input("grade", sql.SmallInt, data.grade);
      setClauses.push("grade = @grade");
    }
    if (data.graduation_year !== undefined) {
      request.input("graduation_year", sql.SmallInt, data.graduation_year);
      setClauses.push("graduation_year = @graduation_year");
    }
    if (data.high_school_name !== undefined) {
      request.input("high_school_name", sql.VarChar(300), data.high_school_name);
      setClauses.push("high_school_name = @high_school_name");
    }
    if (data.state_of_residence !== undefined) {
      request.input("state_of_residence", sql.VarChar(100), data.state_of_residence);
      setClauses.push("state_of_residence = @state_of_residence");
    }

    if (setClauses.length === 0) {
      return;
    }

    setClauses.push("updated_at = SYSDATETIMEOFFSET()");

    await request.query(
      `UPDATE ${STUDENT_PROFILES_TABLE}
          SET ${setClauses.join(", ")}
        WHERE student_id = @student_id;`,
    );
  }
}
