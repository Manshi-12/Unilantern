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
                       CHECK (account_status IN ('independent','school_linked')),
    is_active         BIT NOT NULL DEFAULT 1,
    phone_number      VARCHAR(25) NOT NULL UNIQUE,
    phone_verified    BIT NOT NULL DEFAULT 0,
    email             VARCHAR(320) NULL,
    full_name         VARCHAR(200) NOT NULL,
    invite_token_used VARCHAR(500) NULL,
    last_login_at     DATETIMEOFFSET NULL,
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
`;
