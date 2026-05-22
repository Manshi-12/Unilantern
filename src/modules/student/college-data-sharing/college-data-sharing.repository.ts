import { sql, getPool } from "../../../db/client.js";
import { STUDENTS_TABLE } from "../../../db/schema/students.js";
import { STUDENT_CONSENTS_TABLE } from "../../../db/schema/student-consents.js";

type RawRow = {
  student_id: number;
  college_data_sharing_enabled: boolean;
  updated_at: Date;
};

export class CollegeDataSharingRepository {
  async getPreference(studentId: number): Promise<RawRow | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<RawRow>(
        `SELECT TOP 1
            s.student_id,
            CAST(CASE
              WHEN c.status IS NULL THEN 1
              WHEN c.status = 'granted' THEN 1
              ELSE 0
            END AS bit) AS college_data_sharing_enabled,
            COALESCE(c.revoked_at, c.granted_at, c.created_at, s.updated_at) AS updated_at
           FROM ${STUDENTS_TABLE} s
           LEFT JOIN ${STUDENT_CONSENTS_TABLE} c
             ON c.student_id = s.student_id
            AND c.consent_type = 'college'
          WHERE s.student_id = @student_id;`,
      );
    return result.recordset[0] ?? null;
  }

  async updatePreference(
    studentId: number,
    enabled: boolean,
  ): Promise<RawRow | null> {
    const pool = await getPool();
    const exists = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<{ student_id: number }>(
        `SELECT TOP 1 student_id FROM ${STUDENTS_TABLE} WHERE student_id = @student_id;`,
      );

    if (!exists.recordset[0]) return null;

    const status = enabled ? "granted" : "revoked";
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .input("status", sql.VarChar(20), status)
      .input("now", sql.DateTimeOffset, new Date())
      .query<RawRow>(
        `MERGE ${STUDENT_CONSENTS_TABLE} AS tgt
         USING (SELECT @student_id AS student_id, 'college' AS consent_type) AS src
         ON tgt.student_id = src.student_id AND tgt.consent_type = src.consent_type
         WHEN MATCHED THEN
           UPDATE SET
             status = @status,
             granted_at = CASE WHEN @status = 'granted' THEN @now ELSE granted_at END,
             revoked_at = CASE WHEN @status = 'revoked' THEN @now ELSE NULL END,
             source = 'settings'
         WHEN NOT MATCHED THEN
           INSERT (student_id, consent_type, status, granted_at, revoked_at, source, version)
           VALUES (
             @student_id,
             'college',
             @status,
             CASE WHEN @status = 'granted' THEN @now ELSE NULL END,
             CASE WHEN @status = 'revoked' THEN @now ELSE NULL END,
             'settings',
             1
           )
         OUTPUT
           INSERTED.student_id,
           CAST(CASE WHEN INSERTED.status = 'granted' THEN 1 ELSE 0 END AS bit) AS college_data_sharing_enabled,
           COALESCE(INSERTED.revoked_at, INSERTED.granted_at, INSERTED.created_at) AS updated_at;`,
      );
    return result.recordset[0] ?? null;
  }
}
