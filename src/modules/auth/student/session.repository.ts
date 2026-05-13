import { sql, getPool } from "../../../db/client.js";
import { STUDENT_SESSIONS_TABLE } from "../../../db/schema/student-sessions.js";
import type { CreateSessionData, SessionRecord } from "./student.types.js";

type RawSessionRow = {
  session_id: number;
  student_id: number;
  refresh_token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
};

function mapSession(row: RawSessionRow): SessionRecord {
  return { ...row };
}

export class SessionRepository {
  async createSession(data: CreateSessionData): Promise<SessionRecord> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, data.student_id)
      .input("refresh_token_hash", sql.VarChar(64), data.refresh_token_hash)
      .input("expires_at", sql.DateTimeOffset, data.expires_at)
      .query<RawSessionRow>(
        `INSERT INTO ${STUDENT_SESSIONS_TABLE}
            (student_id, refresh_token_hash, expires_at)
         OUTPUT INSERTED.*
         VALUES
            (@student_id, @refresh_token_hash, @expires_at);`,
      );
    const row = result.recordset[0];
    if (!row) throw new Error("Failed to create session");
    return mapSession(row);
  }

  async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("hash", sql.VarChar(64), tokenHash)
      .query<RawSessionRow>(
        `SELECT TOP 1 *
           FROM ${STUDENT_SESSIONS_TABLE}
          WHERE refresh_token_hash = @hash
            AND revoked_at IS NULL;`,
      );
    const row = result.recordset[0];
    return row ? mapSession(row) : null;
  }

  async rotateToken(
    sessionId: number,
    newTokenHash: string,
    newExpiresAt: Date,
  ): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("session_id", sql.Int, sessionId)
      .input("new_hash", sql.VarChar(64), newTokenHash)
      .input("new_expires_at", sql.DateTimeOffset, newExpiresAt)
      .query(
        `UPDATE ${STUDENT_SESSIONS_TABLE}
            SET refresh_token_hash = @new_hash,
                expires_at         = @new_expires_at,
                revoked_at         = NULL
          WHERE session_id = @session_id;`,
      );
  }

  async revokeSession(sessionId: number): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("session_id", sql.Int, sessionId)
      .query(
        `UPDATE ${STUDENT_SESSIONS_TABLE}
            SET revoked_at = SYSDATETIMEOFFSET()
          WHERE session_id = @session_id;`,
      );
  }

  async revokeAllForStudent(studentId: number): Promise<void> {
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
}
