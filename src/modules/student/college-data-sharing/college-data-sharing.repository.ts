import { sql, getPool } from "../../../db/client.js";
import { STUDENTS_TABLE } from "../../../db/schema/students.js";

type RawRow = {
  student_id: number;
  college_data_sharing_enabled: boolean;
  updated_at: Date;
};

export class CollegeDataSharingRepository {
  // ── Update opt-out preference and return the new state ──────────────────
  async updatePreference(
    studentId: number,
    enabled: boolean,
  ): Promise<RawRow | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .input("enabled", sql.Bit, enabled)
      .query<RawRow>(
        `UPDATE ${STUDENTS_TABLE}
         SET college_data_sharing_enabled = @enabled,
             updated_at                   = SYSDATETIMEOFFSET()
         OUTPUT INSERTED.student_id,
                INSERTED.college_data_sharing_enabled,
                INSERTED.updated_at
         WHERE student_id = @student_id;`,
      );
    return result.recordset[0] ?? null;
  }
}
