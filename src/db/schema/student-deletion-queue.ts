/**
 * `student_deletion_queue` table — MSSQL / Azure SQL.
 *
 * Tracks student accounts scheduled for hard delete (purge_scheduled state).
 * Decouples account state from deletion execution for auditability.
 */

export const STUDENT_DELETION_QUEUE_TABLE = "student_deletion_queue";

export const studentDeletionQueueColumns = {
  deletion_queue_id: "deletion_queue_id",
  student_id: "student_id",
  account_status_snapshot: "account_status_snapshot",
  deletion_initiated_at: "deletion_initiated_at",
  deletion_confirmed_at: "deletion_confirmed_at",
  scheduled_permanent_delete_at: "scheduled_permanent_delete_at",
  purge_manifest: "purge_manifest",
  purge_started_at: "purge_started_at",
  purge_completed_at: "purge_completed_at",
  is_completed: "is_completed",
  purge_error_log: "purge_error_log",
  created_at: "created_at",
  updated_at: "updated_at",
} as const;

export const STUDENT_DELETION_QUEUE_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'student_deletion_queue')
BEGIN
  CREATE TABLE student_deletion_queue (
    deletion_queue_id             INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    student_id                    INT                NOT NULL,
    account_status_snapshot       VARCHAR(50)        NOT NULL,
    deletion_initiated_at         DATETIMEOFFSET     NOT NULL,
    deletion_confirmed_at         DATETIMEOFFSET     NOT NULL,
    scheduled_permanent_delete_at DATETIMEOFFSET     NOT NULL,
    purge_manifest                NVARCHAR(MAX)      NULL,
    purge_started_at              DATETIMEOFFSET     NULL,
    purge_completed_at            DATETIMEOFFSET     NULL,
    is_completed                  BIT                NOT NULL DEFAULT 0,
    purge_error_log               NVARCHAR(MAX)      NULL,
    created_at                    DATETIMEOFFSET     NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at                    DATETIMEOFFSET     NOT NULL DEFAULT SYSDATETIMEOFFSET()
  );
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('student_deletion_queue')
    AND name = 'idx_deletion_queue_pending'
)
BEGIN
  CREATE INDEX idx_deletion_queue_pending
    ON student_deletion_queue (scheduled_permanent_delete_at ASC)
    WHERE is_completed = 0;
END;
`;
