import { sql, getPool } from "../../../db/client.js";
import { STUDENTS_TABLE } from "../../../db/schema/students.js";
import { STUDENT_SESSIONS_TABLE } from "../../../db/schema/student-sessions.js";
import { STUDENT_CONSENTS_TABLE } from "../../../db/schema/student-consents.js";
import { AUDIT_LOGS_TABLE } from "../../../db/schema/audit-logs.js";

export class AccountDeletionRepository {
  async softDeleteUser(userId: string): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("student_id", sql.Int, Number(userId))
      .query(
        `UPDATE ${STUDENTS_TABLE}
            SET is_active = 0,
                deleted_at = SYSDATETIMEOFFSET(),
                updated_at = SYSDATETIMEOFFSET()
          WHERE student_id = @student_id;`,
      );
  }

  async revokeAllSessions(studentId: number): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query(
        `UPDATE ${STUDENT_SESSIONS_TABLE}
            SET revoked_at = SYSDATETIMEOFFSET()
          WHERE student_id = @student_id
            AND revoked_at IS NULL;`,
      );
  }

  async revokeAllActiveConsents(studentId: number): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query(
        `UPDATE ${STUDENT_CONSENTS_TABLE}
            SET status = 'revoked',
                revoked_at = COALESCE(revoked_at, SYSDATETIMEOFFSET())
          WHERE student_id = @student_id
            AND status = 'granted';`,
      );
  }

  async writeDeletionAuditLog(studentId: number): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("actor_id", sql.Int, studentId)
      .input("target_resource", sql.VarChar(150), `students:${studentId}`)
      .query(
        `INSERT INTO ${AUDIT_LOGS_TABLE}
            (actor_id, actor_role, action_type, target_resource, metadata)
         VALUES
            (@actor_id, 'student', 'account_delete', @target_resource, '{}');`,
      );
  }
}
