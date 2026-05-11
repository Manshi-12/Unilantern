import { sql, getPool } from "../../../db/client.js";
import { STUDENT_CONSENTS_TABLE } from "../../../db/schema/student-consents.js";
import type { ConsentRecord, ConsentStatus } from "./consents.types.js";

export class ConsentsRepository {
  async findAllByUserId(studentId: number): Promise<ConsentRecord[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<ConsentRecord>(
        `SELECT * FROM ${STUDENT_CONSENTS_TABLE} WHERE student_id = @student_id`,
      );
    return result.recordset;
  }

  async findByUserIdAndType(studentId: number, consentType: string): Promise<ConsentRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .input("consent_type", sql.VarChar(60), consentType)
      .query<ConsentRecord>(
        `SELECT TOP 1 * FROM ${STUDENT_CONSENTS_TABLE} WHERE student_id = @student_id AND consent_type = @consent_type`,
      );
    return result.recordset[0] || null;
  }

  async upsertConsent(studentId: number, consentType: string, status: ConsentStatus): Promise<ConsentRecord> {
    const pool = await getPool();
    const now = new Date();
    
    const existing = await this.findByUserIdAndType(studentId, consentType);
    
    if (existing) {
      const query = `
        UPDATE ${STUDENT_CONSENTS_TABLE}
        SET status = @status,
            ${status === "granted" ? "granted_at = @now, revoked_at = NULL" : "revoked_at = @now"}
        OUTPUT inserted.*
        WHERE student_id = @student_id AND consent_type = @consent_type
      `;
      const result = await pool.request()
        .input("student_id", sql.Int, studentId)
        .input("consent_type", sql.VarChar(60), consentType)
        .input("status", sql.VarChar(20), status)
        .input("now", sql.DateTimeOffset, now)
        .query<ConsentRecord>(query);
      return result.recordset[0];
    } else {
      const query = `
        INSERT INTO ${STUDENT_CONSENTS_TABLE} (student_id, consent_type, status, granted_at, revoked_at, source, version)
        OUTPUT inserted.*
        VALUES (@student_id, @consent_type, @status, @now, @revoked_at, 'settings', 1)
      `;
      const result = await pool.request()
        .input("student_id", sql.Int, studentId)
        .input("consent_type", sql.VarChar(60), consentType)
        .input("status", sql.VarChar(20), status)
        .input("now", sql.DateTimeOffset, now)
        .input("revoked_at", sql.DateTimeOffset, status === "revoked" ? now : null)
        .query<ConsentRecord>(query);
      return result.recordset[0];
    }
  }
}
