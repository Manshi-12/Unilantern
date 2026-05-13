/**
 * `students` table — MSSQL / Azure SQL.
 *
 * NOTE: drizzle-orm's MSSQL adapter is still experimental, so this file declares
 * the table name + column metadata as plain constants. Repositories below use
 * the `mssql` driver directly with parameterised queries. When drizzle's MSSQL
 * adapter stabilises, swap these to drizzle's `mssqlTable(...)` builders without
 * changing repository call-sites.
 */

export const STUDENTS_TABLE = "students";

export const studentsColumns = {
  student_id: "student_id",
  school_id: "school_id",
  role: "role",
  account_status: "account_status",
  is_active: "is_active",
  phone_number: "phone_number",
  phone_verified: "phone_verified",
  email: "email",
  full_name: "full_name",
  invite_token_used: "invite_token_used",
  last_login_at: "last_login_at",
  deletion_requested_at: "deletion_requested_at",
  deletion_confirmed_at: "deletion_confirmed_at",
  scheduled_hard_delete_at: "scheduled_hard_delete_at",
  scheduled_permanent_delete_at: "scheduled_permanent_delete_at",
  deletion_confirmation_token: "deletion_confirmation_token",
  deletion_confirmation_expires_at: "deletion_confirmation_expires_at",
  deletion_reason: "deletion_reason",
  college_data_sharing_enabled: "college_data_sharing_enabled",
  created_at: "created_at",
  updated_at: "updated_at",
} as const;

export const STUDENTS_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'students')
BEGIN
  CREATE TABLE students (
    student_id        INT IDENTITY(1,1) PRIMARY KEY,
    school_id         INT NULL,
    role              VARCHAR(20) NOT NULL DEFAULT 'student'
                       CHECK (role IN ('student')),
    account_status    VARCHAR(30) NOT NULL DEFAULT 'independent'
                       CHECK (account_status IN (
                         'independent','school_linked',
                         'deletion_pending','purge_scheduled','permanently_deleted'
                       )),
    is_active         BIT NOT NULL DEFAULT 1,
    phone_number      VARCHAR(25) NOT NULL UNIQUE,
    phone_verified    BIT NOT NULL DEFAULT 0,
    email             VARCHAR(320) NULL,
    full_name         VARCHAR(200) NOT NULL,
    invite_token_used VARCHAR(500) NULL,
    last_login_at     DATETIMEOFFSET NULL,
    deletion_requested_at            DATETIMEOFFSET NULL,
    deletion_confirmed_at            DATETIMEOFFSET NULL,
    scheduled_hard_delete_at         DATETIMEOFFSET NULL,
    scheduled_permanent_delete_at    DATETIMEOFFSET NULL,
    deletion_confirmation_token      VARCHAR(255) NULL,
    deletion_confirmation_expires_at DATETIMEOFFSET NULL,
    deletion_reason                  NVARCHAR(MAX) NULL,
    college_data_sharing_enabled     BIT NOT NULL DEFAULT 1,
    created_at        DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at        DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
  );

END;

IF COL_LENGTH('dbo.students', 'email') IS NULL
BEGIN
  ALTER TABLE dbo.students ADD email VARCHAR(320) NULL;
END;
ELSE IF EXISTS (
  SELECT 1
  FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.students')
    AND name = 'email'
    AND max_length < 320
)
BEGIN
  ALTER TABLE dbo.students ALTER COLUMN email VARCHAR(320) NULL;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.students')
    AND name = 'uidx_students_email'
)
BEGIN
  CREATE UNIQUE INDEX uidx_students_email
    ON dbo.students(email)
    WHERE email IS NOT NULL;
END;

-- ── Deletion lifecycle columns (idempotent migration) ────────────────────────
IF COL_LENGTH('dbo.students', 'deletion_requested_at') IS NULL
BEGIN
  ALTER TABLE dbo.students ADD deletion_requested_at DATETIMEOFFSET NULL;
END;
IF COL_LENGTH('dbo.students', 'deletion_confirmed_at') IS NULL
BEGIN
  ALTER TABLE dbo.students ADD deletion_confirmed_at DATETIMEOFFSET NULL;
END;
IF COL_LENGTH('dbo.students', 'scheduled_hard_delete_at') IS NULL
BEGIN
  ALTER TABLE dbo.students ADD scheduled_hard_delete_at DATETIMEOFFSET NULL;
END;
IF COL_LENGTH('dbo.students', 'scheduled_permanent_delete_at') IS NULL
BEGIN
  ALTER TABLE dbo.students ADD scheduled_permanent_delete_at DATETIMEOFFSET NULL;
END;
IF COL_LENGTH('dbo.students', 'deletion_confirmation_token') IS NULL
BEGIN
  ALTER TABLE dbo.students ADD deletion_confirmation_token VARCHAR(255) NULL;
END;
IF COL_LENGTH('dbo.students', 'deletion_confirmation_expires_at') IS NULL
BEGIN
  ALTER TABLE dbo.students ADD deletion_confirmation_expires_at DATETIMEOFFSET NULL;
END;
IF COL_LENGTH('dbo.students', 'deletion_reason') IS NULL
BEGIN
  ALTER TABLE dbo.students ADD deletion_reason NVARCHAR(MAX) NULL;
END;

-- ── College data sharing opt-out (default: opted in) ─────────────────────────
IF COL_LENGTH('dbo.students', 'college_data_sharing_enabled') IS NULL
BEGIN
  ALTER TABLE dbo.students
    ADD college_data_sharing_enabled BIT NOT NULL
      CONSTRAINT DF_students_college_data_sharing_enabled DEFAULT 1;
END;

-- ── Index for cron job: find accounts past cooldown ──────────────────────────
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.students')
    AND name = 'idx_students_deletion_pending'
)
BEGIN
  CREATE INDEX idx_students_deletion_pending
    ON dbo.students(account_status, deletion_confirmed_at)
    WHERE account_status = 'deletion_pending'
    AND deletion_confirmed_at IS NOT NULL;
END;
`;
