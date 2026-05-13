import { sql, getPool } from "../../../db/client.js";
import { STUDENTS_TABLE } from "../../../db/schema/students.js";
import { STUDENT_DELETION_QUEUE_TABLE } from "../../../db/schema/student-deletion-queue.js";
import { STUDENT_DELETION_ARCHIVE_TABLE } from "../../../db/schema/student-deletion-archive.js";
import type {
  StudentDeletionRecord,
  DeletionQueueRecord,
} from "./account-deletion.types.js";

// ── Raw row types from MSSQL ─────────────────────────────────────────────────

type RawStudentDeletionRow = {
  student_id: number;
  school_id: number | null;
  phone_number: string;
  full_name: string;
  account_status: string;
  is_active: boolean;
  deletion_requested_at: Date | null;
  deletion_confirmed_at: Date | null;
  scheduled_hard_delete_at: Date | null;
  scheduled_permanent_delete_at: Date | null;
  deletion_confirmation_token: string | null;
  deletion_confirmation_expires_at: Date | null;
  deletion_reason: string | null;
};

type RawDeletionQueueRow = {
  deletion_queue_id: number;
  student_id: number;
  account_status_snapshot: string;
  deletion_initiated_at: Date;
  deletion_confirmed_at: Date;
  scheduled_permanent_delete_at: Date;
  purge_manifest: string | null;
  purge_started_at: Date | null;
  purge_completed_at: Date | null;
  is_completed: boolean;
  purge_error_log: string | null;
  created_at: Date;
  updated_at: Date;
};

function mapStudentDeletion(row: RawStudentDeletionRow): StudentDeletionRecord {
  return { ...row } as StudentDeletionRecord;
}

function mapDeletionQueue(row: RawDeletionQueueRow): DeletionQueueRecord {
  return { ...row };
}

// ═════════════════════════════════════════════════════════════════════════════
// Repository
// ═════════════════════════════════════════════════════════════════════════════

export class AccountDeletionRepository {

  // ── Student lookups (deletion-specific columns) ──────────────────────────

  async findStudentForDeletion(studentId: number): Promise<StudentDeletionRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<RawStudentDeletionRow>(
        `SELECT TOP 1
            student_id, school_id, phone_number, full_name,
            account_status, is_active,
            deletion_requested_at, deletion_confirmed_at,
            scheduled_hard_delete_at, scheduled_permanent_delete_at,
            deletion_confirmation_token, deletion_confirmation_expires_at,
            deletion_reason
         FROM ${STUDENTS_TABLE}
         WHERE student_id = @student_id`,
      );
    const row = result.recordset[0];
    return row ? mapStudentDeletion(row) : null;
  }

  // ── Step 1: Mark deletion_pending ────────────────────────────────────────

  async initiateDeletion(
    studentId: number,
    tokenHash: string,
    reason: string | null,
  ): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .input("token_hash", sql.VarChar(255), tokenHash)
      .input("reason", sql.NVarChar(sql.MAX), reason)
      .query(
        `UPDATE ${STUDENTS_TABLE}
         SET account_status                  = 'deletion_pending',
             deletion_requested_at           = SYSDATETIMEOFFSET(),
             deletion_confirmation_token     = @token_hash,
             deletion_confirmation_expires_at = DATEADD(MINUTE, 30, SYSDATETIMEOFFSET()),
             deletion_reason                 = @reason,
             updated_at                      = SYSDATETIMEOFFSET()
         WHERE student_id = @student_id;`,
      );
  }

  // ── Step 2: Confirm deletion ─────────────────────────────────────────────

  async confirmDeletion(studentId: number): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query(
        `UPDATE ${STUDENTS_TABLE}
         SET deletion_confirmed_at           = SYSDATETIMEOFFSET(),
             deletion_confirmation_token     = NULL,
             deletion_confirmation_expires_at = NULL,
             scheduled_hard_delete_at        = DATEADD(HOUR, 48, SYSDATETIMEOFFSET()),
             updated_at                      = SYSDATETIMEOFFSET()
         WHERE student_id = @student_id;`,
      );
  }

  // ── Step 3: Reactivate account ───────────────────────────────────────────

  async reactivateAccount(
    studentId: number,
    previousStatus: "independent" | "school_linked",
  ): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .input("previous_status", sql.VarChar(30), previousStatus)
      .query(
        `UPDATE ${STUDENTS_TABLE}
         SET account_status                  = @previous_status,
             deletion_requested_at           = NULL,
             deletion_confirmed_at           = NULL,
             scheduled_hard_delete_at        = NULL,
             scheduled_permanent_delete_at   = NULL,
             deletion_confirmation_token     = NULL,
             deletion_confirmation_expires_at = NULL,
             deletion_reason                 = NULL,
             updated_at                      = SYSDATETIMEOFFSET()
         WHERE student_id = @student_id;`,
      );
  }

  // ── Cron Job 1: Clear expired confirmation tokens ────────────────────────

  async clearExpiredConfirmations(): Promise<number> {
    const pool = await getPool();
    const result = await pool
      .request()
      .query(
        `UPDATE ${STUDENTS_TABLE}
         SET deletion_requested_at           = NULL,
             deletion_confirmation_token     = NULL,
             deletion_confirmation_expires_at = NULL,
             account_status                  = CASE
               WHEN school_id IS NOT NULL THEN 'school_linked'
               ELSE 'independent'
             END,
             updated_at                      = SYSDATETIMEOFFSET()
         WHERE deletion_requested_at IS NOT NULL
           AND deletion_confirmed_at IS NULL
           AND deletion_confirmation_expires_at < SYSDATETIMEOFFSET();`,
      );
    return result.rowsAffected[0] ?? 0;
  }

  // ── Cron Job 2: Find accounts past 48h cooldown ─────────────────────────

  async findAccountsPastCooldown(): Promise<StudentDeletionRecord[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .query<RawStudentDeletionRow>(
        `SELECT
            s.student_id, s.school_id, s.phone_number, s.full_name,
            s.account_status, s.is_active,
            s.deletion_requested_at, s.deletion_confirmed_at,
            s.scheduled_hard_delete_at, s.scheduled_permanent_delete_at,
            s.deletion_confirmation_token, s.deletion_confirmation_expires_at,
            s.deletion_reason
         FROM ${STUDENTS_TABLE} s
         WHERE s.account_status = 'deletion_pending'
           AND s.deletion_confirmed_at IS NOT NULL
           AND s.scheduled_hard_delete_at <= SYSDATETIMEOFFSET()
           AND NOT EXISTS (
             SELECT 1 FROM ${STUDENT_DELETION_QUEUE_TABLE} q
             WHERE q.student_id = s.student_id AND q.is_completed = 0
           );`,
      );
    return result.recordset.map(mapStudentDeletion);
  }

  async enqueueForPurge(
    studentId: number,
    deletionInitiatedAt: Date,
    deletionConfirmedAt: Date,
    purgeManifest: string,
  ): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .input("initiated_at", sql.DateTimeOffset, deletionInitiatedAt)
      .input("confirmed_at", sql.DateTimeOffset, deletionConfirmedAt)
      .input("manifest", sql.NVarChar(sql.MAX), purgeManifest)
      .query(
        `INSERT INTO ${STUDENT_DELETION_QUEUE_TABLE}
            (student_id, account_status_snapshot, deletion_initiated_at,
             deletion_confirmed_at, scheduled_permanent_delete_at, purge_manifest)
         VALUES
            (@student_id, 'purge_scheduled', @initiated_at,
             @confirmed_at, DATEADD(DAY, 30, SYSDATETIMEOFFSET()), @manifest);

         UPDATE ${STUDENTS_TABLE}
         SET account_status                = 'purge_scheduled',
             is_active                     = 0,
             scheduled_permanent_delete_at = DATEADD(DAY, 30, SYSDATETIMEOFFSET()),
             updated_at                    = SYSDATETIMEOFFSET()
         WHERE student_id = @student_id;`,
      );
  }

  // ── Cron Job 3: Find queue entries ready for hard delete ─────────────────

  async findQueueEntriesReadyForPurge(): Promise<DeletionQueueRecord[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .query<RawDeletionQueueRow>(
        `SELECT *
         FROM ${STUDENT_DELETION_QUEUE_TABLE}
         WHERE is_completed = 0
           AND scheduled_permanent_delete_at <= SYSDATETIMEOFFSET();`,
      );
    return result.recordset.map(mapDeletionQueue);
  }

  async markPurgeStarted(queueId: number): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("queue_id", sql.Int, queueId)
      .query(
        `UPDATE ${STUDENT_DELETION_QUEUE_TABLE}
         SET purge_started_at = SYSDATETIMEOFFSET(),
             updated_at       = SYSDATETIMEOFFSET()
         WHERE deletion_queue_id = @queue_id;`,
      );
  }

  async executeHardDelete(
    studentId: number,
    queueId: number,
    phoneNumberHash: string,
    anonymizedName: string,
    schoolId: number | null,
    deletionInitiatedAt: Date,
    deletionConfirmedAt: Date,
    reason: string | null,
  ): Promise<void> {
    const pool = await getPool();
    // Use a transaction for atomicity
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      const request = transaction.request();
      request.input("student_id", sql.Int, studentId);
      request.input("queue_id", sql.Int, queueId);
      request.input("phone_hash", sql.VarChar(255), phoneNumberHash);
      request.input("anon_name", sql.VarChar(50), anonymizedName);
      request.input("school_id", sql.Int, schoolId);
      request.input("initiated_at", sql.DateTimeOffset, deletionInitiatedAt);
      request.input("confirmed_at", sql.DateTimeOffset, deletionConfirmedAt);
      request.input("reason", sql.NVarChar(sql.MAX), reason);

      // Cascade delete student-owned data (order matters for FK constraints)
      const deleteTables = [
        "student_saved_colleges",
        "student_saved_scholarships",
        "student_scores",
        "student_score_history",
        "student_essays",
        "extracurricular_activities",
        "honors_awards",
        "student_academics",
        "student_profiles",
        "student_consents",
        "notification_preferences",
        "otp_verifications",
        "student_sessions",
      ];

      for (const table of deleteTables) {
        // Only delete if table exists (some may not be created yet)
        await request.query(
          `IF OBJECT_ID('${table}', 'U') IS NOT NULL
           BEGIN
             DELETE FROM ${table} WHERE student_id = @student_id;
           END;`,
        );
      }

      // Handle notifications table (uses recipient_user_id)
      await request.query(
        `IF OBJECT_ID('notifications', 'U') IS NOT NULL
         BEGIN
           DELETE FROM notifications
           WHERE recipient_user_id = @student_id AND recipient_role = 'student';
         END;`,
      );

      // Delete the student row itself
      await request.query(
        `DELETE FROM ${STUDENTS_TABLE} WHERE student_id = @student_id;`,
      );

      // Insert archive record
      await request.query(
        `INSERT INTO ${STUDENT_DELETION_ARCHIVE_TABLE}
            (student_id, phone_number_hash, full_name_anonymized, school_id,
             deletion_initiated_at, deletion_confirmed_at, deletion_completed_at,
             retention_period_days, retention_expires_at, reason_provided)
         VALUES
            (@student_id, @phone_hash, @anon_name, @school_id,
             @initiated_at, @confirmed_at, SYSDATETIMEOFFSET(),
             2555, DATEADD(DAY, 2555, SYSDATETIMEOFFSET()), @reason);`,
      );

      // Mark queue entry as completed
      await request.query(
        `UPDATE ${STUDENT_DELETION_QUEUE_TABLE}
         SET is_completed    = 1,
             purge_completed_at = SYSDATETIMEOFFSET(),
             updated_at      = SYSDATETIMEOFFSET()
         WHERE deletion_queue_id = @queue_id;`,
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();

      // Log error on the queue entry
      const errorMsg = err instanceof Error ? err.message : String(err);
      const pool2 = await getPool();
      await pool2
        .request()
        .input("queue_id", sql.Int, queueId)
        .input("error_log", sql.NVarChar(sql.MAX), errorMsg)
        .query(
          `UPDATE ${STUDENT_DELETION_QUEUE_TABLE}
           SET purge_error_log = @error_log,
               updated_at     = SYSDATETIMEOFFSET()
           WHERE deletion_queue_id = @queue_id;`,
        );

      throw err;
    }
  }

  // ── Check if student has existing queue entry ────────────────────────────

  async hasActiveQueueEntry(studentId: number): Promise<boolean> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<{ cnt: number }>(
        `SELECT COUNT(*) as cnt
         FROM ${STUDENT_DELETION_QUEUE_TABLE}
         WHERE student_id = @student_id AND is_completed = 0;`,
      );
    return (result.recordset[0]?.cnt ?? 0) > 0;
  }
}
