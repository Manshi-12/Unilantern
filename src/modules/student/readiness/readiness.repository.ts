import { sql, getPool } from "../../../db/client.js";
import { STUDENT_SCORES_TABLE } from "../../../db/schema/student-scores.js";
import { STUDENT_SCORE_HISTORY_TABLE } from "../../../db/schema/student-score-history.js";
import { STUDENT_PROFILES_TABLE } from "../../../db/schema/student-profiles.js";
import type {
  StudentScoresRecord,
  StudentScoreHistoryRecord,
  StudentProfileMinimal,
} from "./readiness.types.js";

export class ReadinessRepository {
  async getStudentScores(studentId: number): Promise<StudentScoresRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<StudentScoresRecord>(
        `SELECT TOP 1 *
           FROM ${STUDENT_SCORES_TABLE}
          WHERE student_id = @student_id`
      );
    return result.recordset[0] ?? null;
  }

  async getLatestScoreHistory(studentId: number): Promise<StudentScoreHistoryRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<StudentScoreHistoryRecord>(
        `SELECT TOP 1 *
           FROM ${STUDENT_SCORE_HISTORY_TABLE}
          WHERE student_id = @student_id
          ORDER BY history_id DESC`
      );
    return result.recordset[0] ?? null;
  }

  async getScoreHistory(
    studentId: number,
    limit: number,
    cursorId: number | null
  ): Promise<{ records: StudentScoreHistoryRecord[]; hasMore: boolean }> {
    const pool = await getPool();
    const request = pool.request();
    request.input("student_id", sql.Int, studentId);
    request.input("limit", sql.Int, limit);

    let whereClause = "student_id = @student_id";
    if (cursorId !== null) {
      request.input("cursor_id", sql.Int, cursorId);
      whereClause += " AND history_id < @cursor_id";
    }

    // Fetch limit + 1 to check for hasMore
    const query = `
      SELECT TOP (@limit + 1) *
        FROM ${STUDENT_SCORE_HISTORY_TABLE}
       WHERE ${whereClause}
       ORDER BY history_id DESC
    `;

    const result = await request.query<StudentScoreHistoryRecord>(query);
    const records = result.recordset;

    let hasMore = false;
    if (records.length > limit) {
      hasMore = true;
      records.pop(); // Remove the extra record
    }

    return { records, hasMore };
  }

  async getStudentProfile(studentId: number): Promise<StudentProfileMinimal | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<StudentProfileMinimal>(
        `SELECT TOP 1 student_id, grade, profile_complete
           FROM ${STUDENT_PROFILES_TABLE}
          WHERE student_id = @student_id`
      );
    return result.recordset[0] ?? null;
  }
}
