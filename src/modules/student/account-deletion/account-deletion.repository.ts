import { sql, getPool } from "../../../db/client.js";
import { STUDENTS_TABLE } from "../../../db/schema/students.js";

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
}
