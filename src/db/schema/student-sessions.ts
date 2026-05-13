export const STUDENT_SESSIONS_TABLE = "student_sessions";

export const studentSessionsColumns = {
  session_id:          "session_id",
  student_id:          "student_id",
  refresh_token_hash:  "refresh_token_hash",
  expires_at:          "expires_at",
  revoked_at:          "revoked_at",
  created_at:          "created_at",
} as const;

export const STUDENT_SESSIONS_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'student_sessions')
BEGIN
  CREATE TABLE student_sessions (
    session_id         INT IDENTITY(1,1) PRIMARY KEY,
    student_id         INT NOT NULL,
    refresh_token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at         DATETIMEOFFSET NOT NULL,
    revoked_at         DATETIMEOFFSET NULL,
    created_at         DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
  );

  CREATE INDEX IX_student_sessions_student ON student_sessions(student_id);
  CREATE INDEX IX_student_sessions_expires ON student_sessions(expires_at);
END;
`;
