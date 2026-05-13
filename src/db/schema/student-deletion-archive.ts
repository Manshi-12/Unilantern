/**
 * `student_deletion_archive` table — MSSQL / Azure SQL.
 *
 * Immutable audit record of permanently deleted student accounts.
 * Retained for 7 years for compliance (COPPA, GDPR).
 * Contains only anonymized data — no PII.
 */

export const STUDENT_DELETION_ARCHIVE_TABLE = "student_deletion_archive";

export const studentDeletionArchiveColumns = {
  archive_id: "archive_id",
  student_id: "student_id",
  phone_number_hash: "phone_number_hash",
  full_name_anonymized: "full_name_anonymized",
  school_id: "school_id",
  deletion_initiated_at: "deletion_initiated_at",
  deletion_confirmed_at: "deletion_confirmed_at",
  deletion_completed_at: "deletion_completed_at",
  retention_period_days: "retention_period_days",
  retention_expires_at: "retention_expires_at",
  reason_provided: "reason_provided",
  created_at: "created_at",
} as const;

export const STUDENT_DELETION_ARCHIVE_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'student_deletion_archive')
BEGIN
  CREATE TABLE student_deletion_archive (
    archive_id            INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    student_id            INT                NOT NULL,
    phone_number_hash     VARCHAR(255)       NOT NULL,
    full_name_anonymized  VARCHAR(50)        NOT NULL,
    school_id             INT                NULL,
    deletion_initiated_at DATETIMEOFFSET     NOT NULL,
    deletion_confirmed_at DATETIMEOFFSET     NOT NULL,
    deletion_completed_at DATETIMEOFFSET     NOT NULL,
    retention_period_days INT                NOT NULL DEFAULT 2555,
    retention_expires_at  DATETIMEOFFSET     NOT NULL,
    reason_provided       NVARCHAR(MAX)      NULL,
    created_at            DATETIMEOFFSET     NOT NULL DEFAULT SYSDATETIMEOFFSET()
  );
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('student_deletion_archive')
    AND name = 'idx_deletion_archive_expires'
)
BEGIN
  CREATE INDEX idx_deletion_archive_expires
    ON student_deletion_archive (retention_expires_at ASC);
END;
`;
